import { useRef, useState } from "react";
import { Outlet, Link } from "react-router-dom";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { ClipboardCheck, LogOut, BellOff, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoginUser } from "@/hooks/useLoginUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/NotificationBell";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import InstallPWABanner from "@/components/InstallPWABanner";

export default function Layout() {
  const mainRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const loginUser = useLoginUser();
  const isAdmin = loginUser?.role === "admin" || loginUser?.role === "aprovador";
  useDeviceDetection();
  const { requestPushPermission, permission } = usePushNotifications();
  const [requestingPush, setRequestingPush] = useState(false);

  const handleRequestPush = async () => {
    setRequestingPush(true);
    await requestPushPermission();
    setRequestingPush(false);
  };

  const { data: events } = useQuery({
    queryKey: ["events-approvals"],
    queryFn: () => base44.entities.Event.list("-date", 100),
    enabled: isAdmin,
    refetchInterval: 30000,
  });
  const pendingCount = isAdmin
    ? (events || []).filter(ev =>
        (ev.scale_submitted && !ev.scale_approved) ||
        (ev.salao_submitted && !ev.salao_approved)
      ).length
    : 0; // Ativa detecção de dispositivo para todos os usuários

  const smoothScroll = (delta) => {
    if (!mainRef.current) return;
    const start = mainRef.current.scrollTop;
    const distance = delta;
    const duration = 1500; // Duração em ms
    const startTime = Date.now();

    const scroll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeInOutQuad = progress < 0.5 
        ? 2 * progress * progress 
        : -1 + (4 - 2 * progress) * progress;
      mainRef.current.scrollTop = start + distance * easeInOutQuad;
      if (progress < 1) requestAnimationFrame(scroll);
    };
    requestAnimationFrame(scroll);
  };

  const handleTouchStart = (e) => {
    if (e.target.tagName === 'CANVAS') return;
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchMove = (e) => {
    if (e.target.tagName === 'CANVAS') return;
    if (touchStart === null || !mainRef.current) return;
    const currentY = e.touches[0].clientY;
    const diff = touchStart - currentY;
    mainRef.current.scrollTop += diff;
    setTouchStart(currentY);
  };

  const handleTouchEnd = () => {
    setTouchStart(null);
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: '100dvh',
        minHeight: '-webkit-fill-available',
        overflowX: 'hidden',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-950/70 backdrop-blur-2xl border-b border-border/50 shadow-sm shadow-black/5">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <img
                src="https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png"
                alt="Ninho da Roxinha"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <span className="font-bold text-base tracking-tight text-foreground">Ninho da Roxinha</span>
              <p className="text-[10px] text-muted-foreground leading-none -mt-0.5">Sistema de Confirmação de Evento</p>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            {permission !== 'granted' && permission !== 'denied' && permission !== 'unsupported' && (
              <button
                onClick={handleRequestPush}
                disabled={requestingPush}
                title="Ativar notificações"
                className="flex items-center gap-1.5 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors px-2 py-1.5 rounded-lg hover:bg-amber-50"
              >
                <Bell className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{requestingPush ? 'Ativando...' : 'Ativar notificações'}</span>
              </button>
            )}
            <NotificationBell />
            <button
              onClick={() => { localStorage.removeItem("ninho_auth"); window.location.href = window.location.origin; }}
              className="flex items-center gap-2 text-sm font-semibold text-destructive bg-destructive/10 hover:bg-destructive hover:text-white transition-colors px-4 py-3 rounded-xl min-w-[44px] min-h-[44px] active:scale-95 touch-manipulation"
              title="Sair"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
            {isAdmin && (
              <Link to="/approvals" className="relative flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-accent">
                <ClipboardCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Aprovações</span>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <InstallPWABanner />
      <main
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full px-2 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>


    </div>
  );
}
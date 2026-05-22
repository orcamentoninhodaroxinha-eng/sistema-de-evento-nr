import { useRef, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { ClipboardCheck, LogOut, BarChart3, Package, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLoginUser } from "@/hooks/useLoginUser";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import NotificationBell from "@/components/NotificationBell";
import PushPermissionBanner from "@/components/PushPermissionBanner";
import { usePushNotifications } from "@/hooks/usePushNotifications";

function NavLink({ to, active, icon, label }) {
  return (
    <Link
      to={to}
      className={`relative flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-xl min-h-[36px] transition-all active:scale-95 touch-manipulation ${
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      }`}
    >
      {icon}
      <span className="hidden xs:inline">{label}</span>
    </Link>
  );
}

export default function Layout() {
  const mainRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const location = useLocation();
  const loginUser = useLoginUser();
  const isAdmin = loginUser?.role === "admin" || loginUser?.role === "aprovador";
  useDeviceDetection();
  const { permission, subscribed, loading: pushLoading, requestPermission } = usePushNotifications(loginUser);
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    try { return localStorage.getItem("push_banner_dismissed") === "1"; } catch { return false; }
  });
  const showPushBanner = loginUser && !subscribed && permission !== "granted" && permission !== "denied" && !bannerDismissed;
  const { data: events } = useQuery({
    queryKey: ["events-approvals"],
    queryFn: () => base44.entities.Event.list("-date", 100),
    enabled: isAdmin,
    refetchInterval: 30000
  });
  const pendingCount = isAdmin ?
  (events || []).filter((ev) =>
  ev.scale_submitted && !ev.scale_approved ||
  ev.salao_submitted && !ev.salao_approved
  ).length :
  0; // Ativa detecção de dispositivo para todos os usuários

  const smoothScroll = (delta) => {
    if (!mainRef.current) return;
    const start = mainRef.current.scrollTop;
    const distance = delta;
    const duration = 1500; // Duração em ms
    const startTime = Date.now();

    const scroll = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeInOutQuad = progress < 0.5 ?
      2 * progress * progress :
      -1 + (4 - 2 * progress) * progress;
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
        paddingRight: 'env(safe-area-inset-right, 0px)'
      }}>
      
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-b border-border/50 shadow-sm shadow-black/5">
        <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-8 h-8 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
              <img src="https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png" alt="Ninho da Roxinha" className="w-full h-full object-cover" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm tracking-tight text-foreground">Ninho da Roxinha</span>
              <p className="text-[10px] text-muted-foreground leading-none">Sistema de Eventos</p>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="flex items-center gap-1">
            <NotificationBell />

            {/* Estoque — visível para todos */}
            <NavLink to="/stock" active={location.pathname === "/stock"} icon={<Package className="w-4 h-4" />} label="Estoque" />

            {/* Funcionários — apenas para salao e cozinha (recolhido por padrão na página) */}
            {(loginUser?.role === "salao" || loginUser?.role === "cozinha") && (
              <NavLink to="/employees" active={location.pathname === "/employees"} icon={<Users className="w-4 h-4" />} label="Equipe" />
            )}

            {/* Dashboard — admin e aprovador */}
            {(loginUser?.role === "aprovador" || loginUser?.role === "admin") && (
              <NavLink to="/finance" active={location.pathname === "/finance"} icon={<BarChart3 className="w-4 h-4" />} label="Dashboard" />
            )}

            {/* Aprovações — admin e aprovador */}
            {isAdmin && (
              <div className="relative">
                <NavLink to="/approvals" active={location.pathname === "/approvals"} icon={<ClipboardCheck className="w-4 h-4" />} label="Aprovações" />
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center pointer-events-none">
                    {pendingCount}
                  </span>
                )}
              </div>
            )}

            {/* Sair */}
            <button
              onClick={() => { try { localStorage.removeItem("ninho_auth"); } catch {} try { sessionStorage.removeItem("ninho_auth"); } catch {} window.location.href = window.location.origin; }}
              className="flex items-center gap-1.5 text-xs font-semibold text-destructive bg-destructive/8 hover:bg-destructive hover:text-white transition-all px-3 py-2 rounded-xl min-h-[36px] active:scale-95 touch-manipulation ml-1 border border-destructive/20 hover:border-destructive"
              title="Sair">
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Sair</span>
            </button>
          </nav>
        </div>
      </header>

      <main
        ref={mainRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 w-full px-2 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}>
        
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>


    {showPushBanner && (
      <PushPermissionBanner
        loading={pushLoading}
        onRequest={requestPermission}
        onDismiss={() => {
          setBannerDismissed(true);
          try { localStorage.setItem("push_banner_dismissed", "1"); } catch {}
        }}
      />
    )}
    </div>);

}
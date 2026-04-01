import { useRef } from "react";
import { Outlet, Link } from "react-router-dom";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
import { ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Layout() {
  const mainRef = useRef(null);
  useDeviceDetection(); // Ativa detecção de dispositivo para todos os usuários

  const smoothScroll = (target) => {
    if (!mainRef.current) return;
    const start = mainRef.current.scrollTop;
    const distance = target - start;
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
        </div>
      </header>

      <main
        ref={mainRef}
        className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin', scrollbarColor: 'hsl(var(--border)) transparent' }}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Scroll Navigation Buttons */}
      <div className="fixed left-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-20 pointer-events-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => smoothScroll(0)}
          className="rounded-lg h-12 w-12 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm shadow-lg hover:shadow-xl hover:bg-white/60 dark:hover:bg-slate-950/60 transition-all border border-border/20"
          aria-label="Ir para o início"
        >
          <ChevronUp className="w-6 h-6 text-primary" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => smoothScroll(mainRef.current.scrollHeight)}
          className="rounded-lg h-12 w-12 bg-white/40 dark:bg-slate-950/40 backdrop-blur-sm shadow-lg hover:shadow-xl hover:bg-white/60 dark:hover:bg-slate-950/60 transition-all border border-border/20"
          aria-label="Ir para o final"
        >
          <ChevronDown className="w-6 h-6 text-primary" />
        </Button>
      </div>
    </div>
  );
}
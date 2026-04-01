import { useRef } from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

export default function Layout() {
  const mainRef = useRef(null);
  const scrollUp = () => mainRef.current?.scrollBy({ top: -300, behavior: 'smooth' });
  const scrollDown = () => mainRef.current?.scrollBy({ top: 300, behavior: 'smooth' });

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
        className="flex-1 w-full px-3 sm:px-6 lg:px-8 py-3 sm:py-6 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {/* Scroll buttons */}
      <div className="fixed left-3 bottom-1/3 z-50 flex flex-col gap-4">
        <button
          onClick={scrollUp}
          className="w-16 h-16 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-border/40 text-muted-foreground shadow-lg flex items-center justify-center hover:bg-white hover:text-primary transition-all active:scale-95"
        >
          <ArrowUp className="w-9 h-9" />
        </button>
        <button
          onClick={scrollDown}
          className="w-16 h-16 rounded-full bg-white/90 dark:bg-slate-800/90 backdrop-blur border border-border/40 text-muted-foreground shadow-lg flex items-center justify-center hover:bg-white hover:text-primary transition-all active:scale-95"
        >
          <ArrowUp className="w-9 h-9 rotate-180" />
        </button>
      </div>
    </div>
  );
}
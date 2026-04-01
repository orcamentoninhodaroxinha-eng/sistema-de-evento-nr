import { useState, useRef } from "react";
import { Outlet, Link } from "react-router-dom";
import { ArrowUp } from "lucide-react";

export default function Layout() {
  const [showTop, setShowTop] = useState(false);
  const mainRef = useRef(null);

  const handleScroll = (e) => {
    setShowTop(e.target.scrollTop > 200);
  };

  const scrollToTop = () => {
    mainRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className="flex flex-col bg-background"
      style={{
        height: '100dvh',
        minHeight: '100dvh',
        overflowX: 'hidden',
        paddingTop: 'env(safe-area-inset-top)',
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
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
        onScroll={handleScroll}
        className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-4 sm:py-6 overflow-y-auto overflow-x-hidden"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>

      {showTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-11 h-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-all"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
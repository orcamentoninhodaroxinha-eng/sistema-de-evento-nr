import { Outlet, Link, useLocation } from "react-router-dom";
import { CalendarDays, Trash2 } from "lucide-react";

export default function Layout() {
  const location = useLocation();

  const isEventRoute = location.pathname.startsWith("/events/");

  return (
    <div className="min-h-screen bg-background flex flex-col" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      {/* Header — only show on main screens */}
      {!isEventRoute && (
        <header className="sticky top-0 z-50 bg-white/70 backdrop-blur-2xl border-b border-border/50 shadow-sm shadow-black/5">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md group-hover:scale-105 transition-transform">
                <img
                  src="https://media.base44.com/images/public/69cbd80727489d185bf14962/525f1e0b3_generated_image.png"
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
      )}

      {/* Main content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6 pb-safe">
        <Outlet />
      </main>

      {/* Bottom Nav — only show on main screens */}
      {!isEventRoute && (
        <nav
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-border/50"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="flex items-center justify-around h-16 max-w-5xl mx-auto">
            <Link
              to="/"
              className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors ${
                location.pathname === "/"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CalendarDays className="w-5 h-5" />
              <span className="text-[11px] font-medium">Eventos</span>
            </Link>
            <Link
              to="/account/delete"
              className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-colors text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-[11px] font-medium">Excluir Conta</span>
            </Link>
          </div>
        </nav>
      )}
    </div>
  );
}
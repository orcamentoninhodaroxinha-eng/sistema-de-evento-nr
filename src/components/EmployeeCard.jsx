import { Calendar } from "lucide-react";
import { format } from "date-fns";

export default function EmployeeCard({ employee, onClick }) {
  const roleColors = {
    "Salão": "bg-blue-50 text-blue-700",
    "Cozinha": "bg-orange-50 text-orange-700",
    "Segurança": "bg-red-50 text-red-700",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-border/60 p-4 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300 group"
    >
      <div className="flex items-center gap-4">
        <div className="shrink-0 relative">
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.full_name}
              className="w-12 h-12 rounded-xl object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
              <span className="text-primary font-bold text-base">
                {employee.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
            employee.status === 'Ativo' ? 'bg-emerald-400' :
            employee.status === 'Afastado' ? 'bg-amber-400' : 'bg-slate-300'
          }`} />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground text-sm truncate group-hover:text-primary transition-colors">
            {employee.full_name}
          </h3>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-md ${
              roleColors[employee.role] || 'bg-slate-50 text-slate-600'
            }`}>
              {employee.role}
            </span>
            {employee.hire_date && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(employee.hire_date), "dd/MM/yyyy")}
              </span>
            )}
          </div>
        </div>

        <div className="shrink-0">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <svg className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </button>
  );
}
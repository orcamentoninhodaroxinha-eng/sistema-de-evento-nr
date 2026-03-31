import { User, Phone, Mail, Building2, Calendar, BadgeCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function EmployeeCard({ employee, onClick }) {
  const statusColors = {
    Ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inativo: "bg-slate-50 text-slate-600 border-slate-200",
    Afastado: "bg-amber-50 text-amber-700 border-amber-200",
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card rounded-2xl border border-border p-4 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        {/* Avatar / Photo */}
        <div className="shrink-0">
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.full_name}
              className="w-14 h-14 rounded-xl object-cover ring-2 ring-border group-hover:ring-primary/30 transition-all"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-accent flex items-center justify-center ring-2 ring-border group-hover:ring-primary/30 transition-all">
              <User className="w-6 h-6 text-muted-foreground" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-foreground truncate">
              {employee.full_name}
            </h3>
            <span
              className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full border ${
                statusColors[employee.status] || statusColors.Ativo
              }`}
            >
              {employee.status || "Ativo"}
            </span>
          </div>

          <div className="mt-1.5 flex items-center gap-2 text-sm text-muted-foreground">
            <BadgeCheck className="w-3.5 h-3.5" />
            <span className="truncate">{employee.role}</span>
          </div>

          <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="w-3.5 h-3.5" />
            <span>{employee.department}</span>
          </div>

          {employee.hire_date && (
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground/70">
              <Calendar className="w-3 h-3" />
              <span>
                Admissão:{" "}
                {format(new Date(employee.hire_date), "dd MMM yyyy", {
                  locale: ptBR,
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
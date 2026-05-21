import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Copy, Users } from "lucide-react";
import { useState } from "react";

export default function EmployeePixList() {
  const [copiedId, setCopiedId] = useState(null);

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees-pix"],
    queryFn: () => base44.entities.Employee.filter({ status: "Ativo" }, "full_name", 200),
  });

  const withPix = employees.filter(e => e.pix);
  const withoutPix = employees.filter(e => !e.pix);

  function copyPix(emp) {
    navigator.clipboard.writeText(emp.pix);
    setCopiedId(emp.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (isLoading) return null;

  return (
    <div className="rounded-2xl border-2 border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary" />
        <span className="text-sm font-bold text-slate-700">PIX dos Funcionários</span>
        <span className="ml-auto text-xs text-muted-foreground">{withPix.length} com PIX cadastrado</span>
      </div>

      <div className="divide-y divide-border bg-white">
        {withPix.map(emp => (
          <div key={emp.id} className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{emp.full_name}</p>
              <p className="text-xs text-muted-foreground truncate">{emp.role} — {emp.department}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-1 rounded-lg max-w-[140px] truncate">
                {emp.pix}
              </span>
              <button
                onClick={() => copyPix(emp)}
                className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Copiar PIX"
              >
                {copiedId === emp.id ? (
                  <span className="text-[10px] font-bold text-emerald-600">✓</span>
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
            </div>
          </div>
        ))}

        {withoutPix.length > 0 && (
          <div className="px-4 py-2.5 bg-amber-50">
            <p className="text-xs text-amber-700 font-medium">
              Sem PIX cadastrado: {withoutPix.map(e => e.full_name).join(", ")}
            </p>
          </div>
        )}

        {withPix.length === 0 && (
          <div className="px-4 py-6 text-center text-xs text-muted-foreground">
            Nenhum funcionário com PIX cadastrado.
          </div>
        )}
      </div>
    </div>
  );
}
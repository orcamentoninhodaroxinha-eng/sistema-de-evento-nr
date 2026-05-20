import { useState, useEffect } from "react";
import { CheckCircle2, FileSpreadsheet, Loader2, ChevronDown, ChevronUp } from "lucide-react";

const COLORS = {
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    header: "hover:bg-emerald-100/60",
    title: "text-emerald-800",
    sub: "text-emerald-600",
    icon: "text-emerald-600",
    chevron: "text-emerald-600",
    card: "bg-white border-emerald-100",
    avatar: "from-emerald-100 to-emerald-200 text-emerald-700",
    total: "bg-emerald-100 border-emerald-200 text-emerald-800",
    totalVal: "text-emerald-700",
    download: "border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  },
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-300",
    header: "hover:bg-blue-100/60",
    title: "text-blue-800",
    sub: "text-blue-600",
    icon: "text-blue-600",
    chevron: "text-blue-600",
    card: "bg-white border-blue-100",
    avatar: "from-blue-100 to-blue-200 text-blue-700",
    total: "bg-blue-100 border-blue-200 text-blue-800",
    totalVal: "text-blue-700",
    download: "border-blue-300 text-blue-700 hover:bg-blue-50",
  },
};

export default function ScalePreviewCard({ csvUrl, title = "Escala Aprovada! ✅", color = "emerald" }) {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const c = COLORS[color] || COLORS.emerald;

  useEffect(() => {
    if (!csvUrl) return;
    setLoading(true);
    fetch(csvUrl)
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split("\n").slice(1); // pula header
        const parsed = [];
        let totalVal = null;
        lines.forEach(line => {
          if (!line.trim()) return;
          const parts = line.split(";");
          const nome = parts[0]?.trim();
          if (nome?.toUpperCase().startsWith("TOTAL")) {
            totalVal = parts[2]?.trim().replace(",", ".") || null;
            return;
          }
          if (nome) {
            parsed.push({
              full_name: nome,
              funcao: parts[1]?.trim() || "",
              valor: parts[2]?.trim() || "",
            });
          }
        });
        setRows(parsed);
        setTotal(totalVal);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [csvUrl]);

  return (
    <div className={`mt-6 ${c.bg} border ${c.border} rounded-2xl overflow-hidden`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(o => !o)}
        className={`w-full flex items-center gap-3 px-5 py-4 ${c.header} transition-colors`}
      >
        <CheckCircle2 className={`w-5 h-5 ${c.icon} shrink-0`} />
        <div className="flex-1 text-left">
          <p className={`font-semibold ${c.title}`}>{title}</p>
          <p className={`text-xs ${c.sub} mt-0.5`}>
            {rows.length > 0 ? `${rows.length} funcionário${rows.length > 1 ? "s" : ""}` : "Toque para ver"}
          </p>
        </div>
        {expanded
          ? <ChevronUp className={`w-4 h-4 ${c.chevron}`} />
          : <ChevronDown className={`w-4 h-4 ${c.chevron}`} />}
      </button>

      {/* Tabela */}
      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <div className={`flex items-center justify-center py-6 gap-2 ${c.sub}`}>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Carregando escala...</span>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-center text-muted-foreground py-4">Sem dados na escala</p>
          ) : (
            <>
              <div className="space-y-1.5">
                {rows.map((emp, i) => (
                  <div key={i} className={`flex items-center gap-3 border ${c.card} rounded-xl px-3 py-2.5`}>
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${c.avatar} flex items-center justify-center text-xs font-bold shrink-0`}>
                      {emp.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{emp.funcao}</p>
                    </div>
                    {emp.valor && (
                      <span className="text-xs font-semibold text-emerald-700 shrink-0">R$ {emp.valor}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Total */}
              {total && (
                <div className={`flex items-center justify-between border ${c.total} rounded-xl px-4 py-2.5 mt-2`}>
                  <span className={`text-sm font-bold`}>Total Geral</span>
                  <span className={`text-sm font-bold ${c.totalVal}`}>
                    R$ {parseFloat(total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}

              {/* Botão download */}
              {csvUrl && (
                <a
                  href={csvUrl}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-center gap-2 w-full h-10 border bg-white ${c.download} rounded-xl text-sm font-medium transition-colors mt-1`}
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Baixar Excel
                </a>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
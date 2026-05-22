import { useState, useEffect } from "react";
import { Users, Loader2 } from "lucide-react";

export default function ScaleTeamList({ csvUrl, title, color = "emerald" }) {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(false);

  const colorMap = {
    emerald: { bg: "bg-emerald-50", border: "border-emerald-200", title: "text-emerald-800", badge: "bg-emerald-100 text-emerald-700", row: "border-emerald-100" },
    blue: { bg: "bg-blue-50", border: "border-blue-200", title: "text-blue-800", badge: "bg-blue-100 text-blue-700", row: "border-blue-100" },
    orange: { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-800", badge: "bg-orange-100 text-orange-700", row: "border-orange-100" },
  };
  const c = colorMap[color] || colorMap.emerald;

  useEffect(() => {
    if (!csvUrl) return;
    setLoading(true);
    fetch(csvUrl)
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split("\n").slice(1);
        const parsed = lines
          .filter(l => l.trim() && !l.toUpperCase().startsWith("TOTAL"))
          .map(line => {
            const parts = line.split(";");
            return { full_name: parts[0]?.trim(), funcao: parts[1]?.trim(), valor: parts[2]?.trim(), pix: parts[3]?.trim() };
          })
          .filter(e => e.full_name);
        setTeam(parsed);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [csvUrl]);

  if (!csvUrl || (!loading && team.length === 0)) return null;

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${c.bg} ${c.border}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-semibold flex items-center gap-2 ${c.title}`}>
          <Users className="w-4 h-4" />
          {title} {!loading && `(${team.length})`}
        </h2>
        {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
      </div>
      {!loading && (
        <div className="space-y-1.5">
          {team.map((emp, i) => (
            <div key={i} className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-2 ${c.row}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${c.badge}`}>
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
      )}
    </div>
  );
}
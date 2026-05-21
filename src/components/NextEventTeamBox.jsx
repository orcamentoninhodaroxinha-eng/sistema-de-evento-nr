import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Users, Loader2, Star, ChevronDown, ChevronUp, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

async function parseCsv(url) {
  if (!url) return [];
  const text = await fetch(url).then(r => r.text());
  const lines = text.trim().split("\n").slice(1);
  return lines
    .filter(l => l.trim() && !l.toUpperCase().startsWith("TOTAL"))
    .map(line => {
      const parts = line.split(";");
      return {
        full_name: parts[0]?.trim(),
        funcao: parts[1]?.trim(),
        valor: parts[2]?.trim(),
      };
    })
    .filter(e => e.full_name);
}

export default function NextEventTeamBox({ area }) {
  // area: "salao" | "cozinha"
  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-team-box"],
    queryFn: () => base44.entities.Event.list("-date", 50),
    staleTime: 60 * 1000,
  });

  // Pega o próximo evento com escala aprovada para a área correspondente
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextEvent = (events || [])
    .filter(ev => {
      if (!ev.date || ev.status === "Cancelado") return false;
      const evDate = new Date(ev.date + "T12:00:00");
      if (evDate < today) return false;
      if (area === "salao") return ev.salao_approved && ev.salao_csv_url;
      if (area === "cozinha") return ev.scale_approved && ev.scale_csv_url;
      return false;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  useEffect(() => {
    if (!nextEvent) return;
    const csvUrl = area === "salao" ? nextEvent.salao_csv_url : nextEvent.scale_csv_url;
    setLoadingTeam(true);
    parseCsv(csvUrl).then(data => {
      setTeam(data);
      setLoadingTeam(false);
    }).catch(() => setLoadingTeam(false));
  }, [nextEvent?.id]);

  if (isLoading) return null;
  if (!nextEvent) return null;

  const isSalao = area === "salao";
  const color = isSalao
    ? { bg: "bg-blue-50", border: "border-blue-200", title: "text-blue-800", sub: "text-blue-600", badge: "bg-blue-100 text-blue-700", row: "border-blue-100", dot: "bg-blue-400" }
    : { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-800", sub: "text-orange-600", badge: "bg-orange-100 text-orange-700", row: "border-orange-100", dot: "bg-orange-400" };

  const emoji = isSalao ? "🍽️" : "🍳";
  const areaLabel = isSalao ? "Equipe do Salão" : "Equipe da Cozinha";

  // Separa novos dos demais (is_new não existe no CSV, então destacamos por função)
  const newMembers = team.filter(e => {
    const f = (e.funcao || "").toLowerCase();
    return f.includes("novo") || f.includes("extra");
  });
  const regularMembers = team.filter(e => {
    const f = (e.funcao || "").toLowerCase();
    return !f.includes("novo") && !f.includes("extra");
  });

  return (
    <div className={`rounded-2xl border-2 mb-5 overflow-hidden ${color.bg} ${color.border}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(o => !o)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-2 ${color.bg}`}
      >
        <div className="flex items-center gap-2.5">
          <span className="text-xl">{emoji}</span>
          <div className="text-left">
            <p className={`font-bold text-sm ${color.title}`}>{areaLabel} — Próximo Evento</p>
            <div className={`flex items-center gap-1.5 text-xs ${color.sub}`}>
              <CalendarDays className="w-3 h-3" />
              <span className="font-medium">{nextEvent.name}</span>
              <span>·</span>
              <span>{format(new Date(nextEvent.date + "T12:00:00"), "dd/MM", { locale: ptBR })}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!loadingTeam && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color.badge}`}>
              {team.length} prof.
            </span>
          )}
          {expanded ? <ChevronUp className={`w-4 h-4 ${color.sub}`} /> : <ChevronDown className={`w-4 h-4 ${color.sub}`} />}
        </div>
      </button>

      {/* Team list */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-white/60">
          {loadingTeam ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Novos / Extras */}
              {newMembers.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${color.sub} flex items-center gap-1`}>
                    <Star className="w-3 h-3" /> Novos / Extras
                  </p>
                  {newMembers.map((emp, i) => (
                    <EmployeeRow key={i} emp={emp} color={color} highlight />
                  ))}
                </div>
              )}

              {/* Equipe regular */}
              {regularMembers.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {newMembers.length > 0 && (
                    <p className={`text-[10px] font-bold uppercase tracking-widest ${color.sub} flex items-center gap-1`}>
                      <Users className="w-3 h-3" /> Equipe Fixa
                    </p>
                  )}
                  {regularMembers.map((emp, i) => (
                    <EmployeeRow key={i} emp={emp} color={color} />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function EmployeeRow({ emp, color, highlight }) {
  return (
    <div className={`flex items-center gap-3 bg-white border rounded-xl px-3 py-2.5 ${color.row} ${highlight ? "ring-1 ring-yellow-300" : ""}`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${color.badge}`}>
        {emp.full_name?.charAt(0).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{emp.full_name}</p>
        <p className="text-xs text-muted-foreground truncate">{emp.funcao}</p>
      </div>
      <div className="text-right shrink-0">
        {emp.valor && (
          <span className="text-xs font-bold text-emerald-700">R$ {emp.valor}</span>
        )}
      </div>
    </div>
  );
}
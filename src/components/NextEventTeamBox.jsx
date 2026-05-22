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
      const obs = parts[5]?.trim() || "";
      return {
        full_name: parts[0]?.trim(),
        funcao: parts[1]?.trim(),
        valor: parts[2]?.trim(),
        pix: parts[3]?.trim(),
        celular: parts[4]?.trim(),
        isNew: obs.toUpperCase().includes("NOVO"),
      };
    })
    .filter(e => e.full_name);
}

export default function NextEventTeamBox({ area, isAdmin }) {
  // area: "salao" | "cozinha"
  const [team, setTeam] = useState([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-team-box"],
    queryFn: () => base44.entities.Event.list("-date", 50),
    staleTime: 60 * 1000,
  });

  const { data: allEmployees } = useQuery({
    queryKey: ["employees-pix"],
    queryFn: () => base44.entities.Employee.list("full_name", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Pega o próximo evento com escala aprovada para a área correspondente
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const nextEvent = (events || [])
    .filter(ev => {
      if (!ev.date || ev.status === "Cancelado") return false;
      const evDate = new Date(ev.date + "T12:00:00");
      if (evDate < today) return false;
      if (area === "salao") return ev.salao_csv_url;
      if (area === "cozinha") return ev.scale_csv_url;
      return false;
    })
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0];

  const csvUrl = nextEvent ? (area === "salao" ? nextEvent.salao_csv_url : nextEvent.scale_csv_url) : null;

  useEffect(() => {
    if (!csvUrl) return;
    setLoadingTeam(true);
    parseCsv(csvUrl).then(data => {
      setTeam(data);
      setLoadingTeam(false);
    }).catch(() => setLoadingTeam(false));
  }, [csvUrl]);

  // Sempre usa o PIX do banco (substitui o do CSV)
  const normalize = s => (s || "").toLowerCase().trim().replace(/\s+/g, " ");
  const enrichedTeam = team.map(emp => {
    const found = (allEmployees || []).find(e => normalize(e.full_name) === normalize(emp.full_name));
    return { ...emp, pix: found?.pix || emp.pix || "" };
  });

  if (isLoading) return null;
  if (!nextEvent) return null;

  const isSalao = area === "salao";
  const color = isSalao
    ? { bg: "bg-blue-50", border: "border-blue-200", title: "text-blue-800", sub: "text-blue-600", badge: "bg-blue-100 text-blue-700", row: "border-blue-100", dot: "bg-blue-400" }
    : { bg: "bg-orange-50", border: "border-orange-200", title: "text-orange-800", sub: "text-orange-600", badge: "bg-orange-100 text-orange-700", row: "border-orange-100", dot: "bg-orange-400" };

  const emoji = isSalao ? "🍽️" : "🍳";
  const areaLabel = isSalao ? "Equipe do Salão" : "Equipe da Cozinha";

  const newMembers = enrichedTeam.filter(e => e.isNew);
  const regularMembers = enrichedTeam.filter(e => !e.isNew);

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
                    <EmployeeRow key={i} emp={emp} color={color} highlight isAdmin={isAdmin} />
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
                    <EmployeeRow key={i} emp={emp} color={color} isAdmin={isAdmin} />
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

function EmployeeRow({ emp, color, highlight, isAdmin }) {
  return (
    <div className={`bg-white border rounded-xl px-3 py-2.5 ${color.row} ${highlight ? "ring-1 ring-amber-300" : ""}`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${highlight ? "bg-amber-100 text-amber-700" : color.badge}`}>
          {highlight ? "★" : emp.full_name?.charAt(0).toUpperCase()}
        </div>
        <div className="w-32 min-w-0 shrink-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm truncate">{emp.full_name}</p>
            {highlight && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">NOVO</span>}
          </div>
          <p className="text-xs text-muted-foreground truncate">{emp.funcao}</p>
        </div>
        {isAdmin ? (
          <div className="flex-1 flex items-center justify-center">
            {emp.pix ? (
              <span className="text-xs text-primary/80 truncate max-w-[160px] text-center">🔑 {emp.pix}</span>
            ) : (
              <span className="text-xs text-muted-foreground/40 text-center">—</span>
            )}
          </div>
        ) : (
          <div className="flex-1" />
        )}
        {isAdmin && <span className="text-xs font-bold text-emerald-700 shrink-0">{emp.valor ? `R$ ${emp.valor}` : ""}</span>}
      </div>
    </div>
  );
}
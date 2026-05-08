import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowLeft, Loader2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import PageTransition from "@/components/PageTransition";
import * as XLSX from "xlsx";

function parseBRL(str = "") {
  const clean = String(str).replace(/[R$\s.]/g, "").replace(",", ".");
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function formatBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchScaleTotal(url) {
  if (!url) return null;
  try {
    if (url.endsWith(".xlsx") || url.includes(".xlsx")) {
      const buffer = await fetch(url).then((r) => r.arrayBuffer());
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
      for (const row of rows) {
        const label = String(row[0] || "").toUpperCase().trim();
        if (label === "TOTAL GERAL") {
          const val = parseFloat(row[2]);
          if (!isNaN(val)) return val;
        }
      }
      return 0;
    } else {
      // CSV
      const text = await fetch(url).then((r) => r.text());
      const lines = text.trim().split("\n");
      for (const line of lines) {
        if (line.toUpperCase().includes("TOTAL GERAL")) {
          const parts = line.split(";");
          const val = parseFloat(parts[2]?.replace(",", "."));
          if (!isNaN(val)) return val;
        }
      }
      return 0;
    }
  } catch {
    return null;
  }
}

function EventRow({ event }) {
  const [scaleTotal, setScaleTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const csvUrl = event.unified_scale_csv_url || event.scale_csv_url;
  const saleNum = parseBRL(event.sale_value);
  const budget15 = saleNum * 0.15;

  useEffect(() => {
    if (csvUrl) {
      setLoading(true);
      fetchScaleTotal(csvUrl).then((v) => { setScaleTotal(v); setLoading(false); });
    }
  }, [csvUrl]);

  const diff = scaleTotal !== null && saleNum > 0 ? budget15 - scaleTotal : null;
  const hasData = saleNum > 0 && scaleTotal !== null;

  return (
    <div className="bg-white rounded-xl border border-border px-4 py-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/15 to-purple-100 flex flex-col items-center justify-center shrink-0">
            <span className="text-[9px] font-medium text-primary/70 uppercase leading-none">
              {event.date ? format(new Date(event.date + "T12:00:00"), "MMM", { locale: ptBR }) : "---"}
            </span>
            <span className="text-sm font-bold text-primary leading-none">
              {event.date ? format(new Date(event.date + "T12:00:00"), "dd") : "--"}
            </span>
          </div>
          <div>
            <p className="font-semibold text-sm leading-tight">{event.name}</p>
            <p className="text-xs text-muted-foreground">{event.location || "—"}</p>
          </div>
        </div>
        {csvUrl && (
          <a href={csvUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2 py-1 rounded-lg transition-colors">
            <FileSpreadsheet className="w-3 h-3" />
            Excel
          </a>
        )}
      </div>

      {/* Valores */}
      {!saleNum ? (
        <p className="text-xs text-muted-foreground italic">Valor do evento não informado</p>
      ) : loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando escala...
        </div>
      ) : !csvUrl ? (
        <p className="text-xs text-muted-foreground italic">Sem escala cadastrada</p>
      ) : hasData ? (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-50 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Valor evento</p>
            <p className="text-xs font-bold text-slate-700">{formatBRL(saleNum)}</p>
          </div>
          <div className="bg-blue-50 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">15% (limite)</p>
            <p className="text-xs font-bold text-blue-700">{formatBRL(budget15)}</p>
          </div>
          <div className="bg-orange-50 rounded-lg px-2.5 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">Escala total</p>
            <p className="text-xs font-bold text-orange-700">{formatBRL(scaleTotal)}</p>
          </div>
          <div className={`col-span-3 rounded-lg px-3 py-2 flex items-center justify-between ${diff >= 0 ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"}`}>
            <span className={`text-xs font-semibold ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {diff >= 0 ? "✅ Dentro do orçamento" : "⚠️ Orçamento estourado"}
            </span>
            <span className={`text-sm font-bold flex items-center gap-1 ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {diff > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : diff < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
              {formatBRL(Math.abs(diff))}
            </span>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground italic">Sem dados suficientes</p>
      )}
    </div>
  );
}

function MonthBlock({ monthLabel, events, totals }) {
  const { saleTotal, budget15Total, scaleTotal, diff } = totals;
  const hasFinance = saleTotal > 0 && scaleTotal > 0;

  return (
    <div className="space-y-3">
      {/* Cabeçalho do mês */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-2">{monthLabel}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Cards dos eventos */}
      <div className="space-y-2">
        {events.map((ev) => <EventRow key={ev.id} event={ev} />)}
      </div>

      {/* Resumo do mês */}
      <div className={`rounded-xl border-2 px-4 py-3 ${hasFinance ? (diff >= 0 ? "border-emerald-300 bg-emerald-50" : "border-red-300 bg-red-50") : "border-slate-200 bg-slate-50"}`}>
        <p className="text-xs font-bold uppercase tracking-wide mb-2 text-slate-600">
          Resumo de {monthLabel} — {events.length} evento{events.length > 1 ? "s" : ""}
        </p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="text-muted-foreground">Total eventos</p>
            <p className="font-bold text-slate-800">{saleTotal > 0 ? formatBRL(saleTotal) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Limite 15%</p>
            <p className="font-bold text-blue-700">{saleTotal > 0 ? formatBRL(budget15Total) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total escala</p>
            <p className="font-bold text-orange-700">{scaleTotal > 0 ? formatBRL(scaleTotal) : "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">{hasFinance ? (diff >= 0 ? "Sobra" : "Estouro") : "Resultado"}</p>
            {hasFinance ? (
              <p className={`font-bold flex items-center gap-1 ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {diff > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {formatBRL(Math.abs(diff))}
              </p>
            ) : (
              <p className="font-bold text-slate-400">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FinanceDashboard() {
  const loginUser = useLoginUser();
  const navigate = useNavigate();
  const [scaleTotals, setScaleTotals] = useState({});

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-finance"],
    queryFn: () => base44.entities.Event.list("-date", 200),
  });

  // Carrega todos os totais das escalas
  useEffect(() => {
    if (!events) return;
    events.forEach(async (ev) => {
      const csvUrl = ev.unified_scale_csv_url || ev.scale_csv_url;
      if (csvUrl && scaleTotals[ev.id] === undefined) {
        const total = await fetchScaleTotal(csvUrl);
        setScaleTotals(prev => ({ ...prev, [ev.id]: total }));
      }
    });
  }, [events]);

  // Filtra só eventos com valor de venda (para o resumo geral)
  const eventsWithData = (events || []).filter(ev => ev.sale_value);

  // Agrupa por mês
  const groupedByMonth = {};
  (events || []).forEach((ev) => {
    if (!ev.date) return;
    const key = ev.date.slice(0, 7); // "2026-05"
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(ev);
  });
  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  // Acesso restrito ao AndreM (aprovador)
  if (loginUser?.role !== "aprovador" && loginUser?.role !== "admin") {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">Acesso restrito.</p>
        </div>
      </PageTransition>
    );
  }

  // Totais gerais
  const grandSale = eventsWithData.reduce((acc, ev) => acc + parseBRL(ev.sale_value), 0);
  const grandBudget = grandSale * 0.15;
  const grandScale = Object.values(scaleTotals).filter(v => v !== null).reduce((acc, v) => acc + v, 0);
  const grandDiff = grandBudget - grandScale;

  // Calcula totais por mês (usa scaleTotals que vai atualizando)
  function getMonthTotals(monthEvents) {
    const saleTotal = monthEvents.reduce((acc, ev) => acc + parseBRL(ev.sale_value), 0);
    const budget15Total = saleTotal * 0.15;
    const scaleTotal = monthEvents.reduce((acc, ev) => acc + (scaleTotals[ev.id] || 0), 0);
    const diff = budget15Total - scaleTotal;
    return { saleTotal, budget15Total, scaleTotal, diff };
  }

  return (
    <PageTransition>
      <div className="max-w-lg mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            Dashboard Financeiro
          </h1>
          <p className="text-muted-foreground text-xs mt-1">Escala vs orçamento (15% do valor do evento)</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Resumo Geral */}
            {grandSale > 0 && (
              <div className={`rounded-2xl border-2 p-4 ${grandDiff >= 0 ? "border-emerald-400 bg-emerald-50" : "border-red-400 bg-red-50"}`}>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Resumo Geral — Todos os Eventos</p>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white rounded-xl p-3 border border-slate-100">
                    <p className="text-[11px] text-muted-foreground">Total eventos</p>
                    <p className="text-base font-bold text-slate-800">{formatBRL(grandSale)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-blue-100">
                    <p className="text-[11px] text-muted-foreground">Limite 15%</p>
                    <p className="text-base font-bold text-blue-700">{formatBRL(grandBudget)}</p>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-orange-100">
                    <p className="text-[11px] text-muted-foreground">Total escalas</p>
                    <p className="text-base font-bold text-orange-700">{formatBRL(grandScale)}</p>
                  </div>
                  <div className={`rounded-xl p-3 border ${grandDiff >= 0 ? "bg-emerald-100 border-emerald-200" : "bg-red-100 border-red-200"}`}>
                    <p className="text-[11px] text-muted-foreground">{grandDiff >= 0 ? "Sobra geral" : "Estouro geral"}</p>
                    <p className={`text-base font-bold flex items-center gap-1 ${grandDiff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {grandDiff >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      {formatBRL(Math.abs(grandDiff))}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Blocos por mês */}
            {sortedMonths.map((monthKey) => {
              const monthEvents = groupedByMonth[monthKey];
              const [year, month] = monthKey.split("-");
              const monthLabel = format(new Date(parseInt(year), parseInt(month) - 1, 1), "MMMM 'de' yyyy", { locale: ptBR });
              const totals = getMonthTotals(monthEvents);
              return (
                <MonthBlock
                  key={monthKey}
                  monthLabel={monthLabel}
                  events={monthEvents}
                  totals={totals}
                />
              );
            })}

            {sortedMonths.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">
                Nenhum evento cadastrado.
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus, BarChart3, ArrowLeft, Loader2, FileSpreadsheet, Pencil, Check, X, ChevronDown, ChevronUp, Plus, CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

function EventRow({ event, onSaleValueChange, onScaleTotalChange, isAdmin }) {
  const [scaleTotal, setScaleTotal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingScale, setEditingScale] = useState(false);
  const [editScaleValue, setEditScaleValue] = useState("");
  const [savingScale, setSavingScale] = useState(false);
  const csvUrl = event.unified_scale_csv_url || event.scale_csv_url;
  const saleNum = parseBRL(event.sale_value);
  const budget15 = saleNum * 0.15;

  useEffect(() => {
    if (csvUrl) {
      setLoading(true);
      fetchScaleTotal(csvUrl).then((v) => {
        setScaleTotal(v);
        setLoading(false);
        if (v !== null) onScaleTotalChange(event.id, v);
      });
    }
  }, [csvUrl]);

  const diff = scaleTotal !== null && saleNum > 0 ? budget15 - scaleTotal : null;
  const hasData = saleNum > 0 && scaleTotal !== null;

  function startEdit() {
    setEditValue(saleNum > 0 ? String(saleNum) : "");
    setEditing(true);
  }

  async function saveEdit() {
    setSaving(true);
    const raw = editValue.replace(",", ".");
    const num = parseFloat(raw);
    const newValue = isNaN(num) ? "" : String(num);
    await base44.entities.Event.update(event.id, { sale_value: newValue });
    onSaleValueChange(event.id, newValue);
    setSaving(false);
    setEditing(false);
  }

  function cancelEdit() {
    setEditing(false);
    setEditValue("");
  }

  function startEditScale() {
    setEditScaleValue(scaleTotal !== null ? String(scaleTotal) : "");
    setEditingScale(true);
  }

  async function saveEditScale() {
    setSavingScale(true);
    const raw = editScaleValue.replace(",", ".");
    const num = parseFloat(raw);
    const newVal = isNaN(num) ? 0 : num;
    setScaleTotal(newVal);
    onScaleTotalChange(event.id, newVal);
    setSavingScale(false);
    setEditingScale(false);
  }

  function cancelEditScale() {
    setEditingScale(false);
    setEditScaleValue("");
  }

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

      {/* Edição do valor */}
      {isAdmin && editing ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground shrink-0">R$</span>
          <Input
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            inputMode="decimal"
            className="h-8 text-sm"
            placeholder="Ex: 5000"
            onKeyDown={e => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") cancelEdit(); }}
          />
          <button onClick={saveEdit} disabled={saving} className="text-emerald-600 hover:text-emerald-700 p-1">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          </button>
          <button onClick={cancelEdit} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : isAdmin ? (
        <button
          onClick={startEdit}
          className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity"
        >
          <span className={`font-semibold ${saleNum > 0 ? "text-slate-700" : "text-primary"}`}>
            {saleNum > 0 ? formatBRL(saleNum) : "Informar valor do evento"}
          </span>
          <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 text-primary">
            <Pencil className="w-3 h-3" />
          </span>
        </button>
      ) : saleNum > 0 ? (
        <span className="text-xs font-semibold text-slate-700">{formatBRL(saleNum)}</span>
      ) : null}

      {/* Valores calculados */}
      {!saleNum && !editing ? null : loading ? (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" /> Carregando escala...
        </div>
      ) : !csvUrl && scaleTotal === null ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground italic">Sem escala — {isAdmin ? "informe o total:" : "total não informado"}</span>
          {isAdmin && editingScale ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                autoFocus
                value={editScaleValue}
                onChange={e => setEditScaleValue(e.target.value)}
                inputMode="decimal"
                className="h-7 text-xs"
                placeholder="Ex: 1500"
                onKeyDown={e => { if (e.key === "Enter") saveEditScale(); if (e.key === "Escape") cancelEditScale(); }}
              />
              <button onClick={saveEditScale} disabled={savingScale} className="text-emerald-600 hover:text-emerald-700 p-1">
                {savingScale ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              </button>
              <button onClick={cancelEditScale} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : isAdmin ? (
            <button onClick={startEditScale} className="flex items-center gap-1 text-xs font-semibold text-primary hover:opacity-80">
              <span className="flex items-center justify-center w-5 h-5 rounded-md bg-primary/10 text-primary">
                <Pencil className="w-3 h-3" />
              </span>
              Informar
            </button>
          ) : null}
        </div>
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
            {isAdmin && editingScale ? (
              <div className="flex items-center gap-1 mt-0.5">
                <Input
                  autoFocus
                  value={editScaleValue}
                  onChange={e => setEditScaleValue(e.target.value)}
                  inputMode="decimal"
                  className="h-6 text-xs px-1 py-0"
                  onKeyDown={e => { if (e.key === "Enter") saveEditScale(); if (e.key === "Escape") cancelEditScale(); }}
                />
                <button onClick={saveEditScale} disabled={savingScale} className="text-emerald-600 hover:text-emerald-700">
                  {savingScale ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                </button>
                <button onClick={cancelEditScale} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : isAdmin ? (
              <button onClick={startEditScale} className="flex items-center justify-center gap-1 mx-auto hover:opacity-80 transition-opacity">
                <span className="text-xs font-bold text-orange-700">{formatBRL(scaleTotal)}</span>
                <span className="flex items-center justify-center w-4 h-4 rounded bg-orange-200 text-orange-700">
                  <Pencil className="w-2.5 h-2.5" />
                </span>
              </button>
            ) : (
              <span className="text-xs font-bold text-orange-700">{formatBRL(scaleTotal)}</span>
            )}
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

function MonthBlock({ monthLabel, monthKey, events, totals, onSaleValueChange, onScaleTotalChange, isAdmin, onAddEvent }) {
  const { saleTotal, budget15Total, scaleTotal, diff } = totals;
  const hasFinance = saleTotal > 0 && scaleTotal > 0;
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-2xl border-2 overflow-hidden ${hasFinance ? (diff >= 0 ? "border-emerald-300" : "border-red-300") : "border-slate-200"}`}>
      {/* Cabeçalho clicável */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full px-4 py-3 flex items-center justify-between gap-2 ${hasFinance ? (diff >= 0 ? "bg-emerald-50" : "bg-red-50") : "bg-slate-50"}`}
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold capitalize text-slate-700">{monthLabel}</span>
          <span className="text-xs text-muted-foreground">— {events.length} evento{events.length > 1 ? "s" : ""}</span>
        </div>
        <div className="flex items-center gap-3">
          {hasFinance && (
            <span className={`text-xs font-bold flex items-center gap-1 ${diff >= 0 ? "text-emerald-700" : "text-red-700"}`}>
              {diff >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {formatBRL(Math.abs(diff))}
            </span>
          )}
          {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {/* Resumo do mês (sempre visível) */}
      <div className="px-4 py-2.5 bg-white border-t border-border grid grid-cols-3 gap-2 text-xs">
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
      </div>

      {/* Eventos (colapsável) */}
      {open && (
        <div className="px-3 py-3 space-y-2 border-t border-border bg-background">
          {events.map((ev) => (
            <EventRow key={ev.id} event={ev} onSaleValueChange={onSaleValueChange} onScaleTotalChange={onScaleTotalChange} isAdmin={isAdmin} />
          ))}
          {isAdmin && (
            <button
              onClick={() => onAddEvent(monthKey)}
              className="w-full flex items-center justify-center gap-1.5 text-xs text-primary border border-dashed border-primary/40 rounded-xl py-2.5 hover:bg-primary/5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar evento neste mês
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function AddEventModal({ onClose, onSave, defaultDate }) {
  const [name, setName] = useState("");
  const [date, setDate] = useState(defaultDate || "");
  const [saleValue, setSaleValue] = useState("");
  const [scaleValue, setScaleValue] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name || !date) return;
    setSaving(true);
    const newEvent = await base44.entities.Event.create({
      name,
      date,
      sale_value: saleValue ? String(parseFloat(saleValue.replace(",", "."))) : "",
      status: "Concluído",
    });
    onSave(newEvent, scaleValue ? parseFloat(scaleValue.replace(",", ".")) : null);
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end justify-center" onClick={onClose}>
      <div className="bg-background rounded-t-2xl w-full max-w-lg p-5 space-y-4 pb-8" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-base flex items-center gap-2"><CalendarPlus className="w-4 h-4 text-primary" /> Adicionar Evento</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Nome do evento *</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Casamento Silva" className="mt-1" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Data *</label>
            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Valor do evento (R$)</label>
              <Input value={saleValue} onChange={e => setSaleValue(e.target.value)} inputMode="decimal" placeholder="Ex: 8000" className="mt-1" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Total escala (R$)</label>
              <Input value={scaleValue} onChange={e => setScaleValue(e.target.value)} inputMode="decimal" placeholder="Ex: 1200" className="mt-1" />
            </div>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving || !name || !date} className="w-full gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {saving ? "Salvando..." : "Adicionar"}
        </Button>
      </div>
    </div>
  );
}

export default function FinanceDashboard() {
  const loginUser = useLoginUser();
  const navigate = useNavigate();
  const [scaleTotals, setScaleTotals] = useState({});
  const [localEvents, setLocalEvents] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalDefaultDate, setAddModalDefaultDate] = useState("");

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-finance"],
    queryFn: () => base44.entities.Event.list("-date", 200),
  });

  // Sincroniza localEvents quando events carrega pela primeira vez
  useEffect(() => {
    if (events && !localEvents) setLocalEvents(events);
  }, [events]);

  const displayEvents = localEvents || events || [];

  function handleSaleValueChange(eventId, newValue) {
    setLocalEvents(prev => prev.map(ev => ev.id === eventId ? { ...ev, sale_value: newValue } : ev));
  }

  function handleScaleTotalChange(eventId, newTotal) {
    setScaleTotals(prev => ({ ...prev, [eventId]: newTotal }));
  }

  function handleEventAdded(newEvent, scaleValue) {
    setLocalEvents(prev => [newEvent, ...(prev || [])]);
    if (scaleValue !== null) {
      setScaleTotals(prev => ({ ...prev, [newEvent.id]: scaleValue }));
    }
  }

  function openAddModal(monthKey) {
    // Pré-preenche com o último dia do mês selecionado
    if (monthKey) {
      const [year, month] = monthKey.split("-");
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      setAddModalDefaultDate(`${year}-${month}-${String(lastDay).padStart(2, "0")}`);
    } else {
      setAddModalDefaultDate("");
    }
    setShowAddModal(true);
  }



  // Filtra só eventos com valor de venda (para o resumo geral)
  const eventsWithData = displayEvents.filter(ev => ev.sale_value);

  // Agrupa por mês
  const groupedByMonth = {};
  displayEvents.forEach((ev) => {
    if (!ev.date) return;
    const key = ev.date.slice(0, 7); // "2026-05"
    if (!groupedByMonth[key]) groupedByMonth[key] = [];
    groupedByMonth[key].push(ev);
  });
  const sortedMonths = Object.keys(groupedByMonth).sort((a, b) => b.localeCompare(a));

  const isAdmin = loginUser?.role === "admin";

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

  // Totais gerais — soma todos com sale_value; escala soma o que tiver disponível
  const eventsWithSale = displayEvents.filter(ev => parseBRL(ev.sale_value) > 0);
  const grandSale = eventsWithSale.reduce((acc, ev) => acc + parseBRL(ev.sale_value), 0);
  const grandBudget = grandSale * 0.15;
  const grandScale = displayEvents.reduce((acc, ev) => acc + (scaleTotals[ev.id] || 0), 0);
  const grandDiff = grandBudget - grandScale;

  // Calcula totais por mês — soma tudo que tiver valor de venda; escala soma o que estiver disponível
  function getMonthTotals(monthEvents) {
    const withSale = monthEvents.filter(ev => parseBRL(ev.sale_value) > 0);
    const saleTotal = withSale.reduce((acc, ev) => acc + parseBRL(ev.sale_value), 0);
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

        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Dashboard Financeiro
            </h1>
            <p className="text-muted-foreground text-xs mt-1">Escala vs orçamento (15% do valor do evento)</p>
          </div>
          {isAdmin && (
            <Button size="sm" onClick={() => openAddModal(null)} className="gap-1.5 shrink-0 mt-1">
              <Plus className="w-3.5 h-3.5" />
              Evento
            </Button>
          )}
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
                  monthKey={monthKey}
                  monthLabel={monthLabel}
                  events={monthEvents}
                  totals={totals}
                  onSaleValueChange={handleSaleValueChange}
                  onScaleTotalChange={handleScaleTotalChange}
                  isAdmin={isAdmin}
                  onAddEvent={openAddModal}
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
      {showAddModal && (
        <AddEventModal
          onClose={() => setShowAddModal(false)}
          onSave={handleEventAdded}
          defaultDate={addModalDefaultDate}
        />
      )}
    </PageTransition>
  );
}
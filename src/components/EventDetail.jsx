import { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import EventScaleBuilder from "./EventScaleBuilder";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, CalendarDays, FileText, Users,
  Plus, X, Search, Loader2, UserCheck, CheckCircle2, ShieldCheck, PlayCircle,
  Paperclip, ExternalLink, Upload, FileDown, FileSpreadsheet, ClipboardCheck,
  Clock, DollarSign, Bell, RotateCcw
} from "lucide-react";
import FinanceCalcBox from "./FinanceCalcBox";
import { Textarea } from "@/components/ui/textarea";
import EventScale from "./EventScale";
import UnifiedScaleAdminBox from "./UnifiedScaleAdminBox";
import IndividualReceiptButton from "./IndividualReceiptButton";
import ScalePreviewCard from "./ScalePreviewCard";
import ScaleTeamList from "./ScaleTeamList";
import EventEditForm from "./EventEditForm";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";

export default function EventDetail({ event, onBack, onRefresh }) {
  const loginUser = useLoginUser();
  const isJuberly = loginUser?.role === "cozinha";
  const isAndreF = loginUser?.role === "salao";
  const isAdmin = loginUser?.role === "admin" || loginUser?.role === "aprovador";
  const isNinho = loginUser?.username === "Ninho";
  const [showEditForm, setShowEditForm] = useState(false);
  const [showScaleBuilder, setShowScaleBuilder] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [saving, setSaving] = useState(false);
  const [teamConfirmed, setTeamConfirmed] = useState(event.team_confirmed || false);
  const [localEmployeeIds, setLocalEmployeeIds] = useState(event.employees || []);
  const [confirming, setConfirming] = useState(false);
  const hasActiveSession = !!localStorage.getItem(`event_scale_${event.id}`);
  const [showScale, setShowScale] = useState(hasActiveSession);
  const [scalePdfUrl, setScalePdfUrl] = useState(event.scale_pdf_url || "");
  const [scaleCsvUrl, setScaleCsvUrl] = useState(event.scale_csv_url || "");
  const [salaoScaleCsvUrl, setSalaoScaleCsvUrl] = useState(event.salao_csv_url || "");
  const [scaleSubmitted, setScaleSubmitted] = useState(event.scale_submitted || false);
  const [scaleApproved, setScaleApproved] = useState(event.scale_approved || false);
  const [scaleRejected, setScaleRejected] = useState(event.scale_rejected || false);
  const [salaoSubmitted, setSalaoSubmitted] = useState(event.salao_submitted || false);
  const [salaoApproved, setSalaoApproved] = useState(event.salao_approved || false);
  const [salaoRejected, setSalaoRejected] = useState(event.salao_rejected || false);
  const [salaoScaleBuilder, setSalaoScaleBuilder] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptsPdfUrl, setReceiptsPdfUrl] = useState(event.receipts_pdf_url || "");
  const [eventStatus, setEventStatus] = useState(event.status || "Planejado");
  const [sendingNotif, setSendingNotif] = useState(false);
  const [editingDate, setEditingDate] = useState(false);
  const [newDate, setNewDate] = useState(event.date || "");
  const [savingDate, setSavingDate] = useState(false);
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfEmployees, setPdfEmployees] = useState([]);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [salaoTeamList, setSalaoTeamList] = useState([]);
  const [loadingSalaoTeam, setLoadingSalaoTeam] = useState(false);
  const [pdfReviewMode, setPdfReviewMode] = useState(false);
  const [showAddPdfDialog, setShowAddPdfDialog] = useState(false);
  const [searchPdfEmployee, setSearchPdfEmployee] = useState("");
  const [showReturnCozinhaDialog, setShowReturnCozinhaDialog] = useState(false);
  const [showReturnSalaoDialog, setShowReturnSalaoDialog] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [returning, setReturning] = useState(false);

  const { data: allEmployees = [] } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("full_name", 500),
    staleTime: 5 * 60 * 1000,
  });

  const eventEmployeeIds = localEmployeeIds;
  
  const assignedEmployees = (allEmployees || []).filter(emp => 
    eventEmployeeIds.includes(emp.id)
  );

  // Merge employees from scale CSVs into assigned list
  const [csvEmployeeNames, setCsvEmployeeNames] = useState([]);
  useEffect(() => {
    const names = new Set();
    const fetchers = [];
    if (isAdmin && scaleCsvUrl) {
      fetchers.push(
        fetch(scaleCsvUrl).then(r => r.text()).then(text => {
          text.trim().split("\n").slice(1).forEach(line => {
            const name = line.split(";")[0]?.trim();
            if (name && !name.toUpperCase().startsWith("TOTAL")) names.add(name);
          });
        }).catch(() => {})
      );
    }
    if ((isAdmin || isAndreF) && salaoScaleCsvUrl) {
      fetchers.push(
        fetch(salaoScaleCsvUrl).then(r => r.text()).then(text => {
          text.trim().split("\n").slice(1).forEach(line => {
            const name = line.split(";")[0]?.trim();
            if (name && !name.toUpperCase().startsWith("TOTAL")) names.add(name);
          });
        }).catch(() => {})
      );
    }
    if (fetchers.length > 0) {
      Promise.all(fetchers).then(() => setCsvEmployeeNames([...names]));
    }
  }, [scaleCsvUrl, salaoScaleCsvUrl, isAdmin, isAndreF]);

  // Merge CSV employees that aren't already in assignedEmployees
  const mergedEmployees = (() => {
    const existing = new Set(assignedEmployees.map(e => e.full_name?.toLowerCase().trim()));
    const csvOnly = csvEmployeeNames.filter(name => !existing.has(name.toLowerCase().trim()));
    const csvMatched = csvOnly.map(name => {
      const found = (allEmployees || []).find(e => e.full_name?.toLowerCase().trim() === name.toLowerCase().trim());
      // Found = cadastrado → treat as regular (receipt button, full style)
      // Not found = only in CSV → muted style, no receipt button
      return found ? { ...found } : { id: name, full_name: name, role: "Escala", _csvOnly: true };
    });
    return [...assignedEmployees, ...csvMatched];
  })();

  // Carrega a lista de funcionários da escala do salão a partir do CSV
  useEffect(() => {
    if (!salaoScaleCsvUrl) return;
    setLoadingSalaoTeam(true);
    fetch(salaoScaleCsvUrl)
      .then(r => r.text())
      .then(text => {
        const lines = text.trim().split("\n").slice(1);
        const parsed = lines
          .filter(l => l.trim() && !l.toUpperCase().startsWith("TOTAL"))
          .map(line => {
            const parts = line.split(";");
            return { full_name: parts[0]?.trim(), funcao: parts[1]?.trim(), valor: parts[2]?.trim() };
          })
          .filter(e => e.full_name);
        setSalaoTeamList(parsed);
        setLoadingSalaoTeam(false);
      })
      .catch(() => setLoadingSalaoTeam(false));
  }, [salaoScaleCsvUrl, isAndreF]);

  const handlePdfUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPdf(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    await base44.entities.Event.update(event.id, { scale_pdf_url: res.file_url });
    event.scale_pdf_url = res.file_url;
    setScalePdfUrl(res.file_url);
    onRefresh();
    setUploadingPdf(false);
    toast({ title: "PDF da escala anexado!" });
  };

  if (showScaleBuilder || salaoScaleBuilder) {
    return (
      <EventScaleBuilder
        event={event}
        area={salaoScaleBuilder ? "salao" : "cozinha"}
        onBack={async () => {
          const updated = await base44.entities.Event.filter({ id: event.id });
          if (updated?.[0]?.scale_csv_url) setScaleCsvUrl(updated[0].scale_csv_url);
          if (updated?.[0]?.salao_csv_url) setSalaoScaleCsvUrl(updated[0].salao_csv_url);
          if (updated?.[0]?.scale_submitted !== undefined) setScaleSubmitted(updated[0].scale_submitted);
          if (updated?.[0]?.salao_submitted !== undefined) setSalaoSubmitted(updated[0].salao_submitted);
          if (updated?.[0]?.scale_rejected !== undefined) setScaleRejected(updated[0].scale_rejected);
          if (updated?.[0]?.salao_rejected !== undefined) setSalaoRejected(updated[0].salao_rejected);
          setShowScaleBuilder(false);
          setSalaoScaleBuilder(false);
          onRefresh();
        }}
      />
    );
  }

  if (showScale) {
    const scaleEmployees = pdfEmployees.length > 0 ? pdfEmployees : assignedEmployees;
    return (
      <EventScale
        event={event}
        employees={scaleEmployees}
        onBack={async () => {
          // Recarrega o evento para obter scale_pdf_url e status atualizados
          const updated = await base44.entities.Event.filter({ id: event.id });
          if (updated?.[0]?.scale_pdf_url) setScalePdfUrl(updated[0].scale_pdf_url);
          if (updated?.[0]?.scale_csv_url) setScaleCsvUrl(updated[0].scale_csv_url);
          if (updated?.[0]?.scale_submitted !== undefined) setScaleSubmitted(updated[0].scale_submitted);
          if (updated?.[0]?.scale_approved !== undefined) setScaleApproved(updated[0].scale_approved);
          if (updated?.[0]?.receipts_pdf_url) setReceiptsPdfUrl(updated[0].receipts_pdf_url);
          if (updated?.[0]?.status) { event.status = updated[0].status; setEventStatus(updated[0].status); }
          setShowScale(false);
          onRefresh();
        }}
      />
    );
  }

  const ANDREF_ROLE_KEYWORDS = ["salão","salao","garçom","garcom","garçonete","garconete","recepcionista","recepção","recepcao","limpeza","segurança","seguranca","copeiro","atendente","barman","bartender","mestre","dj","assessor","gestor"];

  const availableEmployees = (allEmployees || []).filter(emp => {
    if (eventEmployeeIds.includes(emp.id)) return false;
    const matchesSearch = emp.full_name?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
      emp.role?.toLowerCase().includes(searchEmployee.toLowerCase());
    if (!matchesSearch) return false;
    if (isAndreF) return ANDREF_ROLE_KEYWORDS.some(k => (emp.role || "").toLowerCase().includes(k));
    return true;
  });

  const addEmployee = async (employeeId) => {
    // Optimistic update
    const updated = [...localEmployeeIds, employeeId];
    setLocalEmployeeIds(updated);
    event.employees = updated;
    toast({ title: "Funcionário adicionado ao evento!" });
    base44.entities.Event.update(event.id, { employees: updated }).then(onRefresh);
  };

  const removeEmployee = async (employeeId) => {
    // Optimistic update
    const updated = localEmployeeIds.filter(id => id !== employeeId);
    setLocalEmployeeIds(updated);
    event.employees = updated;
    if (teamConfirmed) setTeamConfirmed(false);
    toast({ title: "Funcionário removido do evento" });
    const ops = [base44.entities.Event.update(event.id, { employees: updated })];
    if (teamConfirmed) ops.push(base44.entities.Event.update(event.id, { team_confirmed: false }));
    Promise.all(ops).then(onRefresh);
  };

  const handleConfirmTeam = async () => {
    if (assignedEmployees.length === 0) {
      toast({ title: "Adicione ao menos um funcionário antes de confirmar", variant: "destructive" });
      return;
    }
    setConfirming(true);
    await base44.entities.Event.update(event.id, { team_confirmed: true });
    event.team_confirmed = true;
    setTeamConfirmed(true);
    onRefresh();
    setConfirming(false);
    toast({ title: "Equipe confirmada com sucesso!" });
  };

  const statusColors = {
    "Planejado": "bg-blue-50 text-blue-700 border-blue-200",
    "Em Andamento": "bg-amber-50 text-amber-700 border-amber-200",
    "Concluído": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Cancelado": "bg-slate-50 text-slate-500 border-slate-200",
  };

  const roleColors = {
    "Salão": "bg-blue-50 text-blue-600",
    "Cozinha": "bg-orange-50 text-orange-600",
    "Segurança": "bg-red-50 text-red-600",
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      {/* Edit Form - apenas Ninho */}
      {isNinho && showEditForm && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-base mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Evento
          </h2>
          <EventEditForm
            event={event}
            onSuccess={(updated) => {
              Object.assign(event, updated);
              setShowEditForm(false);
              onRefresh();
            }}
            onCancel={() => setShowEditForm(false)}
          />
        </div>
      )}

      {/* Event Header */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm mb-6">
        <div className="bg-gradient-to-br from-primary/10 via-accent to-primary/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full border ${statusColors[event.status] || statusColors.Planejado}`}>
                {event.status || "Planejado"}
              </span>
              {isNinho && !showEditForm && (
                <button
                  onClick={() => setShowEditForm(true)}
                  className="mt-2 ml-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  Editar
                </button>
              )}
            </div>
            <div className="w-16 h-16 rounded-xl bg-white/80 backdrop-blur flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-medium text-primary/70 uppercase">
                {event.date ? format(new Date(event.date + "T12:00:00"), "MMM", { locale: ptBR }) : "---"}
              </span>
              <span className="text-2xl font-bold text-primary leading-none">
                {event.date ? format(new Date(event.date + "T12:00:00"), "dd") : "--"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {event.date && (
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {isAdmin && editingDate ? (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="h-8 px-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <Button
                    size="sm"
                    disabled={savingDate}
                    onClick={async () => {
                      if (!newDate) return;
                      setSavingDate(true);
                      await base44.entities.Event.update(event.id, { date: newDate });
                      event.date = newDate;
                      setEditingDate(false);
                      setSavingDate(false);
                      onRefresh();
                      toast({ title: "Data atualizada!" });
                    }}
                    className="h-8 px-3 rounded-lg text-xs"
                  >
                    {savingDate ? <Loader2 className="w-3 h-3 animate-spin" /> : "Salvar"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingDate(false)} className="h-8 px-2 rounded-lg text-xs">
                    Cancelar
                  </Button>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  {format(new Date(event.date + "T12:00:00"), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  {isAdmin && (
                    <button onClick={() => setEditingDate(true)} className="text-muted-foreground hover:text-primary transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                  )}
                </span>
              )}
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          {event.description && (
            <div className="mt-1 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <FileText className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wide text-amber-600">Observações do Evento</span>
              </div>
              {event.description
                .split(/\n/)
                .flatMap(line => line.split(/(?<=\.)\s+/))
                .map(s => s.trim())
                .filter(Boolean)
                .map((line, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-sm text-amber-900 leading-snug">{line}</p>
                  </div>
                ))}
            </div>
          )}

          {/* Horários e convidados — visível para todos */}
          {(event.ceremony_start || event.ceremony_end || event.party_start || event.party_end || event.after_start || event.after_end || event.guest_count) && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {(event.ceremony_start || event.ceremony_end) && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Cerimônia:</span>
                  <span className="font-medium">
                    {event.ceremony_start || "--:--"} às {event.ceremony_end || "--:--"}
                  </span>
                </div>
              )}
              {(event.party_start || event.party_end) && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Festa:</span>
                  <span className="font-medium">
                    {event.party_start || "--:--"} às {event.party_end || "--:--"}
                  </span>
                </div>
              )}
              {(event.after_start || event.after_end) && (
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-base shrink-0">🎶</span>
                  <span className="text-muted-foreground">After:</span>
                  <span className="font-medium">
                    {event.after_start || "--:--"} às {event.after_end || "--:--"}
                  </span>
                </div>
              )}
              {event.guest_count && (
                <div className="flex items-center gap-3 text-sm">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="text-muted-foreground">Convidados:</span>
                  <span className="font-medium">{event.guest_count}</span>
                </div>
              )}
              {event.party_start && event.party_end && (() => {
                const [sh, sm] = event.party_start.split(":").map(Number);
                const [eh, em] = event.party_end.split(":").map(Number);
                const totalMins = (eh * 60 + em) - (sh * 60 + sm);
                if (totalMins <= 0) return null;
                const hours = Math.floor(totalMins / 60);
                const mins = totalMins % 60;
                const label = hours > 0 && mins > 0 ? `${hours}h ${mins}min` : hours > 0 ? `${hours}h` : `${mins}min`;
                return (
                  <div className="flex items-center gap-3 text-sm">
                    <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                    <span className="text-muted-foreground">Duração da festa:</span>
                    <span className="font-medium">{label}</span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>



      {/* Ninho: listas das escalas aprovadas + opção de devolver */}
      {isNinho && scaleApproved && scaleCsvUrl && (
        <div className="mt-4 space-y-2">
          <ScaleTeamList csvUrl={scaleCsvUrl} title="🍳 Equipe da Cozinha" color="orange" />
          <Button
            variant="outline"
            onClick={() => { setReturnReason(""); setShowReturnCozinhaDialog(true); }}
            className="w-full h-10 rounded-xl gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Devolver Escala da Cozinha ao Juberly
          </Button>
        </div>
      )}
      {isNinho && salaoApproved && salaoScaleCsvUrl && (
        <div className="mt-2 space-y-2">
          <ScaleTeamList csvUrl={salaoScaleCsvUrl} title="🍽️ Equipe do Salão" color="blue" />
          <Button
            variant="outline"
            onClick={() => { setReturnReason(""); setShowReturnSalaoDialog(true); }}
            className="w-full h-10 rounded-xl gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Devolver Escala do Salão ao AndreF
          </Button>
        </div>
      )}

      {/* Juberly: Aviso de reprovação com motivo */}
      {isJuberly && scaleRejected && !scaleSubmitted && event.scale_rejected_reason && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm text-red-700 font-medium">Motivo da reprovação:</p>
          <p className="text-sm text-red-600 bg-red-100 rounded-xl px-4 py-3">{event.scale_rejected_reason}</p>
        </div>
      )}

      {/* Juberly: Criar Escala da Cozinha */}
      {isJuberly && !scaleApproved && (
        <div className="mt-6">
          {scaleCsvUrl ? (
            <div className={`rounded-2xl p-5 shadow-sm space-y-3 border ${scaleSubmitted ? "bg-emerald-50 border-emerald-200" : scaleRejected ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🍳</span>
                <div>
                  <h2 className={`font-semibold ${scaleSubmitted ? "text-emerald-800" : scaleRejected ? "text-red-800" : "text-orange-800"}`}>
                    Escala da Cozinha — {scaleSubmitted ? "Enviada" : scaleRejected ? "Reprovada" : "Pronta"}
                  </h2>
                  <p className={`text-xs ${scaleSubmitted ? "text-emerald-600" : scaleRejected ? "text-red-600" : "text-orange-600"}`}>
                    {scaleSubmitted ? "✅ Aguardando aprovação" : scaleRejected ? "❌ Corrija e reenvie" : "Escala gerada — envie para o admin aprovar"}
                  </p>
                </div>
              </div>
              <a
                href={scaleCsvUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 border border-orange-300 bg-white text-orange-700 rounded-xl text-sm font-medium transition-colors hover:bg-orange-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Baixar Excel da Escala
              </a>
              {(!scaleSubmitted || scaleRejected) && (
                <>
                  <Button
                    onClick={() => setShowScaleBuilder(true)}
                    variant="outline"
                    className="w-full h-11 border-orange-300 text-orange-700 rounded-xl gap-2 hover:bg-orange-50"
                  >
                    <Plus className="w-4 h-4" />
                    Editar Escala (Adicionar / Remover)
                  </Button>
                  {!scaleSubmitted && (
                    <Button
                      onClick={async () => {
                        setSubmitting(true);
                        await base44.entities.Event.update(event.id, { scale_submitted: true, scale_rejected: false });
                        setScaleSubmitted(true);
                        setScaleRejected(false);
                        setSubmitting(false);
                      }}
                      disabled={submitting}
                      className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {submitting ? "Enviando..." : "Enviar para Aprovação"}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-orange-800">🍳 Escala da Cozinha</h2>
                  <p className="text-xs text-orange-600 mt-0.5">Adicione os funcionários e defina funções e valores</p>
                </div>
              </div>
              <Button
                onClick={() => setShowScaleBuilder(true)}
                className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar / Editar Escala
              </Button>
            </div>
          )}
        </div>
      )}

      {/* AndreF: Escala Aprovada + Iniciar PDF */}
      {isAndreF && salaoApproved && (
        <div className="mt-6 space-y-3">
          <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-5 flex items-center gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800">Escala do Salão Aprovada! ✅</p>
              <p className="text-xs text-emerald-600 mt-0.5">O AndreM aprovou sua escala. Você pode iniciar as assinaturas.</p>
            </div>
          </div>
          {!scalePdfUrl && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
              <Clock className="w-4 h-4 shrink-0" />
              Aguardando o PDF da escala para iniciar as assinaturas.
            </div>
          )}
          {eventStatus !== "Concluído" && (
            <Button
              onClick={async () => {
                // Prioridade: PDF da escala completa (anexado pelo admin), depois CSV do salão
                const sourceUrl = scalePdfUrl || salaoScaleCsvUrl;
                if (sourceUrl && pdfEmployees.length === 0) {
                  setExtractingPdf(true);
                  const isPdf = scalePdfUrl && !salaoScaleCsvUrl;
                  const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                    file_url: sourceUrl,
                    json_schema: {
                      type: "object",
                      properties: {
                        employees: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              full_name: { type: "string" },
                              cpf: { type: "string" },
                              funcao: { type: "string" },
                              valor: { type: "string" }
                            }
                          }
                        }
                      }
                    }
                  });
                  setExtractingPdf(false);
                  if (result?.output?.employees?.length > 0) {
                    const empsCsv = result.output.employees.filter(e => e.full_name && !e.full_name.toUpperCase().startsWith("TOTAL"));
                    const enriched = empsCsv.map(csvEmp => {
                      const found = (allEmployees || []).find(e =>
                        e.full_name?.toLowerCase().trim() === csvEmp.full_name?.toLowerCase().trim()
                      );
                      return {
                        full_name: csvEmp.full_name,
                        role: csvEmp.funcao || found?.role || "",
                        funcao: csvEmp.funcao || "",
                        valor: csvEmp.valor || "",
                        cpf: csvEmp.cpf || found?.cpf || "",
                      };
                    });
                    setPdfEmployees(enriched);
                  }
                }
                setShowScale(true);
              }}
              disabled={extractingPdf || !scalePdfUrl}
              className="w-full h-14 text-base font-semibold rounded-2xl gap-3 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30 hover:opacity-90"
            >
              {extractingPdf ? <Loader2 className="w-6 h-6 animate-spin" /> : <PlayCircle className="w-6 h-6" />}
              {extractingPdf ? "Carregando escala..." : "Iniciar Assinaturas & Fotos"}
            </Button>
          )}
          {eventStatus === "Concluído" && receiptsPdfUrl && (
            <a
              href={receiptsPdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Baixar PDF dos Recibos
            </a>
          )}
        </div>
      )}

      {/* AndreF: Aviso de reprovação com motivo */}
      {isAndreF && salaoRejected && !salaoSubmitted && event.salao_rejected_reason && (
        <div className="mt-6 bg-red-50 border border-red-200 rounded-2xl p-4 space-y-1">
          <p className="text-sm text-red-700 font-medium">Motivo da reprovação:</p>
          <p className="text-sm text-red-600 bg-red-100 rounded-xl px-4 py-3">{event.salao_rejected_reason}</p>
        </div>
      )}



      {/* AndreF: Gerenciar Equipe do Salão */}
      {isAndreF && (
        <div className="mt-6 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Equipe do Salão</h2>
              {assignedEmployees.filter(e => {
                const r = (e.role || "").toLowerCase();
                return r.includes("salão") || r.includes("salao") || r.includes("garçom") || r.includes("garcom") || r.includes("garçonete") || r.includes("garconete") || r.includes("recepcionista") || r.includes("recepção") || r.includes("recepcao") || r.includes("limpeza") || r.includes("segurança") || r.includes("seguranca") || r.includes("copeiro") || r.includes("atendente") || r.includes("barman") || r.includes("bartender") || r.includes("mestre") || r.includes("dj") || r.includes("assessor") || r.includes("gestor");
              }).length > 0 && (
                <span className="text-xs text-muted-foreground">
                  ({assignedEmployees.filter(e => {
                    const r = (e.role || "").toLowerCase();
                    return r.includes("salão") || r.includes("salao") || r.includes("garçom") || r.includes("garcom") || r.includes("garçonete") || r.includes("garconete") || r.includes("recepcionista") || r.includes("recepção") || r.includes("recepcao") || r.includes("limpeza") || r.includes("segurança") || r.includes("seguranca") || r.includes("copeiro") || r.includes("atendente") || r.includes("barman") || r.includes("bartender") || r.includes("mestre") || r.includes("dj") || r.includes("assessor") || r.includes("gestor");
                  }).length} pessoas)
                </span>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowAddDialog(true); setSearchEmployee(""); }}
              className="gap-1.5 rounded-xl text-xs h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar
            </Button>
          </div>
          {(() => {
            const ANDREF_ROLE_KEYWORDS = ["salão","salao","garçom","garcom","garçonete","garconete","recepcionista","recepção","recepcao","limpeza","segurança","seguranca","copeiro","atendente","barman","bartender","mestre","dj","assessor","gestor"];
            const team = assignedEmployees.filter(e => ANDREF_ROLE_KEYWORDS.some(k => (e.role || "").toLowerCase().includes(k)));
            if (team.length === 0) return <p className="text-sm text-muted-foreground text-center py-3">Nenhum funcionário adicionado ainda</p>;
            return (
              <div className="space-y-2">
                {team.map(emp => (
                  <div key={emp.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-xs font-bold text-blue-700 shrink-0">
                      {emp.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{emp.full_name}</p>
                      <p className="text-xs text-muted-foreground">{emp.role}</p>
                    </div>
                    <button onClick={() => removeEmployee(emp.id)} className="text-destructive/40 hover:text-destructive transition-colors p-1">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}

      {/* AndreF: Criar Escala do Salão */}
      {isAndreF && !salaoApproved && (
        <div className="mt-6">
          {salaoScaleCsvUrl ? (
            <div className={`rounded-2xl p-5 shadow-sm space-y-3 border ${salaoSubmitted ? "bg-emerald-50 border-emerald-200" : salaoRejected ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🍽️</span>
                <div>
                  <h2 className={`font-semibold ${salaoSubmitted ? "text-emerald-800" : salaoRejected ? "text-red-800" : "text-blue-800"}`}>
                    Escala do Salão — {salaoSubmitted ? "Enviada" : salaoRejected ? "Reprovada" : "Pronta"}
                  </h2>
                  <p className={`text-xs ${salaoSubmitted ? "text-emerald-600" : salaoRejected ? "text-red-600" : "text-blue-600"}`}>
                    {salaoSubmitted ? "✅ Aguardando aprovação" : salaoRejected ? "❌ Corrija e reenvie" : "Escala gerada — envie para o admin aprovar"}
                  </p>
                </div>
              </div>
              <a
                href={salaoScaleCsvUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full h-10 border border-blue-300 bg-white text-blue-700 rounded-xl text-sm font-medium transition-colors hover:bg-blue-50"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Baixar Excel da Escala
              </a>
              {(!salaoSubmitted || salaoRejected) && (
                <>
                  <Button
                    onClick={() => setSalaoScaleBuilder(true)}
                    variant="outline"
                    className="w-full h-11 border-blue-300 text-blue-700 rounded-xl gap-2 hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4" />
                    Editar Escala
                  </Button>
                  {!salaoSubmitted && (
                    <Button
                      onClick={async () => {
                        setSubmitting(true);
                        await base44.entities.Event.update(event.id, { salao_submitted: true, salao_rejected: false });
                        setSalaoSubmitted(true);
                        setSalaoRejected(false);
                        setSubmitting(false);
                      }}
                      disabled={submitting}
                      className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {submitting ? "Enviando..." : "Enviar para Aprovação"}
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-blue-800">🍽️ Escala do Salão</h2>
                  <p className="text-xs text-blue-600 mt-0.5">Adicione os funcionários e defina funções e valores</p>
                </div>
                <Button
                  onClick={() => setSalaoScaleBuilder(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Escala
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Excel Unificado - ambas escalas aprovadas - apenas admin */}
      {isAdmin && scaleApproved && salaoApproved && (event.unified_scale_csv_url || scaleCsvUrl) && (
        <UnifiedScaleAdminBox event={event} scaleCsvUrl={scaleCsvUrl} />
      )}

      {/* Cálculo 15% - apenas Ninho */}
      {isNinho && event.sale_value && (
        <div className="mt-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
          <h2 className="font-semibold text-emerald-800 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Financeiro do Evento
          </h2>
          <FinanceCalcBox
            event={event}
            csvUrl={event.unified_scale_csv_url || event.scale_csv_url}
            editable={true}
          />
        </div>
      )}

      {/* Botão notificar - apenas admin */}
      {isAdmin && (
        <div className="mt-6">
          <Button
            variant="outline"
            disabled={sendingNotif}
            onClick={async () => {
              setSendingNotif(true);
              await base44.functions.invoke("sendPushNotification", {
                title: "📅 Novo Evento",
                body: `O evento "${event.name}" foi adicionado${event.date ? ` para ${event.date}` : ""}.`,
                target_roles: ["admin", "cozinha", "salao", "aprovador"],
              });
              toast({ title: "Notificação enviada para todos!" });
              setSendingNotif(false);
            }}
            className="w-full h-11 rounded-xl gap-2 border-primary/30 text-primary hover:bg-primary/5"
          >
            {sendingNotif ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {sendingNotif ? "Enviando..." : "Notificar Todos sobre este Evento"}
          </Button>
        </div>
      )}

      {/* Funcionários Alocados - admin e AndreF geram recibos individuais */}
      {(isAdmin || isAndreF) && assignedEmployees.length > 0 && (
        <div className="mt-6 bg-card rounded-2xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-primary" />
            <h2 className="font-semibold">Funcionários Alocados ({mergedEmployees.length})</h2>
            <span className="text-xs text-muted-foreground ml-auto">arraste para reordenar</span>
          </div>
          <DragDropContext
            onDragEnd={async (result) => {
              if (!result.destination) return;
              if (result.source.index === result.destination.index) return;
              // Reorder mergedEmployees, then extract real IDs
              const reordered = [...mergedEmployees];
              const [moved] = reordered.splice(result.source.index, 1);
              reordered.splice(result.destination.index, 0, moved);
              const newOrder = reordered.filter(e => !e._csvOnly).map(e => e.id);
              setLocalEmployeeIds(newOrder);
              event.employees = newOrder;
              await base44.entities.Event.update(event.id, { employees: newOrder });
              onRefresh();
            }}
          >
            <Droppable droppableId="employee-list">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-2 max-h-80 overflow-y-auto">
                  {mergedEmployees.map((emp, index) => {
                    const isCsvOnly = emp._csvOnly;
                    return (
                    <Draggable key={emp.id} draggableId={emp.id} index={index} isDragDisabled={isCsvOnly}>
                      {(provided, snapshot) => {
                        const csvOnly = emp._csvOnly;
                        return (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`flex items-center justify-between gap-2 p-2.5 rounded-xl transition-shadow ${
                            csvOnly ? "bg-muted/30 opacity-70" : snapshot.isDragging ? "bg-primary/5 shadow-lg border border-primary/20" : "bg-muted/40"
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div {...provided.dragHandleProps} className={`shrink-0 ${csvOnly ? "text-muted-foreground/30 cursor-default" : "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                            </div>
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${csvOnly ? "bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500" : "bg-gradient-to-br from-primary/20 to-purple-200 text-primary"}`}>
                              {emp.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{emp.full_name}</p>
                              <p className="text-xs text-muted-foreground">{csvOnly ? "da escala" : emp.role}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {csvOnly && (
                              <span className="text-xs text-muted-foreground/60 px-2 py-1 rounded-lg bg-slate-100 shrink-0">não cadastrado</span>
                            )}
                            {emp.signature_url ? (
                              <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg font-medium flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                Assinado
                              </span>
                            ) : (
                              <IndividualReceiptButton
                                event={event}
                                employee={emp}
                                onOpenScale={(emp) => {
                                  setPdfEmployees([{ ...emp, _key: emp.id }]);
                                  setShowScale(true);
                                }}
                              />
                            )}
                          </div>
                        </div>
                      )}}
                    </Draggable>
                  );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {/* PDF da Escala - apenas admin */}
      {isAdmin && <div className="mt-6 bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <h2 className="font-semibold">PDF da Escala</h2>
        </div>

        {scalePdfUrl ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2 bg-muted/60 rounded-xl px-4 py-3">
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm truncate text-muted-foreground">Escala anexada</span>
            </div>
            <a
              href={scalePdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 h-10 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90"
            >
              <ExternalLink className="w-4 h-4" />
              Abrir
            </a>
            {eventStatus !== "Concluído" && (
              <label className="cursor-pointer inline-flex items-center gap-2 h-10 px-4 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
                <Upload className="w-4 h-4" />
                Trocar
                <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
              </label>
            )}
          </div>
        ) : (
          <label className="cursor-pointer flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl py-6 hover:border-primary/40 hover:bg-accent/30 transition-colors">
            {uploadingPdf ? (
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            ) : (
              <Upload className="w-6 h-6 text-muted-foreground" />
            )}
            <p className="text-sm text-muted-foreground">
              {uploadingPdf ? "Enviando..." : "Clique para anexar o PDF da escala"}
            </p>
            <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} disabled={uploadingPdf} />
          </label>
        )}
      </div>}

      {/* PDF Review Mode - apenas admin */}
      {isAdmin && pdfReviewMode && (
        <div className="mt-4">
          <Button
            onClick={() => setShowScale(true)}
            disabled={pdfEmployees.length === 0}
            className="w-full h-14 text-base font-semibold rounded-2xl gap-3 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30 hover:opacity-90"
          >
            <PlayCircle className="w-6 h-6" />
            Confirmar Todos e Iniciar Escala
          </Button>
        </div>
      )}



      {/* Start Scale Button - apenas admin */}
      {isAdmin && !pdfReviewMode && (teamConfirmed || scalePdfUrl || assignedEmployees.length > 0) && eventStatus !== "Concluído" && (
        <div className="mt-4 space-y-2">
          {scaleCsvUrl && !scaleApproved && (
            <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700">
              <ClipboardCheck className="w-4 h-4 shrink-0" />
              Aguardando aprovação da escala da cozinha para iniciar.
            </div>
          )}
          <Button
            onClick={async () => {
              if (scalePdfUrl && pdfEmployees.length === 0) {
                setExtractingPdf(true);
                const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                  file_url: scalePdfUrl,
                  json_schema: {
                    type: "object",
                    properties: {
                      employees: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            full_name: { type: "string" },
                            cpf: { type: "string" },
                            valor: { type: "string" }
                          }
                        }
                      }
                    }
                  }
                });
                setExtractingPdf(false);
                if (result?.output?.employees?.length > 0) {
                  setPdfEmployees(result.output.employees);
                  setPdfReviewMode(true);
                } else {
                  toast({ title: "Não foi possível extrair os nomes do PDF", variant: "destructive" });
                }
              } else {
                setShowScale(true);
              }
            }}
            disabled={extractingPdf || !!(scaleCsvUrl && !scaleApproved)}
            className="w-full h-14 text-base font-semibold rounded-2xl gap-3 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30 hover:opacity-90"
          >
            {extractingPdf ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <PlayCircle className="w-6 h-6" />
            )}
            {extractingPdf ? "Lendo PDF..." : "Iniciar Escala (Assinaturas & Fotos)"}
          </Button>
        </div>
      )}

      {/* Escala finalizada - apenas admin */}
      {isAdmin && eventStatus === "Concluído" && (
        <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Evento finalizado</p>
              <p className="text-xs text-emerald-600">
                {receiptsPdfUrl ? "PDF dos recibos disponível para download." : "Nenhum PDF de recibos gerado para este evento."}
              </p>
            </div>
          </div>
          {receiptsPdfUrl ? (
            <a
              href={receiptsPdfUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Baixar PDF dos Recibos
            </a>
          ) : (
            <p className="text-xs text-emerald-600 text-center py-1">Nenhum PDF disponível</p>
          )}
        </div>
      )}

      {/* Add Employee Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Funcionário</DialogTitle>
          </DialogHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionário..."
              value={searchEmployee}
              onChange={(e) => setSearchEmployee(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {availableEmployees.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-4">
                {searchEmployee ? "Nenhum funcionário encontrado" : "Todos os funcionários já estão alocados"}
              </p>
            ) : (
              availableEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    addEmployee(emp.id);
                    setShowAddDialog(false);
                    setSearchEmployee("");
                  }}
                  disabled={saving}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
                >
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.full_name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">
                        {emp.full_name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{emp.full_name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleColors[emp.role] || 'bg-slate-50 text-slate-600'}`}>
                      {emp.role}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Devolver Escala Cozinha Dialog */}
      <Dialog open={showReturnCozinhaDialog} onOpenChange={setShowReturnCozinhaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver Escala da Cozinha</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Informe o motivo para o Juberly corrigir e reenviar.</p>
          <Textarea
            placeholder="Ex: Faltou informar o valor do João..."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="min-h-[80px] rounded-xl text-sm mb-3"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReturnCozinhaDialog(false)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button
              disabled={returning || !returnReason.trim()}
              onClick={async () => {
                setReturning(true);
                await base44.entities.Event.update(event.id, {
                  scale_approved: false,
                  scale_submitted: false,
                  scale_rejected: true,
                  scale_rejected_reason: returnReason.trim(),
                });
                setScaleApproved(false);
                setScaleSubmitted(false);
                setScaleRejected(true);
                event.scale_rejected_reason = returnReason.trim();
                setReturning(false);
                setShowReturnCozinhaDialog(false);
                toast({ title: "Escala devolvida ao Juberly!" });
                onRefresh();
              }}
              className="flex-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white gap-2"
            >
              {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Devolver
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Devolver Escala Salão Dialog */}
      <Dialog open={showReturnSalaoDialog} onOpenChange={setShowReturnSalaoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Devolver Escala do Salão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-2">Informe o motivo para o AndreF corrigir e reenviar.</p>
          <Textarea
            placeholder="Ex: Faltou informar o valor do Carlos..."
            value={returnReason}
            onChange={(e) => setReturnReason(e.target.value)}
            className="min-h-[80px] rounded-xl text-sm mb-3"
          />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowReturnSalaoDialog(false)} className="flex-1 rounded-xl">Cancelar</Button>
            <Button
              disabled={returning || !returnReason.trim()}
              onClick={async () => {
                setReturning(true);
                await base44.entities.Event.update(event.id, {
                  salao_approved: false,
                  salao_submitted: false,
                  salao_rejected: true,
                  salao_rejected_reason: returnReason.trim(),
                  unified_scale_csv_url: "",
                });
                setSalaoApproved(false);
                setSalaoSubmitted(false);
                setSalaoRejected(true);
                event.salao_rejected_reason = returnReason.trim();
                setReturning(false);
                setShowReturnSalaoDialog(false);
                toast({ title: "Escala devolvida ao AndreF!" });
                onRefresh();
              }}
              className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white gap-2"
            >
              {returning ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              Devolver
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to PDF Review Dialog */}
      <Dialog open={showAddPdfDialog} onOpenChange={setShowAddPdfDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar à Escala</DialogTitle>
          </DialogHeader>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionário..."
              value={searchPdfEmployee}
              onChange={(e) => setSearchPdfEmployee(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="max-h-80 overflow-y-auto space-y-2">
            {(allEmployees || [])
              .filter(emp =>
                emp.full_name?.toLowerCase().includes(searchPdfEmployee.toLowerCase()) ||
                emp.role?.toLowerCase().includes(searchPdfEmployee.toLowerCase())
              )
              .map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => {
                    setPdfEmployees(prev => [...prev, { full_name: emp.full_name, cpf: emp.cpf, role: emp.role, id: emp.id }]);
                    setShowAddPdfDialog(false);
                    setSearchPdfEmployee("");
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
                >
                  {emp.photo_url ? (
                    <img src={emp.photo_url} alt={emp.full_name} className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{emp.full_name?.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{emp.full_name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${roleColors[emp.role] || 'bg-slate-50 text-slate-600'}`}>
                      {emp.role}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                </button>
              ))
            }
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import EventScaleBuilder from "./EventScaleBuilder";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, CalendarDays, FileText, Users,
  Plus, X, Search, Loader2, UserCheck, CheckCircle2, ShieldCheck, PlayCircle,
  Paperclip, ExternalLink, Upload, FileDown, FileSpreadsheet
} from "lucide-react";
import EventScale from "./EventScale";
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
  const [scaleSubmitted, setScaleSubmitted] = useState(event.scale_submitted || false);
  const [submitting, setSubmitting] = useState(false);
  const [receiptsPdfUrl, setReceiptsPdfUrl] = useState(event.receipts_pdf_url || "");
  const [eventStatus, setEventStatus] = useState(event.status || "Planejado");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfEmployees, setPdfEmployees] = useState([]);
  const [extractingPdf, setExtractingPdf] = useState(false);
  const [pdfReviewMode, setPdfReviewMode] = useState(false);
  const [showAddPdfDialog, setShowAddPdfDialog] = useState(false);
  const [searchPdfEmployee, setSearchPdfEmployee] = useState("");

  const { data: allEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("full_name", 500),
  });

  const eventEmployeeIds = localEmployeeIds;
  
  const assignedEmployees = (allEmployees || []).filter(emp => 
    eventEmployeeIds.includes(emp.id)
  );

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

  if (showScaleBuilder) {
    return (
      <EventScaleBuilder
        event={event}
        onBack={() => setShowScaleBuilder(false)}
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
          if (updated?.[0]?.receipts_pdf_url) setReceiptsPdfUrl(updated[0].receipts_pdf_url);
          if (updated?.[0]?.status) { event.status = updated[0].status; setEventStatus(updated[0].status); }
          setShowScale(false);
          onRefresh();
        }}
      />
    );
  }

  const availableEmployees = (allEmployees || []).filter(emp => 
    !eventEmployeeIds.includes(emp.id) &&
    (emp.full_name?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
     emp.role?.toLowerCase().includes(searchEmployee.toLowerCase()))
  );

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

      {/* Event Header */}
      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm mb-6">
        <div className="bg-gradient-to-br from-primary/10 via-accent to-primary/5 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">{event.name}</h1>
              <span className={`inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full border ${statusColors[event.status] || statusColors.Planejado}`}>
                {event.status || "Planejado"}
              </span>
            </div>
            <div className="w-16 h-16 rounded-xl bg-white/80 backdrop-blur flex flex-col items-center justify-center shadow-sm">
              <span className="text-xs font-medium text-primary/70 uppercase">
                {event.date ? format(new Date(event.date), "MMM", { locale: ptBR }) : "---"}
              </span>
              <span className="text-2xl font-bold text-primary leading-none">
                {event.date ? format(new Date(event.date), "dd") : "--"}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-3">
          {event.date && (
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              <span>{format(new Date(event.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
            </div>
          )}
          {event.location && (
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          {event.description && (
            <div className="flex items-start gap-3 text-sm">
              <FileText className="w-4 h-4 text-muted-foreground mt-0.5" />
              <span className="text-muted-foreground">{event.description}</span>
            </div>
          )}
        </div>
      </div>

      {/* Juberly: Criar Escala da Cozinha */}
      {isJuberly && (
        <div className="mt-6">
          {scaleCsvUrl ? (
            <div className={`rounded-2xl p-5 shadow-sm space-y-3 border ${scaleSubmitted ? "bg-emerald-50 border-emerald-200" : "bg-orange-50 border-orange-200"}`}>
              <div className="flex items-center gap-2">
                <span className="text-lg">🍳</span>
                <div>
                  <h2 className={`font-semibold ${scaleSubmitted ? "text-emerald-800" : "text-orange-800"}`}>
                    Escala da Cozinha — Pronta
                  </h2>
                  <p className={`text-xs ${scaleSubmitted ? "text-emerald-600" : "text-orange-600"}`}>
                    {scaleSubmitted ? "✅ Enviada para aprovação" : "Escala gerada — envie para o admin aprovar"}
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
              {!scaleSubmitted && (
                <Button
                  onClick={async () => {
                    setSubmitting(true);
                    await base44.entities.Event.update(event.id, { scale_submitted: true });
                    setScaleSubmitted(true);
                    setSubmitting(false);
                    toast({ title: "Escala enviada para aprovação!" });
                  }}
                  disabled={submitting}
                  className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  {submitting ? "Enviando..." : "Enviar para Aprovação"}
                </Button>
              )}
            </div>
          ) : (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-orange-800">🍳 Escala da Cozinha</h2>
                  <p className="text-xs text-orange-600 mt-0.5">Adicione os funcionários e defina funções e valores</p>
                </div>
                <Button
                  onClick={() => setShowScaleBuilder(true)}
                  className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Criar Escala
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PDF da Escala - apenas admin */}
      {!isJuberly && <div className="mt-6 bg-card rounded-2xl border border-border p-5 shadow-sm">
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
      {!isJuberly && pdfReviewMode && (
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
      {!isJuberly && !pdfReviewMode && (teamConfirmed || scalePdfUrl || assignedEmployees.length > 0) && eventStatus !== "Concluído" && (
        <div className="mt-4">
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
            disabled={extractingPdf}
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
      {!isJuberly && eventStatus === "Concluído" && (
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
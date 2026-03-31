import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, CalendarDays, FileText, Users,
  Plus, X, Search, Loader2, UserCheck, CheckCircle2, ShieldCheck, PlayCircle,
  Paperclip, ExternalLink, Upload
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
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchEmployee, setSearchEmployee] = useState("");
  const [saving, setSaving] = useState(false);
  const [teamConfirmed, setTeamConfirmed] = useState(event.team_confirmed || false);
  const [confirming, setConfirming] = useState(false);
  const [showScale, setShowScale] = useState(false);
  const [scalePdfUrl, setScalePdfUrl] = useState(event.scale_pdf_url || "");
  const [uploadingPdf, setUploadingPdf] = useState(false);
  const [pdfEmployees, setPdfEmployees] = useState([]);
  const [extractingPdf, setExtractingPdf] = useState(false);

  const { data: allEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("full_name", 500),
  });

  const eventEmployeeIds = event.employees || [];
  
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

  if (showScale) {
    const scaleEmployees = pdfEmployees.length > 0 ? pdfEmployees : assignedEmployees;
    return (
      <EventScale
        event={event}
        employees={scaleEmployees}
        onBack={() => setShowScale(false)}
      />
    );
  }

  const availableEmployees = (allEmployees || []).filter(emp => 
    !eventEmployeeIds.includes(emp.id) &&
    (emp.full_name?.toLowerCase().includes(searchEmployee.toLowerCase()) ||
     emp.role?.toLowerCase().includes(searchEmployee.toLowerCase()))
  );

  const addEmployee = async (employeeId) => {
    setSaving(true);
    const updatedEmployees = [...eventEmployeeIds, employeeId];
    await base44.entities.Event.update(event.id, { employees: updatedEmployees });
    event.employees = updatedEmployees;
    onRefresh();
    setSaving(false);
    toast({ title: "Funcionário adicionado ao evento!" });
  };

  const removeEmployee = async (employeeId) => {
    setSaving(true);
    const updatedEmployees = eventEmployeeIds.filter(id => id !== employeeId);
    await base44.entities.Event.update(event.id, { employees: updatedEmployees });
    event.employees = updatedEmployees;
    if (teamConfirmed) {
      setTeamConfirmed(false);
      await base44.entities.Event.update(event.id, { team_confirmed: false });
    }
    onRefresh();
    setSaving(false);
    toast({ title: "Funcionário removido do evento" });
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

      {/* Employees Section */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Equipe do Evento</h2>
            <span className="text-sm text-muted-foreground">({assignedEmployees.length})</span>
          </div>
          <Button 
            size="sm" 
            onClick={() => setShowAddDialog(true)}
            className="gap-2 rounded-xl"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </Button>
        </div>

        {assignedEmployees.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-3">
              <UserCheck className="w-6 h-6 text-primary/40" />
            </div>
            <p className="text-sm text-muted-foreground">Nenhum funcionário alocado</p>
            <Button 
              variant="link" 
              size="sm" 
              onClick={() => setShowAddDialog(true)}
              className="mt-2"
            >
              Adicionar funcionários
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            {assignedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors group"
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
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeEmployee(emp.id)}
                  disabled={saving}
                  className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Team Section */}
      <div className="mt-6">
        {teamConfirmed ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-emerald-800">Equipe Confirmada!</p>
              <p className="text-sm text-emerald-600 mt-0.5">
                {assignedEmployees.length} funcionário(s) alocado(s) para este evento.
              </p>
            </div>
            <button
              onClick={async () => {
                await base44.entities.Event.update(event.id, { team_confirmed: false });
                event.team_confirmed = false;
                setTeamConfirmed(false);
                onRefresh();
              }}
              className="text-xs text-emerald-600 underline hover:no-underline"
            >
              Desfazer
            </button>
          </div>
        ) : (
          <Button
            onClick={handleConfirmTeam}
            disabled={confirming || assignedEmployees.length === 0}
            className="w-full h-14 text-base font-semibold rounded-2xl gap-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:opacity-90 shadow-lg shadow-emerald-500/30"
          >
            {confirming ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
            {confirming ? "Confirmando..." : "Confirmar Equipe do Evento"}
          </Button>
        )}
      </div>

      {/* PDF da Escala */}
      <div className="mt-6 bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Paperclip className="w-5 h-5 text-primary" />
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
            <label className="cursor-pointer inline-flex items-center gap-2 h-10 px-4 border border-border rounded-xl text-sm font-medium hover:bg-muted transition-colors">
              <Upload className="w-4 h-4" />
              Trocar
              <input type="file" accept="application/pdf" className="hidden" onChange={handlePdfUpload} />
            </label>
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
      </div>

      {/* Start Scale Button */}
      {(teamConfirmed || scalePdfUrl) && (
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
                  setShowScale(true);
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
    </div>
  );
}
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, XCircle, FileSpreadsheet, MapPin, Loader2, ClipboardCheck, ArrowLeft } from "lucide-react";
import FinanceCalcBox from "@/components/FinanceCalcBox";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import PageTransition from "@/components/PageTransition";

export default function Approvals() {
  const loginUser = useLoginUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [approvingId, setApprovingId] = useState(null);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState({});
  const [showRejectInput, setShowRejectInput] = useState({});

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-approvals"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  // Escalas pendentes (cozinha e salão)
  const pendingCozinha = (events || []).filter(ev => ev.scale_submitted && !ev.scale_approved).map(ev => ({ ...ev, _area: "cozinha" }));
  const pendingSalao = (events || []).filter(ev => ev.salao_submitted && !ev.salao_approved).map(ev => ({ ...ev, _area: "salao" }));
  const pending = [...pendingCozinha, ...pendingSalao];

  // Eventos com ambas as escalas submetidas (e pelo menos uma ainda não aprovada)
  const unifiedEvents = (events || []).filter(ev =>
    ev.scale_submitted && ev.salao_submitted &&
    (!ev.scale_approved || !ev.salao_approved)
  );
  // IDs dos eventos unificados para não duplicar nos cards individuais
  const unifiedEventIds = new Set(unifiedEvents.map(ev => ev.id));
  const pendingIndividual = pending.filter(item => !unifiedEventIds.has(item.id));

  const handleApprove = async (item) => {
    const key = `${item.id}_${item._area}`;
    setApprovingId(key);
    const updatePayload = item._area === "salao"
      ? { salao_approved: true, salao_rejected: false, salao_rejected_reason: "" }
      : { scale_approved: true, scale_rejected: false, scale_rejected_reason: "" };
    await base44.entities.Event.update(item.id, updatePayload);
    queryClient.invalidateQueries(["events-approvals"]);
    queryClient.invalidateQueries(["events"]);
    queryClient.invalidateQueries(["event", item.id]);
    setApprovingId(null);
    const areaLabel = item._area === "salao" ? "Salão" : "Cozinha";
    toast.success(`Escala do ${areaLabel} de "${item.name}" aprovada!`);
  };

  const handleReject = async (item) => {
    const key = `${item.id}_${item._area}`;
    const reason = rejectReason[key] || "";
    if (!reason.trim()) {
      toast.error("Informe o motivo da reprovação.");
      return;
    }
    setRejectingId(key);
    const updatePayload = item._area === "salao"
      ? { salao_submitted: false, salao_approved: false, salao_rejected: true, salao_rejected_reason: reason }
      : { scale_submitted: false, scale_approved: false, scale_rejected: true, scale_rejected_reason: reason, unified_scale_csv_url: "" };
    await base44.entities.Event.update(item.id, updatePayload);
    queryClient.invalidateQueries(["events-approvals"]);
    queryClient.invalidateQueries(["events"]);
    queryClient.invalidateQueries(["event", item.id]);
    setRejectingId(null);
    setShowRejectInput(prev => ({ ...prev, [key]: false }));
    setRejectReason(prev => ({ ...prev, [key]: "" }));
    const areaLabel = item._area === "salao" ? "Salão" : "Cozinha";
    toast.success(`Escala do ${areaLabel} reprovada. ${item._area === "salao" ? "AndreF" : "Juberly"} será notificado.`);
  };

  if (loginUser?.role !== "admin" && loginUser?.role !== "aprovador") {
    return (
      <PageTransition>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground text-sm">Acesso restrito ao administrador.</p>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-6 h-6 text-primary" />
            Aprovações Pendentes
          </h1>
          <p className="text-muted-foreground text-xs mt-1">
            Escalas da cozinha e salão aguardando sua aprovação
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 animate-spin text-primary" />
          </div>
        ) : pending.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="font-semibold text-lg">Tudo em dia!</h3>
            <p className="text-sm text-muted-foreground mt-1">Nenhuma escala aguardando aprovação.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Eventos com ambas escalas submetidas — mostra unificado com aprovação individual */}
            {unifiedEvents.map((ev) => (
              <div key={`unified_${ev.id}`} className="bg-card rounded-2xl p-5 shadow-sm space-y-4 border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 bg-gradient-to-br from-primary/20 to-purple-200">
                      <span className="text-[10px] font-medium uppercase text-primary/70">
                        {ev.date ? format(new Date(ev.date), "MMM", { locale: ptBR }) : "---"}
                      </span>
                      <span className="text-lg font-bold leading-none text-primary">
                        {ev.date ? format(new Date(ev.date), "dd") : "--"}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-base">{ev.name}</h2>
                      {ev.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {ev.location}
                        </p>
                      )}
                      <p className="text-xs text-primary font-semibold mt-1">🍳 Cozinha + 🍽️ Salão Prontos</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium px-2.5 py-1 rounded-full shrink-0 border bg-primary/10 text-primary border-primary/30">
                    📊 Unificada
                  </span>
                </div>

                {/* Excel unificado */}
                {ev.unified_scale_csv_url ? (
                  <>
                    <a
                      href={ev.unified_scale_csv_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-medium transition-colors border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Ver Excel Unificado
                    </a>
                    {/* Cálculo financeiro */}
                    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4">
                      <FinanceCalcBox event={ev} csvUrl={ev.unified_scale_csv_url} editable={true} />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm text-muted-foreground border border-dashed border-border">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando Excel Unificado...
                  </div>
                )}

                {/* Aprovação individual — Cozinha */}
                {!ev.scale_approved && (
                  <div className="space-y-2 bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-orange-700">🍳 Cozinha</p>
                    <Button
                      onClick={() => handleApprove({ ...ev, _area: "cozinha" })}
                      disabled={approvingId === `${ev.id}_cozinha`}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                    >
                      {approvingId === `${ev.id}_cozinha` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {approvingId === `${ev.id}_cozinha` ? "Aprovando..." : "Aprovar Cozinha"}
                    </Button>
                    <Button
                      onClick={() => setShowRejectInput(prev => ({ ...prev, [`${ev.id}_cozinha`]: !prev[`${ev.id}_cozinha`] }))}
                      variant="outline"
                      className="w-full h-10 border-red-300 text-red-600 rounded-xl gap-2 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {showRejectInput[`${ev.id}_cozinha`] ? "Cancelar" : "Reprovar Cozinha"}
                    </Button>
                    {showRejectInput[`${ev.id}_cozinha`] && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Motivo da reprovação da cozinha..."
                          value={rejectReason[`${ev.id}_cozinha`] || ""}
                          onChange={e => setRejectReason(prev => ({ ...prev, [`${ev.id}_cozinha`]: e.target.value }))}
                          className="resize-none text-sm"
                          rows={3}
                        />
                        <Button
                          onClick={() => handleReject({ ...ev, _area: "cozinha" })}
                          disabled={rejectingId === `${ev.id}_cozinha`}
                          className="w-full h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
                        >
                          {rejectingId === `${ev.id}_cozinha` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          {rejectingId === `${ev.id}_cozinha` ? "Reprovando..." : "Confirmar Reprovação"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {ev.scale_approved && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Cozinha aprovada
                  </div>
                )}

                {/* Aprovação individual — Salão */}
                {!ev.salao_approved && (
                  <div className="space-y-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs font-semibold text-blue-700">🍽️ Salão</p>
                    <Button
                      onClick={() => handleApprove({ ...ev, _area: "salao" })}
                      disabled={approvingId === `${ev.id}_salao`}
                      className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                    >
                      {approvingId === `${ev.id}_salao` ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                      {approvingId === `${ev.id}_salao` ? "Aprovando..." : "Aprovar Salão"}
                    </Button>
                    <Button
                      onClick={() => setShowRejectInput(prev => ({ ...prev, [`${ev.id}_salao`]: !prev[`${ev.id}_salao`] }))}
                      variant="outline"
                      className="w-full h-10 border-red-300 text-red-600 rounded-xl gap-2 hover:bg-red-50"
                    >
                      <XCircle className="w-4 h-4" />
                      {showRejectInput[`${ev.id}_salao`] ? "Cancelar" : "Reprovar Salão"}
                    </Button>
                    {showRejectInput[`${ev.id}_salao`] && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Motivo da reprovação do salão..."
                          value={rejectReason[`${ev.id}_salao`] || ""}
                          onChange={e => setRejectReason(prev => ({ ...prev, [`${ev.id}_salao`]: e.target.value }))}
                          className="resize-none text-sm"
                          rows={3}
                        />
                        <Button
                          onClick={() => handleReject({ ...ev, _area: "salao" })}
                          disabled={rejectingId === `${ev.id}_salao`}
                          className="w-full h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
                        >
                          {rejectingId === `${ev.id}_salao` ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                          {rejectingId === `${ev.id}_salao` ? "Reprovando..." : "Confirmar Reprovação"}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                {ev.salao_approved && (
                  <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm text-emerald-700 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Salão aprovado
                  </div>
                )}
              </div>
            ))}

            {/* Escalas individuais (apenas uma pronta) */}
            {pendingIndividual.map((item) => {
              const isSalao = item._area === "salao";
              const itemKey = `${item.id}_${item._area}`;
              const csvUrl = isSalao ? item.salao_csv_url : item.scale_csv_url;
              return (
                <div key={itemKey} className={`bg-card rounded-2xl p-5 shadow-sm space-y-4 border ${isSalao ? "border-blue-200" : "border-orange-200"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 ${isSalao ? "bg-gradient-to-br from-blue-100 to-blue-200" : "bg-gradient-to-br from-orange-100 to-orange-200"}`}>
                        <span className={`text-[10px] font-medium uppercase ${isSalao ? "text-blue-600" : "text-orange-600"}`}>
                          {item.date ? format(new Date(item.date), "MMM", { locale: ptBR }) : "---"}
                        </span>
                        <span className={`text-lg font-bold leading-none ${isSalao ? "text-blue-700" : "text-orange-700"}`}>
                          {item.date ? format(new Date(item.date), "dd") : "--"}
                        </span>
                      </div>
                      <div>
                        <h2 className="font-bold text-base">{item.name}</h2>
                        {item.location && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {item.location}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 border ${isSalao ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-orange-100 text-orange-700 border-orange-200"}`}>
                      {isSalao ? "🍽️ Salão" : "🍳 Cozinha"}
                    </span>
                  </div>

                  {csvUrl && (
                    <a
                      href={csvUrl}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center justify-center gap-2 w-full h-10 rounded-xl text-sm font-medium transition-colors border ${isSalao ? "border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100" : "border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100"}`}
                    >
                      <FileSpreadsheet className="w-4 h-4" />
                      Ver Excel da Escala
                    </a>
                  )}

                  <Button
                    onClick={() => handleApprove(item)}
                    disabled={approvingId === itemKey}
                    className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                  >
                    {approvingId === itemKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                    {approvingId === itemKey ? "Aprovando..." : `Aprovar ${isSalao ? "Salão" : "Cozinha"}`}
                  </Button>

                  <Button
                    onClick={() => setShowRejectInput(prev => ({ ...prev, [itemKey]: !prev[itemKey] }))}
                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    {showRejectInput[itemKey] ? "Cancelar" : `Reprovar ${isSalao ? "Salão" : "Cozinha"}`}
                  </Button>

                  {showRejectInput[itemKey] && (
                    <div className="space-y-2 pt-1">
                      <Textarea
                        placeholder="Motivo da reprovação..."
                        value={rejectReason[itemKey] || ""}
                        onChange={e => setRejectReason(prev => ({ ...prev, [itemKey]: e.target.value }))}
                        className="resize-none text-sm"
                        rows={3}
                      />
                      <Button
                        onClick={() => handleReject(item)}
                        disabled={rejectingId === itemKey}
                        className="w-full h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl gap-2"
                      >
                        {rejectingId === itemKey ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                        {rejectingId === itemKey ? "Reprovando..." : "Confirmar Reprovação"}
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
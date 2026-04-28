import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLoginUser } from "@/hooks/useLoginUser";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileSpreadsheet, CalendarDays, MapPin, Loader2, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";

export default function Approvals() {
  const loginUser = useLoginUser();
  const queryClient = useQueryClient();
  const [approvingId, setApprovingId] = useState(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events-approvals"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  // Escalas pendentes (cozinha e salão)
  const pendingCozinha = (events || []).filter(ev => ev.scale_submitted && !ev.scale_approved).map(ev => ({ ...ev, _area: "cozinha" }));
  const pendingSalao = (events || []).filter(ev => ev.salao_submitted && !ev.salao_approved).map(ev => ({ ...ev, _area: "salao" }));
  const pending = [...pendingCozinha, ...pendingSalao];

  const handleApprove = async (item) => {
    const key = `${item.id}_${item._area}`;
    setApprovingId(key);
    const updatePayload = item._area === "salao" ? { salao_approved: true } : { scale_approved: true };
    await base44.entities.Event.update(item.id, updatePayload);
    queryClient.invalidateQueries(["events-approvals"]);
    queryClient.invalidateQueries(["events"]);
    queryClient.invalidateQueries(["event", item.id]);
    setApprovingId(null);
    const areaLabel = item._area === "salao" ? "Salão" : "Cozinha";
    toast.success(`Escala do ${areaLabel} de "${item.name}" aprovada!`);
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
            {pending.map((item) => {
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
                    {approvingId === itemKey ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    {approvingId === itemKey ? "Aprovando..." : "Aprovar Escala"}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
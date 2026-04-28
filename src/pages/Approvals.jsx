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

  // Escalas enviadas pelo Juberly aguardando aprovação
  const pending = (events || []).filter(ev => ev.scale_submitted && !ev.scale_approved);

  const handleApprove = async (event) => {
    setApprovingId(event.id);
    await base44.entities.Event.update(event.id, { scale_approved: true });
    queryClient.invalidateQueries(["events-approvals"]);
    queryClient.invalidateQueries(["events"]);
    queryClient.invalidateQueries(["event", event.id]);
    setApprovingId(null);
    toast.success(`Escala de "${event.name}" aprovada!`);
  };

  if (loginUser?.role !== "admin") {
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
            Escalas da cozinha aguardando sua aprovação
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
            {pending.map((event) => (
              <div key={event.id} className="bg-card border border-orange-200 rounded-2xl p-5 shadow-sm space-y-4">
                {/* Cabeçalho do evento */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-100 to-orange-200 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[10px] font-medium text-orange-600 uppercase">
                        {event.date ? format(new Date(event.date), "MMM", { locale: ptBR }) : "---"}
                      </span>
                      <span className="text-lg font-bold text-orange-700 leading-none">
                        {event.date ? format(new Date(event.date), "dd") : "--"}
                      </span>
                    </div>
                    <div>
                      <h2 className="font-bold text-base">{event.name}</h2>
                      {event.location && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-full shrink-0">
                    🍳 Cozinha
                  </span>
                </div>

                {/* Botão download Excel */}
                {event.scale_csv_url && (
                  <a
                    href={event.scale_csv_url}
                    download
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full h-10 border border-orange-300 bg-orange-50 text-orange-700 rounded-xl text-sm font-medium transition-colors hover:bg-orange-100"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Ver Excel da Escala
                  </a>
                )}

                {/* Botão aprovar */}
                <Button
                  onClick={() => handleApprove(event)}
                  disabled={approvingId === event.id}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-2"
                >
                  {approvingId === event.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  {approvingId === event.id ? "Aprovando..." : "Aprovar Escala"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
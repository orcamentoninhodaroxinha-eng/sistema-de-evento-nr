import { useNavigate } from "react-router-dom";
import { ClipboardCheck, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import PageTransition from "@/components/PageTransition";

export default function AprovadorHome() {
  const navigate = useNavigate();

  const { data: events } = useQuery({
    queryKey: ["events-approvals"],
    queryFn: () => base44.entities.Event.list("-date", 100),
    refetchInterval: 30000,
  });

  const pendingCount = (events || []).filter(ev =>
    (ev.scale_submitted && !ev.scale_approved) ||
    (ev.salao_submitted && !ev.salao_approved)
  ).length;

  return (
    <PageTransition>
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-6 px-4">
        <div className="text-center mb-2">
          <h1 className="text-2xl font-bold tracking-tight">Olá, AndreM 👋</h1>
          <p className="text-muted-foreground text-sm mt-1">O que deseja fazer?</p>
        </div>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <button
            onClick={() => navigate("/approvals")}
            className="relative flex items-center gap-4 bg-white border-2 border-primary/30 hover:border-primary rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="font-bold text-base text-foreground">Aprovações</p>
              <p className="text-xs text-muted-foreground mt-0.5">Ver escalas aguardando aprovação</p>
            </div>
            {pendingCount > 0 && (
              <span className="absolute top-3 right-3 bg-orange-500 text-white text-xs font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            onClick={() => navigate("/finance")}
            className="flex items-center gap-4 bg-white border-2 border-blue-200 hover:border-blue-400 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-base text-foreground">Dashboard Financeiro</p>
              <p className="text-xs text-muted-foreground mt-0.5">Acompanhar escala vs orçamento</p>
            </div>
          </button>
        </div>
      </div>
    </PageTransition>
  );
}
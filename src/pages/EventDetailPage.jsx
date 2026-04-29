import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EventDetail from "../components/EventDetail";
import { useLoginUser } from "@/hooks/useLoginUser";
import { Loader2 } from "lucide-react";

export default function EventDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      if (location.state?.event) return location.state.event;
      const events = await base44.entities.Event.list("created_date", 500);
      return events.find(e => e.id === id);
    },
  });

  const loginUser = useLoginUser();
  const isJuberly = loginUser?.role === "cozinha";

  // Juberly não pode acessar eventos concluídos
  if (!isLoading && event && isJuberly && event.status === "Concluído") {
    navigate("/");
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) return <p className="text-center py-10 text-muted-foreground">Evento não encontrado.</p>;

  return (
    <EventDetail
      event={event}
      onBack={() => navigate(-1)}
      onRefresh={() => {
        queryClient.invalidateQueries(["events"]);
        queryClient.invalidateQueries(["event", id]);
      }}
    />
  );
}
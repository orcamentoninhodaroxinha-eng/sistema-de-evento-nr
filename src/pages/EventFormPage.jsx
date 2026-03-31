import { useParams, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import EventForm from "../components/EventForm";
import { Loader2 } from "lucide-react";

export default function EventFormPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id && id !== "new";

  const { data: event, isLoading } = useQuery({
    queryKey: ["event", id],
    enabled: isEditing,
    queryFn: async () => {
      if (location.state?.event) return location.state.event;
      const events = await base44.entities.Event.list("created_date", 500);
      return events.find(e => e.id === id);
    },
  });

  if (isEditing && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <EventForm
      event={isEditing ? event : null}
      onClose={() => navigate(-1)}
      onSave={() => {
        queryClient.invalidateQueries(["events"]);
        navigate("/");
      }}
    />
  );
}
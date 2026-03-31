import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  CalendarDays, Plus, MapPin, Users, Search, Loader2, 
  ChevronRight, MoreVertical, Trash2, Edit, CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import EventForm from "../components/EventForm";
import EventDetail from "../components/EventDetail";

function EventCard({ event, statusColors, onSelect, onEdit, onDelete, onFinish }) {
  return (
    <button
      onClick={() => onSelect(event)}
      className="w-full text-left bg-white rounded-2xl border border-border/60 p-4 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300 group"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-purple-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary/70 uppercase">
            {event.date ? format(new Date(event.date), "MMM", { locale: ptBR }) : "---"}
          </span>
          <span className="text-lg font-bold text-primary leading-none">
            {event.date ? format(new Date(event.date), "dd") : "--"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {event.name}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[event.status] || statusColors.Planejado}`}>
              {event.status || "Planejado"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-sm text-muted-foreground">
            {event.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {event.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {event.employees?.length || 0} funcionário(s)
            </span>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
              <MoreVertical className="w-4 h-4 text-muted-foreground" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => onEdit(event, e)}>
              <Edit className="w-4 h-4 mr-2" />
              Editar
            </DropdownMenuItem>
            {event.status !== "Concluído" && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFinish(event); }} className="text-emerald-600">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Finalizar Evento
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={(e) => onDelete(event, e)} className="text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </button>
  );
}

export default function Events() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  const handleDelete = async (event, e) => {
    e.stopPropagation();
    if (confirm(`Excluir o evento "${event.name}"?`)) {
      await base44.entities.Event.delete(event.id);
      queryClient.invalidateQueries(["events"]);
    }
  };

  const handleEdit = (event, e) => {
    e.stopPropagation();
    setEditingEvent(event);
    setShowForm(true);
  };

  const handleFinish = async (event) => {
    if (confirm(`Finalizar o evento "${event.name}"?`)) {
      await base44.entities.Event.update(event.id, { status: "Concluído" });
      queryClient.invalidateQueries(["events"]);
    }
  };

  const filtered = (events || []).filter((ev) => {
    const q = search.toLowerCase();
    return (
      ev.name?.toLowerCase().includes(q) ||
      ev.location?.toLowerCase().includes(q)
    );
  });

  const activeEvents = filtered.filter(ev => ev.status !== "Concluído");
  const finishedEvents = filtered.filter(ev => ev.status === "Concluído");

  const statusColors = {
    "Planejado": "bg-blue-50 text-blue-700 border-blue-200",
    "Em Andamento": "bg-amber-50 text-amber-700 border-amber-200",
    "Concluído": "bg-emerald-50 text-emerald-700 border-emerald-200",
    "Cancelado": "bg-slate-50 text-slate-500 border-slate-200",
  };

  if (showForm) {
    return (
      <EventForm 
        event={editingEvent}
        onClose={() => {
          setShowForm(false);
          setEditingEvent(null);
        }} 
        onSave={() => {
          queryClient.invalidateQueries(["events"]);
          setShowForm(false);
          setEditingEvent(null);
        }}
      />
    );
  }

  if (selectedEvent) {
    return (
      <EventDetail 
        event={selectedEvent} 
        onBack={() => setSelectedEvent(null)}
        onRefresh={() => queryClient.invalidateQueries(["events"])}
      />
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Eventos
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie eventos e aloque funcionários
            </p>
          </div>
          <Button
            onClick={() => setShowForm(true)}
            className="gap-2 h-11 px-6 bg-gradient-to-r from-primary to-purple-600 rounded-xl font-semibold shadow-lg shadow-primary/30"
          >
            <Plus className="w-4 h-4" />
            Novo Evento
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar evento por nome ou local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-2xl bg-white border-border/50 shadow-sm"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-8">
          {activeEvents.length > 0 && (
            <div>
              <div className="grid gap-3">
                {activeEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    statusColors={statusColors}
                    onSelect={setSelectedEvent}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onFinish={handleFinish}
                  />
                ))}
              </div>
            </div>
          )}

          {finishedEvents.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-2">
                  Eventos Finalizados ({finishedEvents.length})
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="grid gap-3 opacity-70">
                {finishedEvents.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    statusColors={statusColors}
                    onSelect={setSelectedEvent}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onFinish={handleFinish}
                  />
                ))}
              </div>
            </div>
          )}

          {activeEvents.length === 0 && finishedEvents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                <CalendarDays className="w-8 h-8 text-primary/40" />
              </div>
              <h3 className="font-semibold text-lg">Nenhum evento encontrado</h3>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
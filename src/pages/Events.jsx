import { useState, useEffect } from "react";
import { useLoginUser } from "@/hooks/useLoginUser";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import PullToRefresh from "@/components/PullToRefresh";
import PageTransition from "@/components/PageTransition";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, MapPin, Users, Search, Loader2,
  MoreVertical, Trash2, CheckCircle2, Plus, ChevronUp, ChevronDown, FileDown
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

const statusColors = {
  "Planejado": "bg-blue-50 text-blue-700 border-blue-200",
  "Em Andamento": "bg-amber-50 text-amber-700 border-amber-200",
  "Concluído": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Cancelado": "bg-slate-50 text-slate-500 border-slate-200",
};

function EventCard({ event, onClick, onEdit, onDelete, onFinish, isAdmin }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl border border-border/60 p-4 hover:shadow-xl hover:shadow-black/5 hover:-translate-y-0.5 hover:border-primary/20 transition-all duration-300 group"
    >
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/10 to-purple-100 flex flex-col items-center justify-center shrink-0">
          <span className="text-xs font-medium text-primary/70 uppercase">
            {event.date ? format(new Date(event.date + "T12:00:00"), "MMM", { locale: ptBR }) : "---"}
          </span>
          <span className="text-lg font-bold text-primary leading-none">
            {event.date ? format(new Date(event.date + "T12:00:00"), "dd") : "--"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
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
          {event.receipts_pdf_url && (
            <a
              href={event.receipts_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5" />
              Baixar PDF dos Recibos
            </a>
          )}
        </div>
        {isAdmin && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {event.status !== "Concluído" && (
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onFinish(event); }} className="text-emerald-600">
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Finalizar Evento
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDelete(event); }} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        </div>
    </button>
  );
}

export default function Events() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("proximos");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const loginUser = useLoginUser();

  useEffect(() => {
    if (loginUser?.role === "aprovador") {
      navigate("/approvals", { replace: true });
    }
  }, [loginUser, navigate]);

  const { data: events, isLoading } = useQuery({
    queryKey: ["events"],
    queryFn: () => base44.entities.Event.list("-date", 100),
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [search, activeTab]);

  const handleDelete = async (event) => {
    if (confirm(`Excluir o evento "${event.name}"?`)) {
      await base44.entities.Event.delete(event.id);
      queryClient.invalidateQueries(["events"]);
    }
  };

  const handleFinish = async (event) => {
    if (confirm(`Finalizar o evento "${event.name}"?`)) {
      await base44.entities.Event.update(event.id, { status: "Concluído" });
      queryClient.invalidateQueries(["events"]);
    }
  };

  const filtered = (events || []).filter((ev) => {
    const q = search.toLowerCase();
    return ev.name?.toLowerCase().includes(q) || ev.location?.toLowerCase().includes(q);
  });

  const activeEvents = filtered.filter(ev => ev.status !== "Concluído");
  const finishedEvents = filtered.filter(ev => ev.status === "Concluído");

  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedActiveEvents = activeEvents.slice(startIndex, startIndex + itemsPerPage);
  const displayedFinishedEvents = finishedEvents.slice(startIndex, startIndex + itemsPerPage);
  const totalActivePages = Math.ceil(activeEvents.length / itemsPerPage);
  const totalFinishedPages = Math.ceil(finishedEvents.length / itemsPerPage);

  const isAdmin = loginUser?.role === 'admin';

  return (
    <PageTransition>
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries(["events"])}>
    <div>
      <div className="mb-4">
        <div className="flex flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Eventos
              </h1>
              <p className="text-muted-foreground mt-0.5 text-xs">Gerencie eventos e aloque funcionários</p>
            </div>
            {isAdmin && (
              <Button
                onClick={() => navigate("/events/new")}
                className="gap-2 h-11 rounded-xl font-semibold"
              >
                <Plus className="w-4 h-4" />
                Novo Evento
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar evento por nome ou local..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-2xl bg-white border-border/50 shadow-sm"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="proximos" className="flex items-center gap-2">
              Próximos Eventos
              {activeEvents.length > 0 && <span className="text-xs font-semibold bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">{activeEvents.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="concluidos" className="flex items-center gap-2">
              Concluídos
              {finishedEvents.length > 0 && <span className="text-xs font-semibold bg-muted text-muted-foreground rounded-full w-5 h-5 flex items-center justify-center">{finishedEvents.length}</span>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="proximos" className="space-y-3">
            {displayedActiveEvents.length > 0 ? (
              <>
                <div className="grid gap-3">
                  {displayedActiveEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => navigate(`/events/${event.id}`, { state: { event } })}
                      onEdit={(ev) => navigate(`/events/${ev.id}/edit`, { state: { event: ev } })}
                      onDelete={handleDelete}
                      onFinish={handleFinish}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
                {totalActivePages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} de {totalActivePages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalActivePages, p + 1))}
                      disabled={currentPage === totalActivePages}
                      className="rounded-lg"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum evento agendado</h3>
              </div>
            )}
          </TabsContent>

          <TabsContent value="concluidos" className="space-y-3">
            {displayedFinishedEvents.length > 0 ? (
              <>
                <div className="grid gap-3">
                  {displayedFinishedEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onClick={() => navigate(`/events/${event.id}`, { state: { event } })}
                      onEdit={(ev) => navigate(`/events/${ev.id}/edit`, { state: { event: ev } })}
                      onDelete={handleDelete}
                      onFinish={handleFinish}
                      isAdmin={isAdmin}
                    />
                  ))}
                </div>
                {totalFinishedPages > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-6 pt-4 border-t border-border">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="rounded-lg"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {currentPage} de {totalFinishedPages}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(p => Math.min(totalFinishedPages, p + 1))}
                      disabled={currentPage === totalFinishedPages}
                      className="rounded-lg"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
                  <CalendarDays className="w-8 h-8 text-primary/40" />
                </div>
                <h3 className="font-semibold text-lg">Nenhum evento concluído</h3>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
    </PullToRefresh>
    </PageTransition>
  );
}
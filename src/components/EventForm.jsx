import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { toast } from "@/components/ui/use-toast";

const STATUSES = ["Planejado", "Em Andamento", "Concluído", "Cancelado"];

export default function EventForm({ event, onClose, onSave }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: event?.name || "",
    date: event?.date || "",
    location: event?.location || "",
    description: event?.description || "",
    status: event?.status || "Planejado",
    employees: event?.employees || [],
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.date) {
      toast({ title: "Preencha nome e data do evento", variant: "destructive" });
      return;
    }

    setSaving(true);
    if (event?.id) {
      await base44.entities.Event.update(event.id, form);
      toast({ title: "Evento atualizado!" });
    } else {
      await base44.entities.Event.create(form);
      toast({ title: "Evento criado!" });
    }
    setSaving(false);
    onSave();
  };

  return (
    <div className="max-w-lg mx-auto">
      <Button
        variant="ghost"
        onClick={onClose}
        className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {event ? "Editar Evento" : "Novo Evento"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {event ? "Atualize as informações do evento" : "Preencha os dados do evento"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm">
        <div>
          <Label htmlFor="name">Nome do Evento *</Label>
          <Input
            id="name"
            placeholder="Ex: Casamento João & Maria"
            value={form.name}
            onChange={(e) => updateField("name", e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={form.date}
              onChange={(e) => updateField("date", e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Status</Label>
            <select
              value={form.status}
              onChange={(e) => updateField("status", e.target.value)}
              className="mt-1.5 flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <Label htmlFor="location">Local</Label>
          <Input
            id="location"
            placeholder="Ex: Buffet Villa Rosa"
            value={form.location}
            onChange={(e) => updateField("location", e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            placeholder="Detalhes sobre o evento..."
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            className="mt-1.5 min-h-[100px]"
          />
        </div>

        <Button
          type="submit"
          disabled={saving}
          className="w-full h-12 text-base font-semibold rounded-xl gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "Salvando..." : event ? "Salvar Alterações" : "Criar Evento"}
        </Button>
      </form>
    </div>
  );
}
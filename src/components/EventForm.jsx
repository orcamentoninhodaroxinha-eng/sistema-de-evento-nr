import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, MapPin, Loader2, Clock, Users, DollarSign } from "lucide-react";

export default function EventForm({ onSuccess, isAdmin = false }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    date: "",
    location: "",
    description: "",
    status: "Planejado",
    ceremony_start: "",
    ceremony_end: "",
    party_start: "",
    party_end: "",
    guest_count: "",
    sale_value: "",
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name || !formData.date) {
      alert("Nome e data são obrigatórios");
      return;
    }

    setLoading(true);
    try {
      await base44.entities.Event.create(formData);
      onSuccess();
    } catch (error) {
      alert("Erro ao criar evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do Evento *</Label>
        <Input
          id="name"
          placeholder="Ex: Festa de Formatura"
          value={formData.name}
          onChange={(e) => handleChange("name", e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="date">Data *</Label>
        <Input
          id="date"
          type="date"
          value={formData.date}
          onChange={(e) => handleChange("date", e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Local</Label>
        <Input
          id="location"
          placeholder="Ex: Salão Principal"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          className="h-11 rounded-xl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Detalhes do evento..."
          value={formData.description}
          onChange={(e) => handleChange("description", e.target.value)}
          className="rounded-xl min-h-24"
        />
      </div>

      {/* Horários */}
      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Horários da Cerimônia</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="ceremony_start" className="text-xs text-muted-foreground">Início</Label>
            <Input id="ceremony_start" type="time" value={formData.ceremony_start} onChange={(e) => handleChange("ceremony_start", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="ceremony_end" className="text-xs text-muted-foreground">Término</Label>
            <Input id="ceremony_end" type="time" value={formData.ceremony_end} onChange={(e) => handleChange("ceremony_end", e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Horários da Festa</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="party_start" className="text-xs text-muted-foreground">Início</Label>
            <Input id="party_start" type="time" value={formData.party_start} onChange={(e) => handleChange("party_start", e.target.value)} className="h-10 rounded-xl" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="party_end" className="text-xs text-muted-foreground">Término</Label>
            <Input id="party_end" type="time" value={formData.party_end} onChange={(e) => handleChange("party_end", e.target.value)} className="h-10 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="guest_count" className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Nº de Convidados</Label>
        <Input id="guest_count" type="number" placeholder="Ex: 200" value={formData.guest_count} onChange={(e) => handleChange("guest_count", e.target.value)} className="h-11 rounded-xl" />
      </div>

      {isAdmin && (
        <div className="space-y-2">
          <Label htmlFor="sale_value" className="flex items-center gap-1.5 text-emerald-700">
            <DollarSign className="w-3.5 h-3.5" /> Valor de Venda do Evento <span className="text-xs text-muted-foreground">(apenas você vê)</span>
          </Label>
          <Input
            id="sale_value"
            placeholder="Ex: 15000"
            value={formData.sale_value}
            onChange={(e) => handleChange("sale_value", e.target.value)}
            className="h-11 rounded-xl border-emerald-200 focus-visible:ring-emerald-400"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
          <SelectTrigger className="h-11 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Planejado">Planejado</SelectItem>
            <SelectItem value="Em Andamento">Em Andamento</SelectItem>
            <SelectItem value="Concluído">Concluído</SelectItem>
            <SelectItem value="Cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-3 pt-4">
        <Button
          type="submit"
          disabled={loading}
          className="flex-1 h-11 rounded-xl font-semibold gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Criando..." : "Criar Evento"}
        </Button>
      </div>
    </form>
  );
}
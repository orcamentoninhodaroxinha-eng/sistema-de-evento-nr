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
import { toast } from "@/components/ui/use-toast";

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
    after_start: "",
    after_end: "",
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
      const created = await base44.entities.Event.create(formData);
      await base44.functions.invoke("sendPushNotification", {
        title: "📅 Novo Evento Criado",
        body: `O evento "${formData.name}" foi criado${formData.date ? ` para ${formData.date}` : ""}.`,
        target_roles: ["admin", "cozinha", "salao", "aprovador"],
      });
      toast({ title: "✅ Evento criado!", description: `"${formData.name}" foi criado e todos foram notificados.` });
      onSuccess();
    } catch (error) {
      alert("Erro ao criar evento");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Nome + Data lado a lado no mobile */}
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label htmlFor="name" className="text-xs font-semibold">Nome do Evento *</Label>
          <Input
            id="name"
            placeholder="Ex: Festa de Formatura"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="h-9 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="date" className="text-xs font-semibold">Data *</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="h-9 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="guest_count" className="text-xs font-semibold flex items-center gap-1"><Users className="w-3 h-3" /> Convidados</Label>
          <Input id="guest_count" type="number" placeholder="Ex: 200" value={formData.guest_count} onChange={(e) => handleChange("guest_count", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="location" className="text-xs font-semibold">Local</Label>
        <Input
          id="location"
          placeholder="Ex: Salão Principal"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          className="h-9 rounded-lg text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="description" className="text-xs font-semibold">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Cada frase em uma linha. Ex: Cerimônia às 18h. Jantar às 20h."
          value={formData.description}
          onChange={(e) => {
            const val = e.target.value;
            // Se o último caractere digitado é ".", adiciona nova linha automaticamente
            if (val.endsWith(". ") || (val.endsWith(".") && val.length > (formData.description || "").length)) {
              handleChange("description", val + "\n");
            } else {
              handleChange("description", val);
            }
          }}
          className="rounded-lg text-sm min-h-[80px]"
        />
      </div>

      {/* Horários em grid compacto */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Cerimônia início</Label>
          <Input id="ceremony_start" type="time" value={formData.ceremony_start} onChange={(e) => handleChange("ceremony_start", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Cerimônia fim</Label>
          <Input id="ceremony_end" type="time" value={formData.ceremony_end} onChange={(e) => handleChange("ceremony_end", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Festa início</Label>
          <Input id="party_start" type="time" value={formData.party_start} onChange={(e) => handleChange("party_start", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Festa fim</Label>
          <Input id="party_end" type="time" value={formData.party_end} onChange={(e) => handleChange("party_end", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1">🎶 After início</Label>
          <Input id="after_start" type="time" value={formData.after_start} onChange={(e) => handleChange("after_start", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1">🎶 After fim</Label>
          <Input id="after_end" type="time" value={formData.after_end} onChange={(e) => handleChange("after_end", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
      </div>

      {isAdmin && (
        <div className="space-y-1">
          <Label htmlFor="sale_value" className="text-xs font-semibold flex items-center gap-1 text-emerald-700">
            <DollarSign className="w-3 h-3" /> Valor de Venda <span className="text-muted-foreground font-normal">(só você vê)</span>
          </Label>
          <Input
            id="sale_value"
            placeholder="Ex: 15000"
            value={formData.sale_value}
            onChange={(e) => handleChange("sale_value", e.target.value)}
            className="h-9 rounded-lg text-sm border-emerald-200 focus-visible:ring-emerald-400"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 items-end">
        <div className="space-y-1">
          <Label htmlFor="status" className="text-xs font-semibold">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
            <SelectTrigger className="h-9 rounded-lg text-sm">
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
        <Button
          type="submit"
          disabled={loading}
          className="h-9 rounded-lg font-semibold gap-2 text-sm"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {loading ? "Criando..." : "Criar Evento"}
        </Button>
      </div>
    </form>
  );
}
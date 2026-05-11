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
import { Clock, Users, DollarSign, Loader2, Save, X } from "lucide-react";
import { toast } from "@/components/ui/use-toast";

export default function EventEditForm({ event, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: event.name || "",
    date: event.date || "",
    location: event.location || "",
    description: event.description || "",
    status: event.status || "Planejado",
    ceremony_start: event.ceremony_start || "",
    ceremony_end: event.ceremony_end || "",
    party_start: event.party_start || "",
    party_end: event.party_end || "",
    guest_count: event.guest_count || "",
    sale_value: event.sale_value || "",
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
    await base44.entities.Event.update(event.id, formData);
    toast({ title: "✅ Evento atualizado com sucesso!" });
    setLoading(false);
    onSuccess(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="col-span-2 space-y-1">
          <Label className="text-xs font-semibold">Nome do Evento *</Label>
          <Input
            placeholder="Ex: Festa de Formatura"
            value={formData.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="h-9 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold">Data *</Label>
          <Input
            type="date"
            value={formData.date}
            onChange={(e) => handleChange("date", e.target.value)}
            className="h-9 rounded-lg text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Users className="w-3 h-3" /> Convidados</Label>
          <Input
            type="number"
            placeholder="Ex: 200"
            value={formData.guest_count}
            onChange={(e) => handleChange("guest_count", e.target.value)}
            className="h-9 rounded-lg text-sm"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Local</Label>
        <Input
          placeholder="Ex: Salão Principal"
          value={formData.location}
          onChange={(e) => handleChange("location", e.target.value)}
          className="h-9 rounded-lg text-sm"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Descrição</Label>
        <Textarea
          placeholder="Cada frase em uma linha. Ex: Cerimônia às 18h. Jantar às 20h."
          value={formData.description}
          onChange={(e) => {
            const val = e.target.value;
            if (val.endsWith(".") && val.length > (formData.description || "").length) {
              handleChange("description", val + "\n");
            } else {
              handleChange("description", val);
            }
          }}
          className="rounded-lg text-sm min-h-[80px]"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Cerimônia início</Label>
          <Input type="time" value={formData.ceremony_start} onChange={(e) => handleChange("ceremony_start", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Cerimônia fim</Label>
          <Input type="time" value={formData.ceremony_end} onChange={(e) => handleChange("ceremony_end", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Festa início</Label>
          <Input type="time" value={formData.party_start} onChange={(e) => handleChange("party_start", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-semibold flex items-center gap-1"><Clock className="w-3 h-3" /> Festa fim</Label>
          <Input type="time" value={formData.party_end} onChange={(e) => handleChange("party_end", e.target.value)} className="h-9 rounded-lg text-sm" />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold flex items-center gap-1 text-emerald-700">
          <DollarSign className="w-3 h-3" /> Valor de Venda
        </Label>
        <Input
          placeholder="Ex: 15000"
          value={formData.sale_value}
          onChange={(e) => handleChange("sale_value", e.target.value)}
          className="h-9 rounded-lg text-sm border-emerald-200 focus-visible:ring-emerald-400"
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs font-semibold">Status</Label>
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

      <div className="flex gap-2 pt-1">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1 h-9 rounded-lg gap-2 text-sm">
          <X className="w-4 h-4" />
          Cancelar
        </Button>
        <Button type="submit" disabled={loading} className="flex-1 h-9 rounded-lg font-semibold gap-2 text-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {loading ? "Salvando..." : "Salvar"}
        </Button>
      </div>
    </form>
  );
}
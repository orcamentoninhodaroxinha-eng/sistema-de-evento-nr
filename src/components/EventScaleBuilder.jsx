import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const KITCHEN_ROLES = ["cozinheiro", "cozinheira", "ajudante", "auxiliar", "cozinha"];

function isKitchenRole(role = "") {
  return KITCHEN_ROLES.some(r => role.toLowerCase().includes(r));
}

export default function EventScaleBuilder({ event, onBack }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [funcao, setFuncao] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const listRef = useRef(null);
  const scaleListRef = useRef(null);
  const dragStart = useRef(null);
  const scaleDragStart = useRef(null);

  const handleListTouchStart = (e) => {
    dragStart.current = e.touches[0].clientY;
  };
  const handleListTouchMove = (e) => {
    if (dragStart.current === null || !listRef.current) return;
    const dy = dragStart.current - e.touches[0].clientY;
    listRef.current.scrollTop += dy * 0.6;
    dragStart.current = e.touches[0].clientY;
  };

  const handleScaleTouchStart = (e) => {
    scaleDragStart.current = e.touches[0].clientY;
  };
  const handleScaleTouchMove = (e) => {
    if (scaleDragStart.current === null || !scaleListRef.current) return;
    const dy = scaleDragStart.current - e.touches[0].clientY;
    scaleListRef.current.scrollTop += dy * 0.6;
    scaleDragStart.current = e.touches[0].clientY;
  };

  // Escala salva no evento (array de objetos: { employeeId, full_name, funcao, valor })
  const [scale, setScale] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`juberly_scale_${event.id}`)) || [];
    } catch { return []; }
  });

  const { data: allEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("full_name", 500),
  });

  const kitchenEmployees = (allEmployees || []).filter(emp =>
    isKitchenRole(emp.role) &&
    !scale.find(s => s.employeeId === emp.id) &&
    (emp.full_name?.toLowerCase().includes(search.toLowerCase()) ||
     emp.role?.toLowerCase().includes(search.toLowerCase()))
  );

  const openAdd = (emp) => {
    setSelectedEmp(emp);
    setFuncao(emp.role || "");
    setValor("");
    setShowDialog(true);
  };

  const handleAdd = () => {
    if (!funcao || !valor) {
      toast.error("Preencha função e valor");
      return;
    }
    const newScale = [...scale, {
      employeeId: selectedEmp.id,
      full_name: selectedEmp.full_name,
      role: selectedEmp.role,
      funcao,
      valor,
    }];
    setScale(newScale);
    localStorage.setItem(`juberly_scale_${event.id}`, JSON.stringify(newScale));
    setShowDialog(false);
    toast(`${selectedEmp.full_name} adicionado(a) à escala!`, { duration: 1000 });
  };

  const handleRemove = (employeeId) => {
    const newScale = scale.filter(s => s.employeeId !== employeeId);
    setScale(newScale);
    localStorage.setItem(`juberly_scale_${event.id}`, JSON.stringify(newScale));
  };

  const handleSave = async () => {
    setSaving(true);
    // Salva os IDs dos funcionários no evento
    const ids = scale.map(s => s.employeeId);
    await base44.entities.Event.update(event.id, { employees: ids });
    queryClient.invalidateQueries(["events"]);
    queryClient.invalidateQueries(["event", event.id]);
    setSaving(false);
    toast.success("Escala salva com sucesso!");
    onBack();
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">Criar Escala</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {event.name} — {event.date ? format(new Date(event.date), "dd/MM/yyyy") : ""}
        </p>
      </div>

      {/* Escala atual */}
      {scale.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-3 mb-4 shadow-sm">
          <h2 className="font-semibold mb-2 text-xs text-muted-foreground uppercase tracking-wide">Equipe na Escala ({scale.length})</h2>
          <div
            ref={scaleListRef}
            className="space-y-1 max-h-48 overflow-y-auto"
            onTouchStart={handleScaleTouchStart}
            onTouchMove={handleScaleTouchMove}
          >
            {scale.map((emp) => (
              <div key={emp.employeeId} className="flex items-center gap-2 bg-muted/40 rounded-lg px-2 py-1.5">
                <div className="w-6 h-6 rounded-md bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {emp.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.funcao} — <span className="text-emerald-700 font-medium">R$ {emp.valor}</span></p>
                </div>
                <button onClick={() => handleRemove(emp.employeeId)} className="text-destructive/60 hover:text-destructive p-0.5 shrink-0">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full mt-4 gap-2 rounded-xl">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Escala no Evento"}
          </Button>
        </div>
      )}

      {/* Buscar e adicionar */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
        <h2 className="font-semibold mb-3">Adicionar Funcionário da Cozinha</h2>
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou função..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div
          ref={listRef}
          className="space-y-2 max-h-80 overflow-y-auto"
          onTouchStart={handleListTouchStart}
          onTouchMove={handleListTouchMove}
        >
          {kitchenEmployees.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {search ? "Nenhum funcionário encontrado" : "Todos os funcionários de cozinha já foram adicionados"}
            </p>
          ) : (
            kitchenEmployees.map(emp => (
              <button
                key={emp.id}
                onClick={() => openAdd(emp)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-accent transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-orange-100 to-orange-200 flex items-center justify-center text-xs font-bold text-orange-700 shrink-0">
                  {emp.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground">{emp.role}</p>
                </div>
                <Plus className="w-4 h-4 text-muted-foreground" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Dialog para função e valor */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar à Escala</DialogTitle>
          </DialogHeader>
          {selectedEmp && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center text-xs font-bold text-primary">
                  {selectedEmp.full_name?.charAt(0).toUpperCase()}
                </div>
                <p className="font-semibold text-sm">{selectedEmp.full_name}</p>
              </div>

              <div className="space-y-1.5">
                <Label>Função no Evento</Label>
                <Input
                  placeholder="Ex: Cozinheira, Ajudante..."
                  value={funcao}
                  onChange={e => setFuncao(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Valor do Extra (R$)</Label>
                <Input
                  placeholder="Ex: 150,00"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  type="text"
                />
              </div>

              <Button onClick={handleAdd} className="w-full">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar à Escala
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
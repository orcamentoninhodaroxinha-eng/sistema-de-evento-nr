import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Package, AlertTriangle, ArrowUp, ArrowDown, SlidersHorizontal, Trash2, History, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLoginUser } from "@/hooks/useLoginUser";

const CATEGORIES = ["Grãos e Cereais", "Farinhas e Amidos", "Açúcares e Adoçantes", "Óleos e Gorduras", "Temperos e Condimentos", "Enlatados e Conservas", "Massas e Biscoitos", "Outros"];
const UNITS = ["kg", "g", "L", "ml", "un", "cx", "pct", "sc"];

export default function Stock() {
  const loginUser = useLoginUser();
  const isAdmin = loginUser?.role === "admin";
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showItemDialog, setShowItemDialog] = useState(false);
  const [showMovDialog, setShowMovDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemForm, setItemForm] = useState({ name: "", category: "Outros", unit: "kg", quantity: "", min_quantity: "", notes: "" });
  const [movForm, setMovForm] = useState({ type: "entrada", quantity: "", reason: "" });

  const { data: items = [] } = useQuery({
    queryKey: ["stock-items"],
    queryFn: () => base44.entities.StockItem.list("name", 500),
  });

  const { data: movements = [] } = useQuery({
    queryKey: ["stock-movements"],
    queryFn: () => base44.entities.StockMovement.list("-created_date", 200),
    enabled: showHistoryDialog,
  });

  const filtered = items.filter(item => {
    const matchSearch = item.name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || item.category === filterCategory;
    return matchSearch && matchCat;
  });

  const lowStock = items.filter(i => i.min_quantity > 0 && i.quantity <= i.min_quantity);

  const openAdd = () => {
    setEditingItem(null);
    setItemForm({ name: "", category: "Outros", unit: "kg", quantity: "", min_quantity: "", notes: "" });
    setShowItemDialog(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setItemForm({ name: item.name, category: item.category || "Outros", unit: item.unit, quantity: item.quantity, min_quantity: item.min_quantity || "", notes: item.notes || "" });
    setShowItemDialog(true);
  };

  const handleSaveItem = async () => {
    if (!itemForm.name || itemForm.quantity === "") { toast.error("Preencha nome e quantidade"); return; }
    const data = { ...itemForm, quantity: parseFloat(itemForm.quantity) || 0, min_quantity: parseFloat(itemForm.min_quantity) || 0 };
    if (editingItem) {
      await base44.entities.StockItem.update(editingItem.id, data);
      toast.success("Item atualizado!");
    } else {
      await base44.entities.StockItem.create(data);
      toast.success("Item cadastrado!");
    }
    queryClient.invalidateQueries(["stock-items"]);
    setShowItemDialog(false);
  };

  const openMovement = (item) => {
    setSelectedItem(item);
    setMovForm({ type: "entrada", quantity: "", reason: "" });
    setShowMovDialog(true);
  };

  const handleMovement = async () => {
    if (!movForm.quantity || parseFloat(movForm.quantity) <= 0) { toast.error("Informe a quantidade"); return; }
    const qty = parseFloat(movForm.quantity);
    let newQty = selectedItem.quantity;
    if (movForm.type === "entrada") newQty += qty;
    else if (movForm.type === "saida") newQty = Math.max(0, newQty - qty);
    else newQty = qty;

    await base44.entities.StockItem.update(selectedItem.id, { quantity: newQty });
    await base44.entities.StockMovement.create({
      item_id: selectedItem.id,
      item_name: selectedItem.name,
      type: movForm.type,
      quantity: qty,
      reason: movForm.reason,
    });
    queryClient.invalidateQueries(["stock-items"]);
    queryClient.invalidateQueries(["stock-movements"]);
    toast.success("Movimentação registrada!");
    setShowMovDialog(false);
  };

  const handleDelete = async (item) => {
    if (!confirm(`Excluir "${item.name}"?`)) return;
    await base44.entities.StockItem.delete(item.id);
    queryClient.invalidateQueries(["stock-items"]);
    toast.success("Item removido!");
  };

  const itemHistory = selectedItem ? movements.filter(m => m.item_id === selectedItem.id) : movements;

  return (
    <div className="max-w-3xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6 text-primary" /> Estoque Seco
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{items.length} itens cadastrados</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setSelectedItem(null); setShowHistoryDialog(true); }} className="gap-1.5">
            <History className="w-4 h-4" /> Histórico
          </Button>
          {isAdmin && (
            <Button size="sm" onClick={openAdd} className="gap-1.5">
              <Plus className="w-4 h-4" /> Novo Item
            </Button>
          )}
        </div>
      </div>

      {/* Alerta de estoque baixo */}
      {lowStock.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3 mb-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">⚠️ {lowStock.length} item(ns) com estoque baixo:</p>
            <p className="text-xs text-amber-700 mt-0.5">{lowStock.map(i => i.name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar item..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48">
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de itens */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12 text-sm">Nenhum item encontrado</p>
        )}
        {filtered.map(item => {
          const isLow = item.min_quantity > 0 && item.quantity <= item.min_quantity;
          return (
            <div key={item.id} className={`bg-card border rounded-2xl px-4 py-3 flex items-center gap-3 ${isLow ? "border-amber-300 bg-amber-50/50" : "border-border"}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isLow ? "bg-amber-100" : "bg-primary/10"}`}>
                <Package className={`w-5 h-5 ${isLow ? "text-amber-600" : "text-primary"}`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm truncate">{item.name}</p>
                  {isLow && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">BAIXO</span>}
                </div>
                <p className="text-xs text-muted-foreground">{item.category}</p>
              </div>
              <div className="text-right shrink-0 mr-2">
                <p className={`font-bold text-base ${isLow ? "text-amber-700" : "text-foreground"}`}>
                  {item.quantity} <span className="text-xs font-normal text-muted-foreground">{item.unit}</span>
                </p>
                {item.min_quantity > 0 && (
                  <p className="text-[10px] text-muted-foreground">mín: {item.min_quantity} {item.unit}</p>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={() => openMovement(item)} className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-700 transition-colors" title="Movimentar">
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
                {isAdmin && (
                  <>
                    <button onClick={() => openEdit(item)} className="w-8 h-8 rounded-lg bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors" title="Editar">
                      <Package className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(item)} className="w-8 h-8 rounded-lg bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center text-destructive transition-colors" title="Excluir">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Dialog: Cadastrar/Editar Item */}
      <Dialog open={showItemDialog} onOpenChange={setShowItemDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Editar Item" : "Novo Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Nome *</Label>
              <Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Arroz, Farinha de Trigo..." />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Categoria</Label>
                <Select value={itemForm.category} onValueChange={v => setItemForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Unidade</Label>
                <Select value={itemForm.unit} onValueChange={v => setItemForm(f => ({ ...f, unit: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{UNITS.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Quantidade Atual *</Label>
                <Input type="number" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" inputMode="decimal" />
              </div>
              <div>
                <Label>Estoque Mínimo</Label>
                <Input type="number" value={itemForm.min_quantity} onChange={e => setItemForm(f => ({ ...f, min_quantity: e.target.value }))} placeholder="0" inputMode="decimal" />
              </div>
            </div>
            <div>
              <Label>Observações</Label>
              <Input value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional..." />
            </div>
            <Button onClick={handleSaveItem} className="w-full">{editingItem ? "Salvar Alterações" : "Cadastrar Item"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog: Movimentação */}
      <Dialog open={showMovDialog} onOpenChange={setShowMovDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Movimentar Estoque</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-3">
              <div className="bg-muted/50 rounded-xl px-3 py-2.5">
                <p className="font-semibold text-sm">{selectedItem.name}</p>
                <p className="text-xs text-muted-foreground">Estoque atual: <strong>{selectedItem.quantity} {selectedItem.unit}</strong></p>
              </div>
              <div>
                <Label>Tipo</Label>
                <div className="flex gap-2 mt-1">
                  {[
                    { val: "entrada", label: "Entrada", icon: <ArrowUp className="w-4 h-4" />, color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
                    { val: "saida", label: "Saída", icon: <ArrowDown className="w-4 h-4" />, color: "bg-red-100 text-red-700 border-red-300" },
                    { val: "ajuste", label: "Ajuste", icon: <SlidersHorizontal className="w-4 h-4" />, color: "bg-blue-100 text-blue-700 border-blue-300" },
                  ].map(t => (
                    <button key={t.val} onClick={() => setMovForm(f => ({ ...f, type: t.val }))}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all ${movForm.type === t.val ? t.color + " ring-2 ring-offset-1 ring-current" : "border-border bg-background text-muted-foreground"}`}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>{movForm.type === "ajuste" ? "Nova Quantidade" : "Quantidade"} ({selectedItem.unit})</Label>
                <Input type="number" value={movForm.quantity} onChange={e => setMovForm(f => ({ ...f, quantity: e.target.value }))} placeholder="0" inputMode="decimal" />
              </div>
              <div>
                <Label>Motivo / Observação</Label>
                <Input value={movForm.reason} onChange={e => setMovForm(f => ({ ...f, reason: e.target.value }))} placeholder="Ex: Compra, evento, perda..." />
              </div>
              <Button onClick={handleMovement} className="w-full">Confirmar Movimentação</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog: Histórico */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><History className="w-4 h-4" /> Histórico de Movimentações</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {movements.length === 0 && <p className="text-center text-sm text-muted-foreground py-6">Nenhuma movimentação registrada</p>}
            {movements.map(m => (
              <div key={m.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.type === "entrada" ? "bg-emerald-100 text-emerald-700" : m.type === "saida" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
                  {m.type === "entrada" ? <ArrowUp className="w-3.5 h-3.5" /> : m.type === "saida" ? <ArrowDown className="w-3.5 h-3.5" /> : <SlidersHorizontal className="w-3.5 h-3.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{m.item_name}</p>
                  {m.reason && <p className="text-[10px] text-muted-foreground truncate">{m.reason}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-bold ${m.type === "entrada" ? "text-emerald-700" : m.type === "saida" ? "text-red-600" : "text-blue-700"}`}>
                    {m.type === "entrada" ? "+" : m.type === "saida" ? "-" : "="}{m.quantity}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{m.created_date ? format(new Date(m.created_date), "dd/MM HH:mm", { locale: ptBR }) : ""}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
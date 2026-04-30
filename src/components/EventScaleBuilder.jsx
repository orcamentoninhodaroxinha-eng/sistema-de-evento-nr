import { useState, useRef, useEffect } from "react";
import { useMotionValue, useTransform } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2, Save, Loader2, Search, Eye, X, ChevronLeft, CheckCircle2, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function removeAccents(str = "") {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x00-\x7F]/g, "");
}

const KITCHEN_ROLES = ["cozinheiro", "cozinheira", "ajudante", "auxiliar", "cozinha"];
const SALAO_ROLES = ["garçom", "garçonete", "garcom", "garconete", "salão", "salao", "atendente", "barman", "bartender", "recepcionista"];

function isKitchenRole(role = "") {
  return KITCHEN_ROLES.some(r => role.toLowerCase().includes(r));
}

function isSalaoRole(role = "") {
  return SALAO_ROLES.some(r => role.toLowerCase().includes(r));
}

function generateExcel(scale, eventName) {
  // Gera CSV com BOM para abrir corretamente no Excel
  const bom = "\uFEFF";
  const header = "Nome;Funcao;Valor (R$);Pix;Celular;Obs\n";
  const rows = scale.map(emp => {
    const obs = emp.isNew ? "*** FUNCIONARIO NOVO ***" : "";
    const pix = emp.pix || "";
    const celular = emp.celular || "";
    return `${removeAccents(emp.full_name)};${removeAccents(emp.funcao)};${emp.valor};${pix};${celular};${obs}`;
  }).join("\n");
  const total = scale.reduce((acc, emp) => {
    const v = parseFloat(emp.valor?.replace(",", ".")) || 0;
    return acc + v;
  }, 0);
  const totalRow = `\nTOTAL GERAL;;${total.toFixed(2).replace(".", ",")};;;`;
  const csv = bom + header + rows + totalRow;

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `escala_${eventName.replace(/\s+/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function parseCsvFromUrl(url) {
  try {
    const text = await fetch(url).then(r => r.text());
    const lines = text.trim().split("\n").slice(1); // pula header
    return lines
      .filter(l => l.trim() && !l.toUpperCase().startsWith("TOTAL"))
      .map((line, i) => {
        const parts = line.split(";");
        return {
          employeeId: `csv_${i}_${Date.now()}`,
          full_name: parts[0]?.trim() || "",
          role: "",
          funcao: parts[1]?.trim() || "",
          valor: parts[2]?.trim() || "",
        };
      });
  } catch {
    return [];
  }
}

export default function EventScaleBuilder({ event, area = "cozinha", onBack }) {
  const isSalao = area === "salao";
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [funcao, setFuncao] = useState("");
  const [valor, setValor] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingCsv, setLoadingCsv] = useState(false);
  const [showNewEmpDialog, setShowNewEmpDialog] = useState(false);
  const [newEmpName, setNewEmpName] = useState("");
  const [newEmpPix, setNewEmpPix] = useState("");
  const [newEmpCelular, setNewEmpCelular] = useState("");
  const [newEmpFuncao, setNewEmpFuncao] = useState("");
  const [newEmpValor, setNewEmpValor] = useState("");
  const newEmpDragY = useMotionValue(0);
  const newEmpOpacity = useTransform(newEmpDragY, [0, 300], [1, 0]);
  const addEmpDragY = useMotionValue(0);
  const addEmpOpacity = useTransform(addEmpDragY, [0, 300], [1, 0]);
  const newEmpTouchStart = useRef(null);
  const addEmpTouchStart = useRef(null);
  const listRef = useRef(null);
  const reviewListRef = useRef(null);
  const dragStart = useRef(null);
  const reviewDragStart = useRef(null);

  const handleListTouchStart = (e) => { dragStart.current = e.touches[0].clientY; };
  const handleListTouchMove = (e) => {
    if (dragStart.current === null || !listRef.current) return;
    const dy = dragStart.current - e.touches[0].clientY;
    listRef.current.scrollTop += dy * 0.6;
    dragStart.current = e.touches[0].clientY;
  };

  const handleReviewTouchStart = (e) => { e.stopPropagation(); reviewDragStart.current = e.touches[0].clientY; };
  const handleReviewTouchMove = (e) => {
    e.stopPropagation();
    if (reviewDragStart.current === null || !reviewListRef.current) return;
    const dy = reviewDragStart.current - e.touches[0].clientY;
    reviewListRef.current.scrollTop += dy * 0.6;
    reviewDragStart.current = e.touches[0].clientY;
  };

  const scaleKey = isSalao ? `salao_scale_${event.id}` : `juberly_scale_${event.id}`;

  const [scale, setScale] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(scaleKey)) || [];
    } catch { return []; }
  });

  // Se escala foi reprovada e localStorage está vazio, carrega do CSV existente
  const existingCsvUrl = isSalao ? event.salao_csv_url : event.scale_csv_url;
  const isRejected = isSalao ? event.salao_rejected : event.scale_rejected;

  useEffect(() => {
    if (scale.length === 0 && isRejected && existingCsvUrl) {
      setLoadingCsv(true);
      parseCsvFromUrl(existingCsvUrl).then(rows => {
        if (rows.length > 0) {
          setScale(rows);
          localStorage.setItem(scaleKey, JSON.stringify(rows));
        }
        setLoadingCsv(false);
      });
    }
  }, []);

  const { data: allEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("full_name", 500),
  });

  const kitchenEmployees = (allEmployees || []).filter(emp =>
    (isSalao ? isSalaoRole(emp.role) : isKitchenRole(emp.role)) &&
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
    localStorage.setItem(scaleKey, JSON.stringify(newScale));
    setShowDialog(false);
    toast(`${selectedEmp.full_name} adicionado(a) à escala!`, { duration: 1000 });
  };

  const handleRemove = (employeeId) => {
    const newScale = scale.filter(s => s.employeeId !== employeeId);
    setScale(newScale);
    localStorage.setItem(scaleKey, JSON.stringify(newScale));
  };

  const handleAddNewEmployee = () => {
    if (!newEmpName || !newEmpFuncao || !newEmpValor) {
      toast.error("Preencha nome, função e valor");
      return;
    }
    const newEntry = {
      employeeId: `new_${Date.now()}`,
      full_name: newEmpName,
      role: newEmpFuncao,
      funcao: newEmpFuncao,
      valor: newEmpValor,
      pix: newEmpPix,
      celular: newEmpCelular,
      isNew: true,
    };
    const newScale = [...scale, newEntry];
    setScale(newScale);
    localStorage.setItem(scaleKey, JSON.stringify(newScale));
    setShowNewEmpDialog(false);
    setNewEmpName(""); setNewEmpPix(""); setNewEmpCelular(""); setNewEmpFuncao(""); setNewEmpValor("");
    toast(`${newEmpName} adicionado(a) como novo funcionário!`, { duration: 1500 });
  };

  const handleConfirmAndExport = async () => {
    setSaving(true);
    const ids = scale.filter(s => !s.isNew).map(s => s.employeeId);

    // Gera o CSV em memória e faz upload para armazenar a URL
    const bom = "\uFEFF";
    const header = "Nome;Funcao;Valor (R$);Pix;Celular;Obs\n";
    const rows = scale.map(emp => {
      const obs = emp.isNew ? "*** FUNCIONARIO NOVO ***" : "";
      return `${removeAccents(emp.full_name)};${removeAccents(emp.funcao)};${emp.valor};${emp.pix || ""};${emp.celular || ""};${obs}`;
    }).join("\n");
    const total = scale.reduce((acc, emp) => {
      const v = parseFloat(emp.valor?.replace(",", ".")) || 0;
      return acc + v;
    }, 0);
    const totalRow = `\nTOTAL GERAL;;${total.toFixed(2).replace(".", ",")};;;`;
    const csv = bom + header + rows + totalRow;
    const csvBlob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const csvFile = new File([csvBlob], `escala_${event.name.replace(/\s+/g, "_")}.csv`, { type: "text/csv" });
    const uploadRes = await base44.integrations.Core.UploadFile({ file: csvFile });

    const updatePayload = isSalao
      ? { salao_csv_url: uploadRes.file_url }
      : { employees: ids, scale_csv_url: uploadRes.file_url };
    await base44.entities.Event.update(event.id, updatePayload);
    queryClient.invalidateQueries(["events"]);
    queryClient.invalidateQueries(["event", event.id]);

    // Também dispara o download local
    generateExcel(scale, event.name);

    // Limpa escala do localStorage
    localStorage.removeItem(scaleKey);

    setSaving(false);
    toast.success("Escala confirmada e Excel gerado!");
    setShowReview(false);
    onBack();
  };

  const total = scale.reduce((acc, emp) => {
    const v = parseFloat(emp.valor?.replace(",", ".")) || 0;
    return acc + v;
  }, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <Button variant="ghost" onClick={onBack} className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

      <div className="mb-5">
        <h1 className="text-2xl font-bold">{isRejected && existingCsvUrl ? "Editar Escala" : "Criar Escala"}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {event.name} — {event.date ? format(new Date(event.date), "dd/MM/yyyy") : ""}
        </p>
        {isRejected && existingCsvUrl && (
          <p className="text-xs text-red-600 mt-1 font-medium">⚠️ Escala reprovada — faça as correções e reenvie</p>
        )}
      </div>

      {loadingCsv && (
        <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Carregando escala anterior...</span>
        </div>
      )}

      {/* Botão Conferir Escala */}
      {scale.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setShowReview(true)}
          className="w-full mb-4 gap-2 rounded-xl border-primary/40 text-primary hover:bg-primary/5"
        >
          <Eye className="w-4 h-4" />
          Conferir Escala ({scale.length} funcionário{scale.length > 1 ? "s" : ""})
        </Button>
      )}

      {/* Buscar e adicionar */}
      <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex flex-col" style={{ minHeight: 'calc(100vh - 200px)' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold">Adicionar Funcionário {isSalao ? "do Salão" : "da Cozinha"}</h2>
          <button
            onClick={() => setShowNewEmpDialog(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Funcionário
          </button>
        </div>
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
          className="space-y-2 flex-1 overflow-y-auto"
          onTouchStart={handleListTouchStart}
          onTouchMove={handleListTouchMove}
        >
          {kitchenEmployees.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-6">
              {search ? "Nenhum funcionário encontrado" : `Todos os funcionários ${isSalao ? "do salão" : "de cozinha"} já foram adicionados`}
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

      {/* Tela cheia: Adicionar funcionário (função + valor) */}
      <AnimatePresence>
        {showDialog && selectedEmp && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{ y: addEmpDragY, opacity: addEmpOpacity }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
          >
            {/* Drag handle */}
            <div
              className="flex justify-center pt-4 pb-3 cursor-grab active:cursor-grabbing select-none"
              style={{ touchAction: "none" }}
              onTouchStart={(e) => { addEmpTouchStart.current = e.touches[0].clientY; }}
              onTouchMove={(e) => {
                if (addEmpTouchStart.current === null) return;
                const dy = e.touches[0].clientY - addEmpTouchStart.current;
                if (dy > 0) addEmpDragY.set(dy);
              }}
              onTouchEnd={() => {
                if (addEmpDragY.get() > 100) {
                  setShowDialog(false);
                }
                addEmpDragY.set(0);
                addEmpTouchStart.current = null;
              }}
            >
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
            </div>

            {/* Header */}
            <div className="flex items-center px-4 pt-2 pb-4 border-b border-border gap-2">
              <button onClick={() => { setShowDialog(false); addEmpDragY.set(0); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 p-1">
                <ChevronLeft className="w-5 h-5" />
                Voltar
              </button>
              <h2 className="font-bold text-base flex-1 text-center pr-16">Adicionar à Escala</h2>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
              {/* Funcionário */}
              <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-200 to-orange-300 flex items-center justify-center text-lg font-bold text-orange-700 shrink-0">
                  {selectedEmp.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base">{selectedEmp.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedEmp.role}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Função no Evento</Label>
                <Input
                  placeholder="Ex: Cozinheira, Ajudante..."
                  value={funcao}
                  onChange={e => setFuncao(e.target.value)}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Valor do Extra (R$)</Label>
                <Input
                  placeholder="Ex: 150"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className="h-12 text-base rounded-xl"
                />
              </div>
            </div>

            {/* Botão fixo no fundo */}
            <div className="px-4 pb-8 pt-3 border-t border-border">
              <Button onClick={handleAdd} className="w-full h-14 text-base rounded-2xl gap-2">
                <Plus className="w-5 h-5" />
                Adicionar à Escala
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog: Novo Funcionário */}
      <AnimatePresence>
        {showNewEmpDialog && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            style={{ y: newEmpDragY, opacity: newEmpOpacity }}
            className="fixed inset-0 z-50 bg-background flex flex-col"
            onTouchStart={(e) => {
              if (e.target.closest("[data-scroll-area]")) return;
              newEmpTouchStart.current = e.touches[0].clientY;
            }}
            onTouchMove={(e) => {
              if (newEmpTouchStart.current === null) return;
              const dy = e.touches[0].clientY - newEmpTouchStart.current;
              if (dy > 0) newEmpDragY.set(dy);
            }}
            onTouchEnd={() => {
              if (newEmpTouchStart.current === null) return;
              if (newEmpDragY.get() > 100) setShowNewEmpDialog(false);
              newEmpDragY.set(0);
              newEmpTouchStart.current = null;
            }}
          >
            {/* Handle visual */}
            <div className="flex justify-center pt-4 pb-3 select-none">
              <div className="w-12 h-1.5 rounded-full bg-muted-foreground/25" />
            </div>

            <div className="flex items-center px-4 pt-2 pb-4 border-b border-border gap-2">
              <button onClick={() => { setShowNewEmpDialog(false); newEmpDragY.set(0); }} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1 p-1">
                <ChevronLeft className="w-5 h-5" />
                Voltar
              </button>
              <h2 className="font-bold text-base flex-1 text-center pr-16">Novo Funcionário</h2>
            </div>

            <div data-scroll-area className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ touchAction: "pan-y", WebkitOverflowScrolling: "touch", overscrollBehavior: "contain" }}>
              <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
                <p className="text-xs text-amber-700 font-medium">⭐ Este funcionário será marcado como <strong>NOVO</strong> no Excel gerado.</p>
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Nome Completo *</Label>
                <Input
                  placeholder="Ex: João da Silva"
                  value={newEmpName}
                  onChange={e => setNewEmpName(e.target.value)}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Chave Pix *</Label>
                <Input
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                  value={newEmpPix}
                  onChange={e => setNewEmpPix(e.target.value)}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Celular</Label>
                <Input
                  placeholder="Ex: (11) 99999-9999"
                  value={newEmpCelular}
                  onChange={e => setNewEmpCelular(e.target.value)}
                  inputMode="tel"
                  className="h-12 text-base rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Função no Evento *</Label>
                <Input
                  placeholder="Ex: Cozinheira, Garçom..."
                  value={newEmpFuncao}
                  onChange={e => setNewEmpFuncao(e.target.value)}
                  className="h-12 text-base rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-base font-semibold">Valor do Extra (R$) *</Label>
                <Input
                  placeholder="Ex: 150"
                  value={newEmpValor}
                  onChange={e => setNewEmpValor(e.target.value)}
                  inputMode="numeric"
                  className="h-12 text-base rounded-xl"
                />
              </div>
            </div>

            <div className="px-4 pb-8 pt-3 border-t border-border">
              <Button onClick={handleAddNewEmployee} className="w-full h-14 text-base rounded-2xl gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                <Plus className="w-5 h-5" />
                Adicionar à Escala
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialog: Conferir Escala */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Conferência da Escala
            </DialogTitle>
          </DialogHeader>

          <div
            ref={reviewListRef}
            className="space-y-1.5 max-h-72 overflow-y-auto"
            onTouchStart={handleReviewTouchStart}
            onTouchMove={handleReviewTouchMove}
          >
            {scale.map((emp) => (
              <div key={emp.employeeId} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 ${emp.isNew ? "bg-amber-50 border border-amber-300" : "bg-muted/40"}`}>
                <div className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold shrink-0 ${emp.isNew ? "bg-amber-200 text-amber-800" : "bg-gradient-to-br from-primary/20 to-purple-200 text-primary"}`}>
                  {emp.isNew ? "★" : emp.full_name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="font-semibold text-xs truncate">{emp.full_name}</p>
                    {emp.isNew && <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1 rounded shrink-0">NOVO</span>}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{emp.funcao}</p>
                </div>
                <span className="text-xs font-semibold text-emerald-700 shrink-0">R$ {emp.valor}</span>
                <button
                  onClick={() => handleRemove(emp.employeeId)}
                  className="text-destructive/50 hover:text-destructive p-0.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 mt-1">
            <span className="text-sm font-semibold text-emerald-800">Total</span>
            <span className="text-sm font-bold text-emerald-700">R$ {total.toFixed(2).replace(".", ",")}</span>
          </div>

          <div className="flex gap-2 mt-1">
            <Button variant="outline" onClick={() => setShowReview(false)} className="flex-1 gap-2">
              <X className="w-4 h-4" />
              Fechar
            </Button>
            <Button onClick={handleConfirmAndExport} disabled={saving} className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {saving ? "Salvando..." : "Confirmar e Gerar Excel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
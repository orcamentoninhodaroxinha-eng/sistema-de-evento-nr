import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle, FileDown, Loader2, Users, Lock, ArrowUp, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import SignaturePad from "./SignaturePad";
import CameraCapture from "./CameraCapture";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

export default function EventScale({ event, employees, onBack }) {
  const getGroup = (emp) => {
    const role = (emp.role || "").toLowerCase();
    if (
      role.includes("cozinha") || role.includes("cozinheiro") ||
      role.includes("ajudante") || role.includes("auxiliar")
    ) return "cozinha";
    return "salao";
  };

  const GROUP_ORDER = { cozinha: 0, salao: 1 };
  const GROUP_CONFIG = {
    cozinha: { label: "🍳 Cozinha & Ajudantes", color: "bg-orange-50 border-orange-200 text-orange-700" },
    salao:   { label: "🍽️ Salão & Segurança",   color: "bg-blue-50 border-blue-200 text-blue-700" },
  };

  const sortedEmployees = [...employees].sort((a, b) => {
    const ga = GROUP_ORDER[getGroup(a)] ?? 1;
    const gb = GROUP_ORDER[getGroup(b)] ?? 1;
    return ga - gb;
  });



  const listRef = useRef(null);

  const [selectMode, setSelectMode] = useState(true);
  const [pending, setPending] = useState(
    sortedEmployees.map((emp, i) => ({ ...emp, _key: emp.id || `${emp.full_name}-${i}` }))
  );

  const containerRef = useRef(null);
  const signatureRef = useRef(null);

  useEffect(() => {
    if (selectMode && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (!selectMode) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectMode]);

  const selectEmployee = (idx) => {
    setPending(prev => {
      const next = [...prev];
      const [chosen] = next.splice(idx, 1);
      return [chosen, ...next];
    });
    setSelectMode(false);
  };
  const [completed, setCompleted] = useState([]);
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);
  const [signatureUrl, setSignatureUrl] = useState(null);
  const [photoUrl, setPhotoUrl] = useState(null);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const current = pending[0];

  const handleSignatureSave = (file) => {
    setSignatureFile(file);
    setSignatureConfirmed(true);
  };

  const handlePhotoCapture = (file) => {
    setPhotoFile(file);
    setPhotoConfirmed(true);
  };

  const handleConfirmEmployee = async () => {
    if (!signatureConfirmed || !photoConfirmed) {
      toast.error("Complete a assinatura e a foto antes de confirmar", { duration: 2000 });
      return;
    }
    setSaving(true);

    let sUrl = "";
    let pUrl = "";
    if (signatureFile) {
      const res = await base44.integrations.Core.UploadFile({ file: signatureFile });
      sUrl = res.file_url;
    }
    if (photoFile) {
      const res = await base44.integrations.Core.UploadFile({ file: photoFile });
      pUrl = res.file_url;
    }

    const record = {
      ...current,
      signatureUrl: sUrl,
      photoUrl: pUrl,
    };

    const empName = current.full_name;
    setCompleted((prev) => [...prev, record]);
    setPending((prev) => prev.slice(1));
    setSignatureFile(null);
    setPhotoFile(null);
    setSignatureConfirmed(false);
    setPhotoConfirmed(false);
    setSaving(false);
    setSelectMode(true);
    toast(`${empName} registrado!`, { duration: 1000 });
  };

  const toBase64FromUrl = async (url) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  };

  const generatePDF = async () => {
    setGeneratingPdf(true);
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;

    const eventDateStr = event.date
      ? format(new Date(event.date), "dd/MM/yyyy")
      : "___/___/______";
    const todayStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    for (let i = 0; i < completed.length; i++) {
      const emp = completed[i];
      if (i > 0) doc.addPage();

      let y = 18;

      // --- LOGO area (left) ---
      doc.setFont("helvetica", "bolditalic");
      doc.setFontSize(9);
      doc.setTextColor(120, 40, 60);
      doc.text("ninho da roxinha", margin, y + 4);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.text("RESTAURANTE & EVENTOS", margin, y + 8);

      // --- RECIBO title (center) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 30, 30);
      doc.text("RECIBO", pageW / 2, y + 6, { align: "center" });

      // --- VALOR (right) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text("VALOR:", pageW - margin, y + 2, { align: "right" });
      doc.setFontSize(11);
      doc.text(`R$  ${emp.valor || "________"}`, pageW - margin, y + 8, { align: "right" });

      // --- Divider ---
      y += 18;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, pageW - margin, y);
      y += 12;

      // --- Declaration body ---
      const pixInfo = emp.cpf ? ` / PIX ${emp.cpf}` : "";
      const declaration =
        `Eu ${emp.full_name}${pixInfo}, aqui denominado Free Lancer, Declaro ter Recebido da empresa ` +
        `Ninho da Roxinha Eventos, a quantia de R$ ${emp.valor || "________"}, referente prestação de serviços -Extras ` +
        `no evento do dia ${eventDateStr} ( ${event.name} ) e declaro ainda não haver de minha parte nenhuma obrigação ` +
        `de de serviços solicitada esporadicamente, sendo a mim facultada decisão de aceitar ou não o serviço e Horarios ` +
        `propostos.`;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      const bodyLines = doc.splitTextToSize(declaration, contentW);
      doc.text(bodyLines, margin, y);
      y += bodyLines.length * 6 + 8;

      // --- "sem mais..." ---
      doc.text("sem mais para o momento, firmo o presente.", margin, y);
      y += 24;

      // --- City / Date (right aligned) ---
      doc.text(`Serra, Espírito Santo ${todayStr}`, pageW - margin, y, { align: "right" });
      y += 28;

      // --- Signature image ---
      if (emp.signatureUrl) {
        try {
          const sigData = await toBase64FromUrl(emp.signatureUrl);
          doc.addImage(sigData, "PNG", margin, y - 18, 70, 18, undefined, "FAST");
        } catch (e) {}
      }

      // --- Signature line ---
      doc.setDrawColor(60, 60, 60);
      doc.line(margin, y, margin + 100, y);
      y += 6;

      // --- Name / PIX below line ---
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      doc.text(`${emp.full_name}${pixInfo}`, margin, y);
      if (emp.cpf) {
        y += 5;
        doc.text(emp.cpf, margin, y);
      }
      y += 10;

      // --- Photo ---
      if (emp.photoUrl) {
        try {
          const photoData = await toBase64FromUrl(emp.photoUrl);
          doc.addImage(photoData, "JPEG", margin, y, 55, 70, undefined, "FAST");
        } catch (e) {}
      }
    }

    doc.save(`recibos_${event.name.replace(/\s+/g, "_")}.pdf`);
    await base44.entities.Event.update(event.id, { status: "Concluído" });
    setGeneratingPdf(false);
    toast("PDF gerado e evento finalizado!");
  };

  // Select who signs next
  if (selectMode) {
    const groups = {};
    pending.forEach((emp, idx) => {
      const g = getGroup(emp);
      if (!groups[g]) groups[g] = [];
      groups[g].push({ emp, idx });
    });

    return (
      <div ref={containerRef} className="w-full h-full md:h-auto md:max-w-lg md:mx-auto relative flex flex-col">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-lg sm:text-xl font-bold mb-1">Quem vai assinar agora?</h1>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5">Toque no funcionário para iniciar a assinatura.</p>
        
        <div className="relative">
          <div ref={listRef} className="space-y-1.5 sm:space-y-2 overflow-y-auto flex-1 pr-1 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full" style={{ scrollBehavior: 'smooth' }}>
          {Object.entries(GROUP_CONFIG).map(([groupKey, config]) =>
            groups[groupKey] ? (
              <div key={groupKey}>
                <div className={`text-xs font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg border mb-1.5 sm:mb-2 inline-block ${config.color}`}>{config.label}</div>
                <div className="space-y-2">
                  {groups[groupKey].map(({ emp, idx }) => (
                    <button
                      key={emp._key}
                      onClick={() => selectEmployee(idx)}
                      className="w-full flex items-center gap-2 sm:gap-3 bg-card border border-border rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 hover:border-primary/40 hover:bg-accent/30 transition-all text-left"
                    >
                      <div className="w-9 sm:w-10 h-9 sm:h-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{emp.full_name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-xs sm:text-sm truncate">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-muted-foreground/30" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10 pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => listRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}
              className="rounded-lg h-10 sm:h-12 w-10 sm:w-12 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-white transition-all border border-border/30 flex-shrink-0"
            >
              <ChevronUp className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => listRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}
              className="rounded-lg h-10 sm:h-12 w-10 sm:w-12 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-white transition-all border border-border/30 flex-shrink-0"
            >
              <ChevronDown className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // All done
  if (pending.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center text-center px-4 sm:px-6 py-6 sm:py-10">
        <div className="w-16 sm:w-20 h-16 sm:h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-4 sm:mb-5">
          <CheckCircle className="w-8 sm:w-10 h-8 sm:h-10 text-emerald-600" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold">Escala Finalizada!</h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-2 mb-4 sm:mb-6">
          Todos os {completed.length} funcionários foram registrados.
        </p>
        <Button
          onClick={generatePDF}
          disabled={generatingPdf}
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl gap-2 sm:gap-3 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30"
        >
          {generatingPdf ? (
            <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
          ) : (
            <FileDown className="w-5 sm:w-6 h-5 sm:h-6" />
          )}
          {generatingPdf ? "Gerando..." : "Baixar PDF"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="mt-2 sm:mt-3 w-full text-xs sm:text-sm">
          Voltar ao Evento
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center gap-2 sm:gap-3 mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setSelectMode(true)}
          className="gap-2 text-muted-foreground"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Trocar funcionário
        </Button>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-bold truncate">Escala — {event.name}</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
            {completed.length} de {completed.length + pending.length} registros
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground flex-shrink-0">
          <Users className="w-4 h-4" />
          {pending.length} restante(s)
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-4 sm:mb-6">
        <div
          className="h-2 bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-500"
          style={{ width: `${(completed.length / (completed.length + pending.length)) * 100}%` }}
        />
      </div>

      {/* Group indicator */}
      {(() => {
        const group = getGroup(current);
        const isFirstOfGroup = completed.length === 0 || getGroup(completed[completed.length - 1]) !== group;
        const { label: groupLabel, color: groupColor } = GROUP_CONFIG[group] || GROUP_CONFIG.salao;
        return isFirstOfGroup ? (
          <div className={`flex items-center justify-center gap-2 py-2 px-4 rounded-xl border font-semibold text-sm mb-2 ${groupColor}`}>
            {groupLabel}
          </div>
        ) : null;
      })()}

      {/* Current employee */}
      <div className="relative flex-1">
        <div ref={signatureRef} className="bg-card rounded-2xl border border-border p-3 sm:p-6 shadow-sm space-y-3 sm:space-y-6 overflow-y-auto h-full">
          <div className="flex items-center gap-2 sm:gap-3">
          {current.photo_url ? (
            <img src={current.photo_url} alt={current.full_name} className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-sm sm:text-base">
                {current.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold truncate">{current.full_name}</h2>
            <p className="text-xs text-muted-foreground truncate">{current.role} · {current.department}</p>
          </div>
        </div>

        {/* Valor */}
        {current.valor && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3">
            <span className="text-xs sm:text-sm font-medium text-emerald-800">Valor</span>
            <span className="text-base sm:text-lg font-bold text-emerald-700">R$ {current.valor}</span>
          </div>
        )}

        <SignaturePad key={`sig-${current._key}`} onSave={handleSignatureSave} />

        {signatureConfirmed && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-emerald-200">
            <CheckCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
            Assinatura confirmada
          </div>
        )}

        <CameraCapture key={`cam-${current._key}`} onCapture={handlePhotoCapture} />

        {photoConfirmed && (
          <div className="flex items-center gap-2 text-xs sm:text-sm text-emerald-600 bg-emerald-50 rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 border border-emerald-200">
            <CheckCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4 flex-shrink-0" />
            Foto confirmada
          </div>
        )}

        <Button
          onClick={handleConfirmEmployee}
          disabled={!signatureConfirmed || !photoConfirmed || saving}
          className="w-full h-10 sm:h-11 text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl gap-2"
        >
          {saving ? (
            <Loader2 className="w-4 sm:w-5 h-4 sm:h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5" />
          )}
          {saving ? "Salvando..." : `Próximo`}
        </Button>
      </div>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signatureRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}
            className="rounded-lg h-10 sm:h-12 w-10 sm:w-12 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-white transition-all border border-border/30 flex-shrink-0"
          >
            <ChevronUp className="w-5 sm:w-6 h-5 sm:w-6 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signatureRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}
            className="rounded-lg h-10 sm:h-12 w-10 sm:w-12 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-white transition-all border border-border/30 flex-shrink-0"
          >
            <ChevronDown className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
          </Button>
          </div>
        </div>
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 z-10 pointer-events-auto">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signatureRef.current?.scrollBy({ top: -80, behavior: 'smooth' })}
            className="rounded-lg h-10 sm:h-12 w-10 sm:w-12 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-white transition-all border border-border/30 flex-shrink-0"
          >
            <ChevronUp className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signatureRef.current?.scrollBy({ top: 80, behavior: 'smooth' })}
            className="rounded-lg h-10 sm:h-12 w-10 sm:w-12 bg-white/80 backdrop-blur-sm shadow-md hover:shadow-lg hover:bg-white transition-all border border-border/30 flex-shrink-0"
          >
            <ChevronDown className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
          </Button>
        </div>
      </div>

      {/* Pending list */}
      {pending.length > 1 && (
        <div className="mt-2 sm:mt-3 bg-muted/50 rounded-xl sm:rounded-2xl p-2.5 sm:p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1.5 sm:mb-2 uppercase tracking-wide">Aguardando</p>
          <div className="space-y-1 sm:space-y-2">
            {pending.slice(1).map((emp) => (
              <div key={emp._key} className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {emp.full_name?.charAt(0).toUpperCase()}
                </div>
                <span className="truncate">{emp.full_name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
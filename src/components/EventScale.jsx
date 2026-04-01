import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle, FileDown, Loader2, Users, Lock } from "lucide-react";
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



  const [selectMode, setSelectMode] = useState(true);
  const [pending, setPending] = useState(
    sortedEmployees.map((emp, i) => ({ ...emp, _key: emp.id || `${emp.full_name}-${i}` }))
  );

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
      <div className="max-w-lg mx-auto w-full">
        <Button variant="ghost" onClick={onBack} className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-xl font-bold mb-1">Quem vai assinar agora?</h1>
        <p className="text-sm text-muted-foreground mb-5">Toque no funcionário para iniciar a assinatura.</p>
        <div className="space-y-5 overflow-y-auto max-h-[60vh] pr-1">
          {Object.entries(GROUP_CONFIG).map(([groupKey, config]) =>
            groups[groupKey] ? (
              <div key={groupKey}>
                <div className={`text-xs font-semibold px-3 py-1.5 rounded-lg border mb-2 inline-block ${config.color}`}>{config.label}</div>
                <div className="space-y-2">
                  {groups[groupKey].map(({ emp, idx }) => (
                    <button
                      key={emp._key}
                      onClick={() => selectEmployee(idx)}
                      className="w-full flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-primary/40 hover:bg-accent/30 transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold">{emp.full_name?.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{emp.full_name}</p>
                        <p className="text-xs text-muted-foreground">{emp.role}</p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-muted-foreground/30" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null
          )}
        </div>
      </div>
    );
  }

  // All done
  if (pending.length === 0) {
    return (
      <div className="max-w-lg mx-auto text-center py-10">
        <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-10 h-10 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold">Escala Finalizada!</h2>
        <p className="text-muted-foreground mt-2 mb-6">
          Todos os {completed.length} funcionários foram registrados.
        </p>
        <Button
          onClick={generatePDF}
          disabled={generatingPdf}
          className="w-full h-14 text-base font-semibold rounded-2xl gap-3 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30"
        >
          {generatingPdf ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <FileDown className="w-6 h-6" />
          )}
          {generatingPdf ? "Gerando PDF..." : "Baixar PDF da Escala"}
        </Button>
        <Button variant="ghost" onClick={onBack} className="mt-3 w-full">
          Voltar ao Evento
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto w-full">
      <div className="flex items-center gap-3 mb-4">
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold">Escala — {event.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {completed.length} de {completed.length + pending.length} registros concluídos
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          {pending.length} restante(s)
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full mb-6">
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
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm space-y-6">
        <div className="flex items-center gap-4">
          {current.photo_url ? (
            <img src={current.photo_url} alt={current.full_name} className="w-14 h-14 rounded-xl object-cover" />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center">
              <span className="text-primary font-bold text-lg">
                {current.full_name?.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <h2 className="text-lg font-bold">{current.full_name}</h2>
            <p className="text-sm text-muted-foreground">{current.role} · {current.department}</p>
          </div>
        </div>

        {/* Valor */}
        {current.valor && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
            <span className="text-sm font-medium text-emerald-800">Valor do Serviço</span>
            <span className="text-lg font-bold text-emerald-700">R$ {current.valor}</span>
          </div>
        )}

        <SignaturePad key={`sig-${current._key}`} onSave={handleSignatureSave} />

        {signatureConfirmed && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            Assinatura confirmada
          </div>
        )}

        <CameraCapture key={`cam-${current._key}`} onCapture={handlePhotoCapture} />

        {photoConfirmed && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            Foto confirmada
          </div>
        )}

        <Button
          onClick={handleConfirmEmployee}
          disabled={!signatureConfirmed || !photoConfirmed || saving}
          className="w-full h-12 text-base font-semibold rounded-xl gap-2"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <CheckCircle className="w-5 h-5" />
          )}
          {saving ? "Salvando..." : `Confirmar e Próximo`}
        </Button>
      </div>

      {/* Pending list */}
      {pending.length > 1 && (
        <div className="mt-4 bg-muted/50 rounded-2xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wide">Aguardando</p>
          <div className="space-y-2">
            {pending.slice(1).map((emp) => (
              <div key={emp._key} className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-xs font-bold">
                  {emp.full_name?.charAt(0).toUpperCase()}
                </div>
                {emp.full_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
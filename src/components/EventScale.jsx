import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle, FileDown, Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import SignaturePad from "./SignaturePad";
import CameraCapture from "./CameraCapture";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";

export default function EventScale({ event, employees, onBack }) {
  const [pending, setPending] = useState([...employees]);
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
      toast({ title: "Complete a assinatura e a foto antes de confirmar", variant: "destructive" });
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
    toast({ title: `${empName} registrado!` });
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
    const margin = 14;

    // Header
    doc.setFillColor(99, 57, 255);
    doc.rect(0, 0, pageW, 30, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(event.name, margin, 13);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const dateStr = event.date
      ? format(new Date(event.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
      : "";
    doc.text(`Data: ${dateStr}   Local: ${event.location || "-"}`, margin, 22);

    let y = 38;

    for (let i = 0; i < completed.length; i++) {
      const emp = completed[i];

      if (y > 240) {
        doc.addPage();
        y = 20;
      }

      // Card background
      doc.setFillColor(248, 248, 252);
      doc.roundedRect(margin, y, pageW - margin * 2, 52, 3, 3, "F");
      doc.setDrawColor(220, 220, 235);
      doc.roundedRect(margin, y, pageW - margin * 2, 52, 3, 3, "S");

      // Photo
      if (emp.photoUrl) {
        try {
          const imgData = await toBase64FromUrl(emp.photoUrl);
          doc.addImage(imgData, "JPEG", margin + 3, y + 4, 22, 28, undefined, "FAST");
        } catch (e) {}
      }

      // Name and role
      doc.setTextColor(30, 30, 50);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(emp.full_name, margin + 28, y + 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 120);
      doc.text(`${emp.role}  |  ${emp.department || ""}`, margin + 28, y + 19);

      // Signature
      if (emp.signatureUrl) {
        try {
          const sigData = await toBase64FromUrl(emp.signatureUrl);
          doc.addImage(sigData, "PNG", margin + 28, y + 24, 50, 20, undefined, "FAST");
        } catch (e) {}
      }

      // Line under signature
      doc.setDrawColor(180, 180, 200);
      doc.line(margin + 28, y + 46, margin + 78, y + 46);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 170);
      doc.text("Assinatura", margin + 48, y + 50, { align: "center" });

      y += 58;
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 170);
      doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} — ${i}/${pageCount}`, pageW / 2, 292, { align: "center" });
    }

    doc.save(`escala_${event.name.replace(/\s+/g, "_")}.pdf`);
    setGeneratingPdf(false);
    toast({ title: "PDF gerado com sucesso!" });
  };

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
    <div className="max-w-lg mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar
      </Button>

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

        <SignaturePad key={`sig-${current.id}`} onSave={handleSignatureSave} />

        {signatureConfirmed && (
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-2 border border-emerald-200">
            <CheckCircle className="w-4 h-4" />
            Assinatura confirmada
          </div>
        )}

        <CameraCapture key={`cam-${current.id}`} onCapture={handlePhotoCapture} />

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
              <div key={emp.id} className="flex items-center gap-2 text-sm text-muted-foreground">
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
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import jsPDF from "jspdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";

export default function IndividualReceiptButton({ event, employee }) {
  const [generating, setGenerating] = useState(false);

  const buildSinglePDF = async () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = 210;
    const margin = 20;
    const contentW = pageW - margin * 2;

    const eventDateStr = event.date
      ? format(new Date(event.date + "T12:00:00"), "dd/MM/yyyy")
      : "___/___/______";
    const todayStr = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    let y = 18;
    // Cabeçalho
    doc.setFont("helvetica", "bolditalic");
    doc.setFontSize(9);
    doc.setTextColor(120, 40, 60);
    doc.text("ninho da roxinha", margin, y + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text("RESTAURANTE & EVENTOS", margin, y + 8);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(30, 30, 30);
    doc.text("RECIBO", pageW / 2, y + 6, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text("VALOR:", pageW - margin, y + 2, { align: "right" });
    doc.setFontSize(11);
    doc.text(`R$  ${employee.valor || "________"}`, pageW - margin, y + 8, { align: "right" });

    y += 18;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageW - margin, y);
    y += 12;

    const pixInfo = employee.cpf ? ` / PIX ${employee.cpf}` : (employee.pix ? ` / PIX ${employee.pix}` : "");
    const declaration =
      `Eu ${employee.full_name}${pixInfo}, aqui denominado Free Lancer, Declaro ter Recebido da empresa ` +
      `Ninho da Roxinha Eventos, a quantia de R$ ${employee.valor || "________"}, referente prestação de serviços -Extras ` +
      `no evento do dia ${eventDateStr} ( ${event.name} ) e declaro ainda não haver de minha parte nenhuma obrigação ` +
      `de de serviços solicitada esporadicamente, sendo a mim facultada decisão de aceitar ou não o serviço e Horarios ` +
      `propostos.`;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    const bodyLines = doc.splitTextToSize(declaration, contentW);
    doc.text(bodyLines, margin, y);
    y += bodyLines.length * 6 + 8;

    doc.text("sem mais para o momento, firmo o presente.", margin, y);
    y += 24;
    doc.text(`Serra, Espírito Santo ${todayStr}`, pageW - margin, y, { align: "right" });
    y += 28;

    // Linha de assinatura
    doc.setDrawColor(60, 60, 60);
    doc.line(margin, y, margin + 100, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30, 30, 30);
    doc.text(`${employee.full_name}${pixInfo}`, margin, y);
    if (employee.cpf) { y += 5; doc.text(employee.cpf, margin, y); }

    // Salva e faz download
    const fileName = `recibo_${employee.full_name.replace(/\s+/g, "_")}_${event.name.replace(/\s+/g, "_")}.pdf`;
    const pdfBlob = doc.output("blob");
    const localUrl = URL.createObjectURL(pdfBlob);

    // Link para download
    const a = document.createElement("a");
    a.href = localUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(localUrl);

    return fileName;
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const fileName = await buildSinglePDF();
      toast.success(`Recibo gerado: ${fileName}`);
    } catch (err) {
      toast.error("Erro ao gerar recibo: " + err.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleGenerate}
      disabled={generating}
      className="gap-1.5 rounded-xl text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
    >
      {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileDown className="w-3 h-3" />}
      {generating ? "Gerando..." : "Recibo"}
    </Button>
  );
}
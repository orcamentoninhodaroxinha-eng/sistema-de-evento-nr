import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useDeviceDetection } from "@/hooks/useDeviceDetection";
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
  const deviceInfo = useDeviceDetection();
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
  const scrollbarThumbRef = useRef(null);

  const [selectMode, setSelectMode] = useState(true);
  const [thumbTop, setThumbTop] = useState(0);
  const [isDraggingScroll, setIsDraggingScroll] = useState(false);
  const [pending, setPending] = useState(
    sortedEmployees.map((emp, i) => ({ ...emp, _key: emp.id || `${emp.full_name}-${i}` }))
  );

  const containerRef = useRef(null);
  const signatureRef = useRef(null);
  const pendingListRef = useRef(null);

  const [touchStart, setTouchStart] = useState(0);

  const handleWheel = (e) => {
    if (!deviceInfo?.isWeb) return; // Apenas web usa scroll de roda
    const ref = selectMode ? containerRef.current : signatureRef.current;
    if (ref) {
      ref.scrollBy({ top: e.deltaY, behavior: 'smooth' });
    }
  };

  const handleTouchStart = (e) => {
    if (!deviceInfo?.isMobile) return; // Apenas mobile usa touch
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (!deviceInfo?.isMobile) return; // Apenas mobile usa touch
    const ref = selectMode ? containerRef.current : signatureRef.current;
    if (!ref) return;
    const touchEnd = e.changedTouches[0].clientY;
    const diff = touchStart - touchEnd;
    if (Math.abs(diff) > 10) {
      ref.scrollBy({ top: diff * 0.5, behavior: 'smooth' });
    }
  };

  const updateScrollbarPosition = () => {
    if (!listRef.current || !scrollbarThumbRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const scrollbar = scrollbarThumbRef.current.parentElement;
    if (!scrollbar) return;
    
    const maxScroll = scrollHeight - clientHeight;
    const scrollbarHeight = scrollbar.clientHeight;
    const thumbHeight = 12;
    
    if (maxScroll > 0) {
      const percentage = (scrollTop / maxScroll) * 100;
      const newThumbTop = (percentage / 100) * (scrollbarHeight - thumbHeight);
      setThumbTop(newThumbTop);
    }
  };

  const handleScrollbarMouseDown = (e) => {
    setIsDraggingScroll(true);
    e.preventDefault();
  };

  const handleScrollbarTouchStart = (e) => {
    setIsDraggingScroll(true);
    if (e.cancelable) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    if (!isDraggingScroll) return;
    
    const handleMouseMove = (e) => {
      if (!listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      listRef.current.scrollTop = (percentage / 100) * (listRef.current.scrollHeight - listRef.current.clientHeight);
    };
    
    const handleTouchMove = (e) => {
      if (!listRef.current || !e.touches[0]) return;
      if (e.cancelable) {
        e.preventDefault();
      }
      const rect = listRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(100, ((e.touches[0].clientY - rect.top) / rect.height) * 100));
      listRef.current.scrollTop = (percentage / 100) * (listRef.current.scrollHeight - listRef.current.clientHeight);
    };
    
    const handleEnd = () => {
      setIsDraggingScroll(false);
    };
    
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('mouseup', handleEnd, { passive: true });
    document.addEventListener('touchend', handleEnd, { passive: true });
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDraggingScroll]);

  useEffect(() => {
    const ref = selectMode ? containerRef.current : signatureRef.current;
    if (ref) {
      if (deviceInfo?.isWeb) {
        ref.addEventListener('wheel', handleWheel, { passive: true });
      }
      if (deviceInfo?.isMobile) {
        ref.addEventListener('touchstart', handleTouchStart, { passive: true });
        ref.addEventListener('touchend', handleTouchEnd, { passive: true });
      }
      return () => {
        ref.removeEventListener('wheel', handleWheel);
        ref.removeEventListener('touchstart', handleTouchStart);
        ref.removeEventListener('touchend', handleTouchEnd);
      };
    }
    if (selectMode && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (!selectMode) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [selectMode, handleWheel, touchStart, deviceInfo]);

  useEffect(() => {
    const listElement = listRef.current;
    if (!listElement) return;
    
    const handleScroll = () => {
      updateScrollbarPosition();
    };
    
    listElement.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      listElement.removeEventListener('scroll', handleScroll);
    };
  }, [updateScrollbarPosition]);

  const selectEmployee = (idx) => {
    setPending(prev => {
      const next = [...prev];
      const [chosen] = next.splice(idx, 1);
      return [chosen, ...next];
    });
    setSelectMode(false);
    setTimeout(() => {
      employeeHeaderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
  };
  const [completed, setCompleted] = useState([]);
  const [confirmingTeam, setConfirmingTeam] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const listContainerRef = useRef(null);
  const cameraRef = useRef(null);
  const signaturePadRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const employeeHeaderRef = useRef(null);
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
    setTimeout(() => {
      cameraRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handlePhotoCapture = (file) => {
    setPhotoFile(file);
    setPhotoConfirmed(true);
    setTimeout(() => {
      confirmButtonRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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
      <>
        <div ref={containerRef} className="w-full flex-1 h-full relative flex flex-col overflow-hidden">
          <Button variant="ghost" onClick={onBack} className="gap-2 mb-3 -ml-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-10">
            <ArrowLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
            Voltar
          </Button>
          <h1 className="text-base sm:text-lg font-bold mb-1">Quem vai assinar?</h1>
          <p className="text-xs text-muted-foreground mb-3 sm:mb-4 leading-snug">Toque para assinar.</p>

          <div className="relative flex-1 min-h-0 flex gap-2 sm:gap-3">
           <div
             ref={listRef}
             className="space-y-1 sm:space-y-2 overflow-y-auto h-full flex-1 [&::-webkit-scrollbar]:w-0 pr-1"
             style={{ scrollBehavior: 'smooth', scrollbarWidth: 'none' }}
             onTouchStart={(e) => setTouchStart(e.touches[0].clientY)}
             onTouchEnd={(e) => {
               const touchEnd = e.changedTouches[0].clientY;
               const diff = touchStart - touchEnd;
               if (Math.abs(diff) > 50 && listRef.current) {
                 listRef.current.scrollTop += diff * 0.8;
               }
             }}
           >
             {Object.entries(GROUP_CONFIG).map(([groupKey, config]) =>
               groups[groupKey] ? (
                 <div key={groupKey}>
                   <div className={`text-xs font-semibold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg border mb-1 sm:mb-2 inline-block ${config.color}`}>{config.label}</div>
                   <div className="space-y-1 sm:space-y-2">
                     {groups[groupKey].map(({ emp, idx }) => (
                       <button
                         key={emp._key}
                         onClick={() => selectEmployee(idx)}
                         className="w-full flex items-center gap-2 bg-card border border-border rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-2 sm:py-3 hover:border-primary/40 hover:bg-accent/30 transition-all text-left active:scale-95"
                       >
                         <div className="w-8 sm:w-10 h-8 sm:h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center shrink-0 text-xs sm:text-sm">
                           <span className="text-primary font-bold">{emp.full_name?.charAt(0).toUpperCase()}</span>
                         </div>
                         <div className="flex-1 min-w-0">
                           <p className="font-semibold text-xs sm:text-sm truncate">{emp.full_name}</p>
                           <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                         </div>
                         <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-muted-foreground/30 flex-shrink-0" />
                       </button>
                     ))}
                   </div>
                 </div>
               ) : null
             )}
           </div>
           <div className="w-1 sm:w-0.5 bg-primary/40 rounded-full hover:bg-primary/60 transition-colors flex-shrink-0 cursor-grab active:cursor-grabbing relative">
             <div
               ref={scrollbarThumbRef}
               onMouseDown={handleScrollbarMouseDown}
               onTouchStart={handleScrollbarTouchStart}
               className="absolute left-0 w-full bg-primary/60 rounded-full transition-colors hover:bg-primary/80 cursor-grab active:cursor-grabbing"
               style={{
                 height: '12px',
                 top: `${thumbTop}px`,
               }}
             />
           </div>
          </div>
          </div>
          </>
          );
  }

  // Confirm team before generating PDF
  if (pending.length === 0 && confirmingTeam) {
    return (
      <div className="w-full h-full flex flex-col relative pb-safe">
        <Button variant="ghost" onClick={() => setConfirmingTeam(false)} className="gap-2 mb-3 -ml-2 text-muted-foreground hover:text-foreground text-xs sm:text-sm h-8 sm:h-10">
          <ArrowLeft className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
          Voltar
        </Button>
        <h1 className="text-base sm:text-lg font-bold mb-1">Confirmar Equipe</h1>
        <p className="text-xs text-muted-foreground mb-3 sm:mb-4">Revise os funcionários registrados.</p>
        
        <div
          ref={listContainerRef}
          className="flex-1 min-h-0 overflow-y-auto mb-4"
          onTouchStart={(e) => setTouchStart(e.touches[0].clientY)}
          onTouchEnd={(e) => {
            const touchEnd = e.changedTouches[0].clientY;
            const diff = touchStart - touchEnd;
            if (Math.abs(diff) > 10 && listContainerRef.current) {
              listContainerRef.current.scrollBy({ top: diff, behavior: 'smooth' });
            }
          }}
        >
          <div className="space-y-2 sm:space-y-3 pr-2">
            {completed.map((emp, idx) => (
              <div key={emp._key} className="flex items-start gap-3 bg-card border border-border rounded-lg sm:rounded-xl p-3 sm:p-4">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center flex-shrink-0 text-sm">
                  <span className="text-primary font-bold">{emp.full_name?.charAt(0).toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-xs sm:text-sm truncate">{emp.full_name}</p>
                  <p className="text-xs text-muted-foreground truncate">{emp.role}</p>
                </div>
                <CheckCircle className="w-4 sm:w-5 h-4 sm:h-5 text-emerald-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
        
        <div className="sticky bottom-0 bg-background pt-2 sm:pt-3 flex gap-2 sm:gap-3 border-t border-border">
          <Button
            variant="outline"
            onClick={() => setConfirmingTeam(false)}
            className="flex-1 h-10 sm:h-11 text-xs sm:text-sm"
          >
            Editar
          </Button>
          <Button
            onClick={generatePDF}
            disabled={generatingPdf}
            className="flex-1 h-10 sm:h-11 text-xs sm:text-sm gap-2 bg-gradient-to-r from-primary to-purple-600"
          >
            {generatingPdf ? (
              <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
            ) : (
              <FileDown className="w-4 sm:w-5 h-4 sm:h-5" />
            )}
            {generatingPdf ? "Gerando..." : "Confirmar"}
          </Button>
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
          onClick={() => setConfirmingTeam(true)}
          disabled={generatingPdf}
          className="w-full h-11 sm:h-12 text-sm sm:text-base font-semibold rounded-xl sm:rounded-2xl gap-2 sm:gap-3 bg-gradient-to-r from-primary to-purple-600 shadow-lg shadow-primary/30"
        >
          <FileDown className="w-5 sm:w-6 h-5 sm:h-6" />
          Confirmar Equipe
        </Button>
        <Button variant="ghost" onClick={onBack} className="mt-2 sm:mt-3 w-full text-xs sm:text-sm">
          Voltar ao Evento
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col relative">
    {/* Progress */}
    <div className="flex items-center justify-between mb-3 sm:mb-4 gap-1.5 sm:gap-2">
      <div className="min-w-0 flex-1">
        <h1 className="text-sm sm:text-lg font-bold truncate">Escala — {event.name}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {completed.length} de {completed.length + pending.length}
        </p>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
        <Users className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
        <span className="hidden xs:inline">{pending.length} restante(s)</span>
        <span className="xs:hidden">{pending.length}</span>
      </div>
    </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 sm:h-2 bg-muted rounded-full mb-2.5 sm:mb-4">
        <div
          className="h-1.5 sm:h-2 bg-gradient-to-r from-primary to-purple-600 rounded-full transition-all duration-500"
          style={{ width: `${(completed.length / (completed.length + pending.length)) * 100}%` }}
        />
      </div>

      {/* Group indicator */}


      {/* Current employee */}
      <div className="relative flex-1 min-h-0">
        <div ref={signatureRef} className="bg-card rounded-xl sm:rounded-2xl border border-border p-2.5 sm:p-5 shadow-sm space-y-2 sm:space-y-4 overflow-y-auto h-full">
          <div ref={employeeHeaderRef} className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {current.photo_url ? (
                <img src={current.photo_url} alt={current.full_name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-purple-200 flex items-center justify-center flex-shrink-0 text-sm">
                  <span className="text-primary font-bold">{current.full_name?.charAt(0).toUpperCase()}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xs sm:text-sm font-bold truncate">{current.full_name}</h2>
                <p className="text-xs text-muted-foreground truncate leading-snug">{current.role}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectMode(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-purple-600 text-white text-sm font-bold shadow-md active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4" />
              Não é esse — Voltar à escala
            </button>
          </div>

        {/* Valor */}
        {current.valor && (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-1.5 sm:py-2">
            <span className="text-xs font-medium text-emerald-800">Valor</span>
            <span className="text-sm sm:text-base font-bold text-emerald-700">R$ {current.valor}</span>
          </div>
        )}

        <div ref={signaturePadRef}>
          <SignaturePad key={`sig-${current._key}`} onSave={handleSignatureSave} />
        </div>

        {signatureConfirmed && (
         <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1 sm:py-1.5 border border-emerald-200">
           <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
           Assinatura confirmada
         </div>
        )}

        <div ref={cameraRef}>
          <CameraCapture key={`cam-${current._key}`} onCapture={handlePhotoCapture} />
        </div>

        {photoConfirmed && (
         <div className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-50 rounded-lg px-3 py-1 sm:py-1.5 border border-emerald-200">
           <CheckCircle className="w-3 sm:w-3.5 h-3 sm:h-3.5 flex-shrink-0" />
           Foto confirmada
         </div>
        )}

        <div ref={confirmButtonRef}>
        <Button
         onClick={handleConfirmEmployee}
         disabled={!signatureConfirmed || !photoConfirmed || saving}
         className="w-full h-9 sm:h-10 text-xs sm:text-sm font-semibold rounded-lg gap-2"
        >
         {saving ? (
           <Loader2 className="w-3.5 sm:w-4 h-3.5 sm:h-4 animate-spin" />
         ) : (
           <CheckCircle className="w-3.5 sm:w-4 h-3.5 sm:h-4" />
         )}
         {saving ? "Salvando..." : `Próximo`}
        </Button>
        </div>
        </div>
        {pending.length > 1 && (
        <div className="mt-2 bg-muted/50 rounded-lg p-2 sm:p-3">
         <p className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wide">Aguardando</p>
         <div
           ref={pendingListRef}
           className="space-y-0.5 max-h-20 overflow-y-auto text-xs"
           onTouchStart={(e) => setTouchStart(e.touches[0].clientY)}
           onTouchEnd={(e) => {
             const touchEnd = e.changedTouches[0].clientY;
             const diff = touchStart - touchEnd;
             if (Math.abs(diff) > 10 && pendingListRef.current) {
               pendingListRef.current.scrollTop += diff * 0.5;
             }
           }}
         >
           {pending.slice(1).map((emp) => (
             <div key={emp._key} className="flex items-center gap-1 text-muted-foreground">
               <div className="w-4 h-4 rounded-sm bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                 {emp.full_name?.charAt(0).toUpperCase()}
               </div>
               <span className="truncate text-xs">{emp.full_name}</span>
             </div>
           ))}
         </div>
        </div>
        )}
      </div>
      </div>
      );
      }
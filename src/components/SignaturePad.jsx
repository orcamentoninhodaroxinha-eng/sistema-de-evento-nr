import { useRef, useState, useEffect, useCallback } from "react";
import { Eraser, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SignaturePad({ onSave }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
  }, []);

  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }, []);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
    setHasSignature(true);
  }, [getPos]);

  const draw = useCallback((e) => {
    if (!isDrawing) return;
    e.preventDefault();
    e.stopPropagation();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }, [isDrawing, getPos]);

  const endDraw = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDrawing(false);
  }, []);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const file = new File([blob], "signature.png", { type: "image/png" });
      onSave(file);
    });
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Assinatura Digital
      </label>
      <div className="relative rounded-xl border-2 border-dashed border-border bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full touch-none cursor-crosshair"
          style={{ height: "200px" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-muted-foreground/50 text-sm">
              Desenhe sua assinatura aqui
            </p>
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={clearCanvas}
          className="gap-2"
        >
          <Eraser className="w-4 h-4" />
          Limpar
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={saveSignature}
          disabled={!hasSignature}
          className="gap-2"
        >
          <Check className="w-4 h-4" />
          Confirmar Assinatura
        </Button>
      </div>
    </div>
  );
}
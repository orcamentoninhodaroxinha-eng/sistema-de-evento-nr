import { useRef, useState, useCallback } from "react";
import { Camera, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState("user");

  const startCamera = useCallback(async (facing) => {
    const mode = facing || facingMode;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: mode, width: { ideal: 1920 }, height: { ideal: 2560 } },
      audio: false,
    });
    setStream(mediaStream);
    setCameraActive(true);
    setPhoto(null);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    }, 50);
  }, [stream, facingMode]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.97);
    setPhoto(dataUrl);
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setCameraActive(false);
  };

  const confirmPhoto = () => {
    const canvas = canvasRef.current;
    canvas.toBlob((blob) => {
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      onCapture(file);
    }, "image/jpeg", 0.97);
  };

  const retakePhoto = () => {
    setPhoto(null);
    startCamera();
  };

  const switchCamera = () => {
    const newMode = facingMode === "user" ? "environment" : "user";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setCameraActive(false);
    setPhoto(null);
  };

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-foreground">
        Foto do Funcionário
      </label>

      {!cameraActive && !photo && (
        <button
          type="button"
          onClick={() => startCamera()}
          className="w-full h-48 rounded-xl border-2 border-dashed border-border bg-accent/30 flex flex-col items-center justify-center gap-3 hover:bg-accent/50 transition-colors"
        >
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Camera className="w-7 h-7 text-primary" />
          </div>
          <span className="text-sm text-muted-foreground font-medium">
            Toque para abrir a câmera
          </span>
        </button>
      )}

      {cameraActive && (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full rounded-xl"
            style={{ maxHeight: "360px", objectFit: "cover" }}
          />
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={closeCamera}
              className="rounded-full h-11 w-11 bg-white/20 backdrop-blur-sm border-0 hover:bg-white/30"
            >
              <X className="w-5 h-5 text-white" />
            </Button>
            <Button
              type="button"
              size="icon"
              onClick={takePhoto}
              className="rounded-full h-16 w-16 bg-white hover:bg-white/90 shadow-xl"
            >
              <div className="w-12 h-12 rounded-full border-4 border-primary" />
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              onClick={switchCamera}
              className="rounded-full h-11 w-11 bg-white/20 backdrop-blur-sm border-0 hover:bg-white/30"
            >
              <RotateCcw className="w-5 h-5 text-white" />
            </Button>
          </div>
        </div>
      )}

      {photo && (
        <div className="space-y-3">
          <div className="rounded-xl overflow-hidden border border-border">
            <img
              src={photo}
              alt="Foto capturada"
              className="w-full object-cover"
              style={{ maxHeight: "360px" }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={retakePhoto}
              className="gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Tirar Outra
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={confirmPhoto}
              className="gap-2"
            >
              <Check className="w-4 h-4" />
              Confirmar Foto
            </Button>
          </div>
        </div>
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";

export default function InstallPWABanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    // Já está instalado como PWA
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    // Já foi dispensado antes
    if (localStorage.getItem("pwa_banner_dismissed")) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(ios);

    if (ios) {
      // No iOS, só mostra se for Safari
      const isSafari = /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
      if (isSafari) setShow(true);
    } else {
      // Android / Desktop: espera o evento beforeinstallprompt
      const handler = (e) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setShow(true);
      };
      window.addEventListener("beforeinstallprompt", handler);
      return () => window.removeEventListener("beforeinstallprompt", handler);
    }
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") dismiss();
    }
  };

  const dismiss = () => {
    setShow(false);
    localStorage.setItem("pwa_banner_dismissed", "1");
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-3 right-3 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 flex items-start gap-3 animate-fade-in">
      <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
        <img
          src="https://media.base44.com/images/public/69cbd80727489d185bf14962/7cb5516e1_download.png"
          alt="Ninho da Roxinha"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-foreground">Instalar na tela inicial</p>
        {isIOS ? (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Toque em <span className="font-semibold">Compartilhar</span> <span>⎙</span> e depois <span className="font-semibold">"Adicionar à Tela de Início"</span> para receber notificações.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
            Instale o app para receber notificações push mesmo com o celular bloqueado.
          </p>
        )}
        {!isIOS && (
          <button
            onClick={handleInstall}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Instalar agora
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
import { Bell, BellOff, X, Loader2 } from "lucide-react";
import { useState } from "react";

export default function PushPermissionBanner({ onRequest, loading, onDismiss }) {
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] w-[calc(100%-2rem)] max-w-sm">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3.5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold leading-tight">Ativar notificações</p>
          <p className="text-xs text-slate-400 mt-0.5">Receba avisos de eventos e escalas</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={onRequest}
            disabled={loading}
            className="h-8 px-3 bg-primary text-white text-xs font-semibold rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Ativar"}
          </button>
          <button
            onClick={onDismiss}
            className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
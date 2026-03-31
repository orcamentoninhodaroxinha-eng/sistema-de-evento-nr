import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertTriangle, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import PageTransition from "@/components/PageTransition";

const CONFIRM_WORD = "EXCLUIR";

export default function AccountDeletion() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [confirmText, setConfirmText] = useState("");
  const [done, setDone] = useState(false);

  const handleDelete = () => {
    if (confirmText !== CONFIRM_WORD) return;
    // Clear local session and mark as deleted
    sessionStorage.clear();
    localStorage.clear();
    setDone(true);
  };

  if (done) {
    return (
      <PageTransition>
        <div className="max-w-sm mx-auto text-center py-20 px-4">
          <div className="w-20 h-20 rounded-2xl bg-emerald-100 flex items-center justify-center mx-auto mb-5">
            <CheckCircle className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Conta Excluída</h2>
          <p className="text-muted-foreground text-sm mb-8">
            Todos os dados locais foram apagados. Para remover dados do servidor, entre em contato com o administrador.
          </p>
          <Button onClick={() => navigate("/")} className="w-full rounded-xl h-11">
            Voltar ao Início
          </Button>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="max-w-sm mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="gap-2 mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold">Excluir Conta</h1>
          <p className="text-sm text-muted-foreground mt-1 text-center">
            Esta ação é irreversível e apagará todos os dados locais.
          </p>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <p className="text-sm font-semibold text-amber-800">O que será apagado:</p>
              </div>
              <ul className="text-sm text-amber-700 space-y-1 ml-6 list-disc">
                <li>Sessão local do aplicativo</li>
                <li>Dados armazenados no dispositivo</li>
                <li>Preferências e configurações</li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Dados dos servidores precisam ser removidos pelo administrador.
            </p>
            <Button
              variant="destructive"
              className="w-full h-11 rounded-xl font-semibold"
              onClick={() => setStep(2)}
            >
              Continuar com a exclusão
            </Button>
            <Button
              variant="ghost"
              className="w-full h-11 rounded-xl"
              onClick={() => navigate(-1)}
            >
              Cancelar
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>
                Digite <span className="font-bold text-destructive">{CONFIRM_WORD}</span> para confirmar
              </Label>
              <Input
                placeholder={CONFIRM_WORD}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                className="h-12 text-center font-bold tracking-widest"
              />
            </div>
            <Button
              variant="destructive"
              className="w-full h-11 rounded-xl font-semibold"
              disabled={confirmText !== CONFIRM_WORD}
              onClick={handleDelete}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Excluir permanentemente
            </Button>
            <Button
              variant="ghost"
              className="w-full h-11 rounded-xl"
              onClick={() => setStep(1)}
            >
              Voltar
            </Button>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
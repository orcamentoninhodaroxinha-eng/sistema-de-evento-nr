import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import EventForm from "@/components/EventForm";
import PageTransition from "@/components/PageTransition";
import { useLoginUser } from "@/hooks/useLoginUser";

export default function EventFormPage() {
  const navigate = useNavigate();
  const loginUser = useLoginUser();
  const isAdmin = loginUser?.role === "admin" || loginUser?.role === "aprovador";

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="gap-2 mb-6 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="bg-white rounded-2xl border border-border/60 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Novo Evento</h1>
            <p className="text-muted-foreground text-sm mt-1">Preencha os dados para criar um novo evento</p>
          </div>

          <EventForm onSuccess={() => navigate("/")} isAdmin={isAdmin} />
        </div>
      </div>
    </PageTransition>
  );
}
import { useState } from "react";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  Calendar,
  BadgeCheck,
  FileSignature,
  Hash,
  Wallet,
  Sparkles,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLoginUser } from "@/hooks/useLoginUser";
import EmployeeEditForm from "./EmployeeEditForm";

export default function EmployeeDetail({ employee: initialEmployee, onBack }) {
  const [employee, setEmployee] = useState(initialEmployee);
  const [editing, setEditing] = useState(false);
  const loginUser = useLoginUser();
  const isAdmin = loginUser?.role === "admin";

  if (editing) {
    return (
      <EmployeeEditForm
        employee={employee}
        onBack={() => setEditing(false)}
        onSaved={(updated) => { setEmployee(updated); setEditing(false); }}
      />
    );
  }
  const statusColors = {
    Ativo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Inativo: "bg-slate-50 text-slate-600 border-slate-200",
    Afastado: "bg-amber-50 text-amber-700 border-amber-200",
  };

  const InfoRow = ({ icon: Icon, label, value }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
        <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-4 h-4 text-muted-foreground" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-sm font-medium text-foreground mt-0.5">{value}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          onClick={onBack}
          className="gap-2 -ml-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            className="gap-2 rounded-xl"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </Button>
        )}
      </div>

      <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
        {/* Badge funcionário novo */}
        {employee.is_new && (
          <div className="bg-amber-400 text-white text-xs font-bold px-4 py-2 flex items-center justify-center gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            FUNCIONÁRIO NOVO — CADASTRADO RECENTEMENTE
            <Sparkles className="w-3.5 h-3.5" />
          </div>
        )}

        {/* Header with photo */}
        <div className={`bg-gradient-to-br ${employee.is_new ? "from-amber-100 via-amber-50 to-primary/5" : "from-primary/10 via-accent to-primary/5"} p-6 flex flex-col items-center text-center`}>
          {employee.photo_url ? (
            <img
              src={employee.photo_url}
              alt={employee.full_name}
              className="w-24 h-24 rounded-2xl object-cover ring-4 ring-white shadow-lg"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center ring-4 ring-white shadow-lg">
              <User className="w-10 h-10 text-muted-foreground" />
            </div>
          )}
          <h2 className="text-xl font-bold mt-4">{employee.full_name}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employee.role}
          </p>
          <span
            className={`mt-3 text-xs font-medium px-3 py-1 rounded-full border ${
              statusColors[employee.status] || statusColors.Ativo
            }`}
          >
            {employee.status || "Ativo"}
          </span>
        </div>

        {/* Details */}
        <div className="p-6">
          {isAdmin && <InfoRow icon={Wallet} label="Chave Pix" value={employee.pix} />}
          {isAdmin && <InfoRow icon={Hash} label="CPF" value={employee.cpf} />}
          <InfoRow icon={Building2} label="Departamento" value={employee.department} />
          <InfoRow icon={Phone} label="Telefone" value={employee.phone} />
          <InfoRow icon={Mail} label="E-mail" value={employee.email} />
          <InfoRow
            icon={Calendar}
            label="Data de Admissão"
            value={
              employee.hire_date
                ? format(new Date(employee.hire_date), "dd 'de' MMMM 'de' yyyy", {
                    locale: ptBR,
                  })
                : null
            }
          />
        </div>

        {/* Signature */}
        {employee.signature_url && (
          <div className="px-6 pb-6">
            <div className="flex items-center gap-2 mb-3">
              <FileSignature className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">
                Assinatura
              </span>
            </div>
            <div className="rounded-xl border border-border bg-white p-4">
              <img
                src={employee.signature_url}
                alt="Assinatura"
                className="max-h-24 mx-auto"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
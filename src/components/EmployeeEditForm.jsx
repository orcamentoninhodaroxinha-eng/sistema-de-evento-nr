import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_OPTIONS = ["Ativo", "Inativo", "Afastado"];

export default function EmployeeEditForm({ employee, onBack, onSaved }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    full_name: employee.full_name || "",
    role: employee.role || "",
    department: employee.department || "",
    phone: employee.phone || "",
    email: employee.email || "",
    cpf: employee.cpf || "",
    pix: employee.pix || "",
    hire_date: employee.hire_date || "",
    status: employee.status || "Ativo",
  });
  const [saving, setSaving] = useState(false);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Employee.update(employee.id, form);
    queryClient.invalidateQueries({ queryKey: ["employees"] });
    setSaving(false);
    onSaved({ ...employee, ...form });
  };

  const Field = ({ label, field, type = "text", placeholder = "" }) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground block mb-1">{label}</label>
      <Input
        type={type}
        value={form[field]}
        onChange={e => set(field, e.target.value)}
        placeholder={placeholder}
        className="h-10 rounded-xl"
      />
    </div>
  );

  return (
    <div className="max-w-lg mx-auto">
      <Button
        variant="ghost"
        onClick={onBack}
        className="gap-2 mb-4 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" />
        Cancelar
      </Button>

      <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-4">
        <h2 className="text-lg font-bold">Editar Funcionário</h2>

        <Field label="Nome Completo *" field="full_name" placeholder="Nome completo" />
        <Field label="Cargo *" field="role" placeholder="Ex: Cozinheiro, Garçom..." />
        <Field label="Departamento" field="department" placeholder="Ex: Cozinha, Salão..." />

        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1">Status</label>
          <select
            value={form.status}
            onChange={e => set("status", e.target.value)}
            className="w-full h-10 rounded-xl border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato & Pagamento</p>
          <Field label="Telefone" field="phone" type="tel" placeholder="(11) 99999-9999" />
          <Field label="E-mail" field="email" type="email" placeholder="email@exemplo.com" />
          <Field label="CPF" field="cpf" placeholder="000.000.000-00" />
          <Field label="Chave Pix" field="pix" placeholder="CPF, e-mail, telefone ou chave aleatória" />
        </div>

        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dados Profissionais</p>
          <Field label="Data de Admissão" field="hire_date" type="date" />
        </div>

        <Button
          onClick={handleSave}
          disabled={saving || !form.full_name || !form.role}
          className="w-full h-11 rounded-xl gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  );
}
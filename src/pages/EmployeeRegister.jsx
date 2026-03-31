import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, FileSignature, Camera } from "lucide-react";
import SignaturePad from "../components/SignaturePad";
import CameraCapture from "../components/CameraCapture";

const DEPARTMENTS = [
  "Administração",
  "Financeiro",
  "RH",
  "TI",
  "Operações",
  "Comercial",
  "Marketing",
  "Logística",
  "Outro",
];

const STATUSES = ["Ativo", "Inativo", "Afastado"];

export default function EmployeeRegister() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [signatureFile, setSignatureFile] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [signatureConfirmed, setSignatureConfirmed] = useState(false);
  const [photoConfirmed, setPhotoConfirmed] = useState(false);

  const [form, setForm] = useState({
    full_name: "",
    cpf: "",
    role: "",
    department: "",
    phone: "",
    email: "",
    hire_date: "",
    status: "Ativo",
  });

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignatureSave = (file) => {
    setSignatureFile(file);
    setSignatureConfirmed(true);
    toast({ title: "Assinatura salva com sucesso!" });
  };

  const handlePhotoCapture = (file) => {
    setPhotoFile(file);
    setPhotoConfirmed(true);
    toast({ title: "Foto capturada com sucesso!" });
  };

  const canGoStep2 = form.full_name && form.role && form.department;
  const canGoStep3 = signatureConfirmed;

  const handleSubmit = async () => {
    setSaving(true);
    let signatureUrl = "";
    let photoUrl = "";

    if (signatureFile) {
      const res = await base44.integrations.Core.UploadFile({ file: signatureFile });
      signatureUrl = res.file_url;
    }
    if (photoFile) {
      const res = await base44.integrations.Core.UploadFile({ file: photoFile });
      photoUrl = res.file_url;
    }

    await base44.entities.Employee.create({
      ...form,
      signature_url: signatureUrl,
      photo_url: photoUrl,
    });

    setSaving(false);
    toast({
      title: "Funcionário registrado!",
      description: `${form.full_name} foi cadastrado com sucesso.`,
      duration: 2000,
    });
    navigate("/");
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${
                step === s
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110"
                  : step > s
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 3 && (
              <div
                className={`w-12 sm:w-20 h-0.5 rounded-full transition-colors duration-300 ${
                  step > s ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {step === 1 && "Dados do Funcionário"}
          {step === 2 && "Assinatura Digital"}
          {step === 3 && "Foto do Funcionário"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {step === 1 && "Preencha as informações pessoais"}
          {step === 2 && "Desenhe a assinatura na tela"}
          {step === 3 && "Tire uma foto com a câmera"}
        </p>
      </div>

      {/* Step 1: Form */}
      {step === 1 && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm">
          <div>
            <Label htmlFor="full_name">Nome Completo *</Label>
            <Input
              id="full_name"
              placeholder="João da Silva"
              value={form.full_name}
              onChange={(e) => updateField("full_name", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              placeholder="000.000.000-00"
              value={form.cpf}
              onChange={(e) => updateField("cpf", e.target.value)}
              className="mt-1.5"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="role">Cargo *</Label>
              <Input
                id="role"
                placeholder="Ex: Analista"
                value={form.role}
                onChange={(e) => updateField("role", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Departamento *</Label>
              <Select
                value={form.department}
                onValueChange={(v) => updateField("department", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={form.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@empresa.com"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="hire_date">Data de Admissão</Label>
              <Input
                id="hire_date"
                type="date"
                value={form.hire_date}
                onChange={(e) => updateField("hire_date", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => updateField("status", v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={() => setStep(2)}
            disabled={!canGoStep2}
            className="w-full h-12 text-base font-semibold rounded-xl gap-2"
          >
            <FileSignature className="w-5 h-5" />
            Próximo: Assinatura
          </Button>
        </div>
      )}

      {/* Step 2: Signature */}
      {step === 2 && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm">
          <SignaturePad onSave={handleSignatureSave} />

          {signatureConfirmed && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
              Assinatura confirmada
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(1)}
              className="flex-1 h-12 rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={() => setStep(3)}
              disabled={!canGoStep3}
              className="flex-1 h-12 text-base font-semibold rounded-xl gap-2"
            >
              <Camera className="w-5 h-5" />
              Próximo: Foto
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Photo */}
      {step === 3 && (
        <div className="bg-card rounded-2xl border border-border p-6 space-y-5 shadow-sm">
          <CameraCapture onCapture={handlePhotoCapture} />

          {photoConfirmed && (
            <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg px-4 py-3 border border-emerald-200">
              <CheckCircle className="w-4 h-4" />
              Foto confirmada
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setStep(2)}
              className="flex-1 h-12 rounded-xl"
            >
              Voltar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 h-12 text-base font-semibold rounded-xl gap-2"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {saving ? "Salvando..." : "Finalizar Registro"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
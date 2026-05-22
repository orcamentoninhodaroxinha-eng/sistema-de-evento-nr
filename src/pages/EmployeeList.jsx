import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserPlus, Users, Loader2, FileDown, ChevronDown, ChevronUp } from "lucide-react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeDetail from "../components/EmployeeDetail";
import { useLoginUser } from "@/hooks/useLoginUser";

export default function EmployeeList() {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [collapsed, setCollapsed] = useState(true);

  const loginUser = useLoginUser();
  const isAdmin = loginUser?.role === "admin";
  const isAndreF = loginUser?.role === "salao";
  const isJuberly = loginUser?.role === "cozinha";

  // Cargos visíveis por papel
  const ANDREF_ROLES = ["Salão", "Limpeza", "Segurança", "Garçom", "Copeiro", "Recepção", "Recepcionista", "Mestre de Cerimônias", "DJ", "Assessor"];
  const JUBERLY_ROLES = ["Cozinha", "Ajudante", "Cozinheiro", "Cozinheira"];

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 500),
    staleTime: 5 * 60 * 1000,
  });

  // Filtra por papel do usuário logado
  const roleFiltered = (employees || []).filter((emp) => {
    if (isAdmin) return true;
    const roleNorm = (emp.role || "").toLowerCase().trim();
    if (isAndreF) return ANDREF_ROLES.map(r => r.toLowerCase()).includes(roleNorm);
    if (isJuberly) return JUBERLY_ROLES.map(r => r.toLowerCase()).includes(roleNorm);
    return false;
  });

  const filtered = roleFiltered.filter((emp) => {
    const q = search.toLowerCase();
    return (
      emp.full_name?.toLowerCase().includes(q) ||
      emp.role?.toLowerCase().includes(q) ||
      emp.department?.toLowerCase().includes(q)
    );
  });

  if (selectedEmployee) {
    return (
      <EmployeeDetail
        employee={selectedEmployee}
        onBack={() => setSelectedEmployee(null)}
      />
    );
  }

  const exportExcel = () => {
    const rows = employees.map(emp => ({
      "Nome": emp.full_name || "",
      "Cargo": emp.role || "",
      "Departamento": emp.department || "",
      "Telefone": emp.phone || "",
      "E-mail": emp.email || "",
      "CPF": emp.cpf || "",
      "Pix": emp.pix || "",
      "Data de Admissão": emp.hire_date || "",
      "Status": emp.status || "Ativo",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Funcionários");
    XLSX.writeFile(wb, "funcionarios_ninho_da_roxinha.xlsx");
  };

  const counts = {
    total: roleFiltered?.length || 0,
    salao: roleFiltered?.filter(e => ANDREF_ROLES.map(r => r.toLowerCase()).includes((e.role || "").toLowerCase().trim())).length || 0,
    cozinha: roleFiltered?.filter(e => JUBERLY_ROLES.map(r => r.toLowerCase()).includes((e.role || "").toLowerCase().trim())).length || 0,
    seguranca: roleFiltered?.filter(e => (e.role || "").toLowerCase().trim() === 'segurança').length || 0,
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
            <p className="text-muted-foreground mt-0.5 text-xs">{roleFiltered.length} colaboradores cadastrados</p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <button
                  onClick={exportExcel}
                  disabled={employees.length === 0}
                  className="inline-flex items-center justify-center gap-2 h-9 px-3 border border-border bg-white rounded-xl font-semibold text-xs hover:bg-accent transition-colors shadow-sm disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5 text-primary" />
                  Exportar
                </button>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 h-9 px-4 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold text-xs hover:opacity-90 transition-opacity shadow-md shadow-primary/30"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Novo
                </Link>
              </>
            )}
            {/* Botão recolher/expandir para não-admins */}
            {!isAdmin && (
              <button
                onClick={() => setCollapsed(c => !c)}
                className="flex items-center gap-1.5 h-9 px-3 rounded-xl border border-border bg-white text-xs font-medium text-muted-foreground hover:bg-accent transition-colors"
              >
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                {collapsed ? "Ver equipe" : "Recolher"}
              </button>
            )}
          </div>
        </div>

        {/* Stats — apenas admin ou quando expandido */}
        {(isAdmin || !collapsed) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Total", value: counts.total, color: "from-primary/10 to-purple-100", text: "text-primary" },
              { label: "Salão", value: counts.salao, color: "from-blue-50 to-blue-100", text: "text-blue-600" },
              { label: "Cozinha", value: counts.cozinha, color: "from-orange-50 to-orange-100", text: "text-orange-600" },
              { label: "Segurança", value: counts.seguranca, color: "from-red-50 to-red-100", text: "text-red-600" },
            ].map(stat => (
              <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-3 border border-white/80`}>
                <p className={`text-xl font-bold ${stat.text}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Conteúdo recolhível para não-admins */}
      {collapsed && !isAdmin ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-accent/30 rounded-2xl border border-border/50">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-3">
            <Users className="w-7 h-7 text-primary/50" />
          </div>
          <p className="font-semibold text-sm">Lista de Equipe</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Toque em "Ver equipe" para expandir</p>
          <button
            onClick={() => setCollapsed(false)}
            className="flex items-center gap-2 h-10 px-5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-md shadow-primary/20 active:scale-95"
          >
            <ChevronDown className="w-4 h-4" />
            Ver equipe
          </button>
        </div>
      ) : (
        <>
      {/* Search */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, cargo ou departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-11 h-12 rounded-2xl bg-white border-border/50 shadow-sm focus-visible:ring-primary/20"
        />
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-accent flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="font-semibold text-lg">Nenhum funcionário encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {search ? "Tente mudar os termos de busca" : "Comece registrando o primeiro funcionário"}
          </p>
          {!search && (
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium text-sm"
            >
              <UserPlus className="w-4 h-4" />
              Registrar Funcionário
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-2.5">
            {filtered.map((emp) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onClick={() => setSelectedEmployee(emp)}
              />
            ))}
          </div>

        </>
      )}
        </>
      )}
    </div>
  );
}
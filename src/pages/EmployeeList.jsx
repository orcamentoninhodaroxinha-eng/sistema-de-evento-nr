import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserPlus, Users, Loader2, FileDown } from "lucide-react";
import * as XLSX from "xlsx";
import { Input } from "@/components/ui/input";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeDetail from "../components/EmployeeDetail";

export default function EmployeeList() {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const observerTarget = useRef(null);
  const queryClient = useQueryClient();

  const { data, isLoading, hasNextPage, fetchNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["employees"],
    queryFn: ({ pageParam = 0 }) => base44.entities.Employee.list("-created_date", 100),
    getNextPageParam: (lastPage, pages) => pages.length,
    initialPageParam: 0,
  });

  const employees = data?.pages?.flat() || [];

  const filtered = (employees || []).filter((emp) => {
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
    total: employees?.length || 0,
    salao: employees?.filter(e => e.role === 'Salão').length || 0,
    cozinha: employees?.filter(e => e.role === 'Cozinha').length || 0,
    seguranca: employees?.filter(e => e.role === 'Segurança').length || 0,
  };

  return (
    <div>
      {/* Hero Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
              Funcionários
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Gerencie todos os colaboradores cadastrados
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportExcel}
              disabled={employees.length === 0}
              className="inline-flex items-center justify-center gap-2 h-11 px-4 border border-border bg-white rounded-xl font-semibold text-sm hover:bg-accent transition-colors shadow-sm disabled:opacity-50"
            >
              <FileDown className="w-4 h-4 text-primary" />
              Exportar Excel
            </button>
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-gradient-to-r from-primary to-purple-600 text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/30"
            >
              <UserPlus className="w-4 h-4" />
              Novo Registro
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[
            { label: "Total", value: counts.total, color: "from-primary/10 to-purple-100", text: "text-primary" },
            { label: "Salão", value: counts.salao, color: "from-blue-50 to-blue-100", text: "text-blue-600" },
            { label: "Cozinha", value: counts.cozinha, color: "from-orange-50 to-orange-100", text: "text-orange-600" },
            { label: "Segurança", value: counts.seguranca, color: "from-red-50 to-red-100", text: "text-red-600" },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.color} rounded-2xl p-4 border border-white/80`}>
              <p className={`text-2xl font-bold ${stat.text}`}>{stat.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

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
          <div ref={observerTarget} className="h-4" />
          {isFetchingNextPage && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}
        </>
      )}
    </div>
  );
}
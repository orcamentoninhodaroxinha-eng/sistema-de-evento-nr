import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, UserPlus, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import EmployeeCard from "../components/EmployeeCard";
import EmployeeDetail from "../components/EmployeeDetail";

export default function EmployeeList() {
  const [search, setSearch] = useState("");
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  const { data: employees, isLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: () => base44.entities.Employee.list("-created_date", 100),
  });

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

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Funcionários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {employees?.length || 0} registros cadastrados
          </p>
        </div>
        <Link
          to="/register"
          className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity shadow-lg shadow-primary/20"
        >
          <UserPlus className="w-4 h-4" />
          Novo Registro
        </Link>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, cargo ou departamento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-11 rounded-xl bg-card"
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
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">Nenhum funcionário encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-5">
            {search
              ? "Tente mudar os termos de busca"
              : "Comece registrando o primeiro funcionário"}
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
        <div className="grid gap-3">
          {filtered.map((emp) => (
            <EmployeeCard
              key={emp.id}
              employee={emp}
              onClick={() => setSelectedEmployee(emp)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, TrendingDown, TrendingUp, Minus } from "lucide-react";
import * as XLSX from "xlsx";

function parseBRL(str = "") {
  const clean = str.replace(/[R$\s.]/g, "").replace(",", ".");
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function formatBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchXlsxGrandTotal(url) {
  try {
    const buffer = await fetch(url).then((r) => r.arrayBuffer());
    const wb = XLSX.read(buffer, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
    // Procura linha "TOTAL GERAL" e pega o valor na coluna C (índice 2)
    for (const row of rows) {
      const label = String(row[0] || "").toUpperCase().trim();
      if (label === "TOTAL GERAL") {
        const val = parseFloat(row[2]);
        if (!isNaN(val)) return val;
      }
    }
    return 0;
  } catch {
    return 0;
  }
}

// Componente reutilizável — pode ser usado no EventDetail e em Approvals
export default function FinanceCalcBox({ event, csvUrl, editable = false }) {
  const [saleValue, setSaleValue] = useState(event.sale_value || "");
  const [scaleTotal, setScaleTotal] = useState(null);

  useEffect(() => {
    if (csvUrl) fetchXlsxGrandTotal(csvUrl).then(setScaleTotal);
  }, [csvUrl]);

  const saleNum = parseBRL(saleValue);
  const budget15 = saleNum * 0.15;
  const diff = scaleTotal !== null ? budget15 - scaleTotal : null;

  return (
    <div className="space-y-3">
      {/* Valor do Evento */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Valor do Evento
        </label>
        {editable ? (
          <input
            type="text"
            placeholder="Ex: 15000"
            value={saleValue}
            onChange={(e) => setSaleValue(e.target.value)}
            onBlur={async () => {
              if (saleValue !== (event.sale_value || "")) {
                await base44.entities.Event.update(event.id, { sale_value: saleValue });
                event.sale_value = saleValue;
              }
            }}
            className="w-full h-10 px-3 rounded-xl border border-emerald-300 bg-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-400"
          />
        ) : (
          <div className="h-10 px-3 rounded-xl border border-emerald-200 bg-white text-sm flex items-center font-semibold text-emerald-800">
            {saleNum > 0 ? formatBRL(saleNum) : <span className="text-muted-foreground">Não informado</span>}
          </div>
        )}
      </div>

      {/* 15% do valor */}
      {saleNum > 0 && (
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{formatBRL(saleNum)} × 15% =</span>
          <span className="font-bold text-emerald-700 text-base">{formatBRL(budget15)}</span>
        </div>
      )}

      {/* Margem: 15% − total da escala */}
      {saleNum > 0 && scaleTotal !== null && (
        <div className="bg-white border border-emerald-200 rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-emerald-800 uppercase tracking-wide">Margem da Escala</p>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">15% do evento</span>
              <span className="font-semibold text-emerald-700">{formatBRL(budget15)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">− Total das escalas</span>
              <span className="font-semibold text-slate-700">{formatBRL(scaleTotal)}</span>
            </div>
            <div className="border-t border-emerald-100 pt-2 flex justify-between items-center">
              <span className="font-semibold">{diff >= 0 ? "Sobra" : "Estouro"}</span>
              <span className={`font-bold text-base flex items-center gap-1 ${diff >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {diff > 0 ? <TrendingUp className="w-4 h-4" /> : diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                {formatBRL(Math.abs(diff))}
              </span>
            </div>
          </div>
          <div className={`rounded-lg px-3 py-2 text-xs font-semibold text-center ${diff >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
            {diff >= 0
              ? `✅ Dentro do orçamento — sobram ${formatBRL(diff)}`
              : `⚠️ Orçamento estourado em ${formatBRL(Math.abs(diff))}`}
          </div>
        </div>
      )}
    </div>
  );
}
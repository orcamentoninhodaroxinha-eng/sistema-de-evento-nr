import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { DollarSign, FileSpreadsheet, TrendingDown, TrendingUp, Minus } from "lucide-react";

function parseBRL(str = "") {
  // Aceita "15000", "15.000,00", "R$ 15.000,00"
  const clean = str.replace(/[R$\s.]/g, "").replace(",", ".");
  const val = parseFloat(clean);
  return isNaN(val) ? 0 : val;
}

function formatBRL(val) {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function fetchCsvTotal(url) {
  try {
    const text = await fetch(url).then((r) => r.text());
    const lines = text.trim().split("\n");
    let total = 0;
    for (const line of lines) {
      const upper = line.toUpperCase();
      if (upper.startsWith("TOTAL")) {
        // linha de total: "TOTAL;;150,00" ou "TOTAL;;150.00"
        const parts = line.split(";");
        const valStr = parts[parts.length - 1]?.trim();
        total += parseBRL(valStr);
      }
    }
    return total;
  } catch {
    return 0;
  }
}

export default function UnifiedScaleAdminBox({ event, scaleCsvUrl }) {
  const [saleValue, setSaleValue] = useState(event.sale_value || "");
  const [scaleTotal, setScaleTotal] = useState(null);

  const csvUrl = event.unified_scale_csv_url || scaleCsvUrl;

  useEffect(() => {
    if (csvUrl) {
      fetchCsvTotal(csvUrl).then(setScaleTotal);
    }
  }, [csvUrl]);

  const saleNum = parseBRL(saleValue);
  const budget15 = saleNum * 0.15;
  const diff = scaleTotal !== null ? budget15 - scaleTotal : null;

  return (
    <div className="mt-6 bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-300 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <span className="text-xl">📊</span>
        <div>
          <h2 className="font-bold text-emerald-800">Escala Unificada Aprovada</h2>
          <p className="text-xs text-emerald-600">Cozinha + Salão — pronta para lançar no ME Eventos</p>
        </div>
      </div>

      {/* Valor de Venda */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Valor do Evento
        </label>
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
      </div>

      {/* Cálculo dos 15% — aparece assim que houver valor */}
      {saleNum > 0 && (
        <div className="bg-white border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {formatBRL(saleNum)} × 15% =
          </span>
          <span className="font-bold text-emerald-700 text-base">{formatBRL(budget15)}</span>
        </div>
      )}

      {/* Caixa de resultado: 15% − total da escala */}
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

      {/* Download */}
      <a
        href={csvUrl}
        download
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold transition-colors"
      >
        <FileSpreadsheet className="w-5 h-5" />
        Baixar Excel Unificado
      </a>
    </div>
  );
}
import { FileSpreadsheet } from "lucide-react";
import FinanceCalcBox from "./FinanceCalcBox";

export default function UnifiedScaleAdminBox({ event, scaleCsvUrl }) {
  const csvUrl = event.unified_scale_csv_url || scaleCsvUrl;

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

      {/* Cálculo financeiro */}
      <FinanceCalcBox event={event} csvUrl={csvUrl} editable={true} />
    </div>
  );
}
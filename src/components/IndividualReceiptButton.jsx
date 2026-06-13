import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function IndividualReceiptButton({ employee, onOpenScale }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onOpenScale(employee)}
      className="gap-1.5 rounded-xl text-xs sm:text-sm h-9 sm:h-8 px-3 border-emerald-300 text-emerald-700 hover:bg-emerald-50 active:bg-emerald-100 transition-colors touch-manipulation"
    >
      <FileDown className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
      Recibo
    </Button>
  );
}
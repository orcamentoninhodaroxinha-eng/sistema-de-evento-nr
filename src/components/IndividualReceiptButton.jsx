import { Button } from "@/components/ui/button";
import { FileDown } from "lucide-react";

export default function IndividualReceiptButton({ employee, onOpenScale }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => onOpenScale(employee)}
      className="gap-1.5 rounded-xl text-xs h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
    >
      <FileDown className="w-3 h-3" />
      Recibo
    </Button>
  );
}
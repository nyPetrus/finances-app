import type { Category } from "@/lib/supabase/types";
import { TRANSACTION_TYPE_SYMBOL_ROTATION, TRANSACTION_TYPE_SYMBOLS } from "@/lib/transaction-type";
import { cn } from "@/lib/utils";

const TRANSACTION_TYPE_LABELS: Record<Category["kind"], string> = {
  expense: "Expense",
  income: "Income",
  transfer: "Transfer",
};

// Pickers show the type's arrow + name, like AutonomyOptionLabel.
export function TransactionTypeOptionLabel({ kind }: { kind: Category["kind"] }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("inline-block w-3.5 text-center font-bold", TRANSACTION_TYPE_SYMBOL_ROTATION[kind])}>
        {TRANSACTION_TYPE_SYMBOLS[kind]}
      </span>
      {TRANSACTION_TYPE_LABELS[kind]}
    </span>
  );
}

import { BanknoteIcon, CircleEllipsisIcon, CreditCardIcon, PiggyBankIcon, type LucideIcon } from "lucide-react";
import type { Account } from "@/lib/supabase/types";
import { cn } from "@/lib/utils";

type AccountType = Account["type"];

// Picker order. The stored "manual" value is labeled "Other".
export const ACCOUNT_TYPES: AccountType[] = ["checking", "investment", "credit_card", "manual"];

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: "Checking",
  investment: "Investment",
  credit_card: "Credit card",
  manual: "Other",
};

const ACCOUNT_TYPE_ICONS: Record<AccountType, LucideIcon> = {
  checking: BanknoteIcon,
  investment: PiggyBankIcon,
  credit_card: CreditCardIcon,
  manual: CircleEllipsisIcon,
};

// Displays show just the symbol, name as a tooltip; the inline-flex wrapper
// lets a centered table cell actually center it (svg is display:block).
export function AccountTypeIcon({ type, className }: { type: AccountType; className?: string }) {
  const Icon = ACCOUNT_TYPE_ICONS[type];
  return (
    <span title={ACCOUNT_TYPE_LABELS[type]} className="inline-flex">
      <Icon className={cn("size-4", className)} aria-label={ACCOUNT_TYPE_LABELS[type]} />
    </span>
  );
}

// Pickers show symbol + name so the choice stays unambiguous.
export function AccountTypeOptionLabel({ type }: { type: AccountType }) {
  const Icon = ACCOUNT_TYPE_ICONS[type];
  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" />
      {ACCOUNT_TYPE_LABELS[type]}
    </span>
  );
}

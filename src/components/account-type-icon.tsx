import {
  CircleEllipsisIcon,
  CreditCardIcon,
  FileUpIcon,
  LandmarkIcon,
  PiggyBankIcon,
  PlugZapIcon,
  type LucideIcon,
} from "lucide-react";
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
  checking: LandmarkIcon,
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

// Pickers show an account as it renders everywhere else: its type icon,
// then its name (icon first, like every other symbol + name in the app).
export function AccountOptionLabel({ account }: { account: Pick<Account, "name" | "type"> }) {
  const Icon = ACCOUNT_TYPE_ICONS[account.type];
  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon className="size-3.5 shrink-0" aria-label={ACCOUNT_TYPE_LABELS[account.type]} />
      <span className="truncate">{account.name}</span>
    </span>
  );
}

// Source symbol: keyed on is_automatic rather than the free-text `source`
// (Pluggy writes its connector's name there, e.g. "MeuPluggy"), so any
// future connector gets the plug too. Plug matches the "Connect bank" menu
// item; file-up because manual accounts are fed by statement file imports.
// The tooltip keeps the actual source text.
export function AccountSourceIcon({ account, className }: { account: Account; className?: string }) {
  const Icon = account.is_automatic ? PlugZapIcon : FileUpIcon;
  const label = account.source ?? (account.is_automatic ? "Connected" : "Manual");
  return (
    <span title={label} className="inline-flex">
      <Icon className={cn("size-4", className)} aria-label={label} />
    </span>
  );
}

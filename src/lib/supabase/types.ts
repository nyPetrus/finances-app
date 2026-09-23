export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  icon: string;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
};

// How long a financial commitment lasts: "high" = finite (ends on its own,
// e.g. a loan installment), "low" = recurs indefinitely (rent, insurance).
export type Gordura = "high" | "low";

export type Class = {
  id: string;
  user_id: string;
  name: string;
  default_gordura: Gordura | null;
  is_active: boolean;
  created_at: string;
  // Categories this class is linked to (category_classes rows), filled in by
  // fetchClasses — not a real column.
  category_ids: string[];
};

export type MappedDescription = {
  user_id: string;
  description: string;
  category_id: string;
  class_id: string | null;
  check_type: "equal_to" | "starts_with" | "contains";
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  source: string | null;
  label: string | null;
  type: "checking" | "investment" | "fgts" | "manual" | "credit_card";
  is_automatic: boolean;
  pluggy_item_id: string | null;
  pluggy_account_id: string | null;
  current_balance: number;
  google_drive_folder_id: string | null;
  updated_at: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  class_id: string | null;
  date: string;
  description: string;
  amount: number;
  source: "manual" | "pluggy" | "csv";
  pluggy_transaction_id: string | null;
  import_hash: string | null;
  // Bank-reported end-of-day balance from an imported statement; null otherwise.
  balance: number | null;
  // Manual override only; see effectiveGordura for the value to display.
  gordura: Gordura | null;
  is_hidden: boolean;
  created_at: string;
};

export type BudgetItem = {
  id: string;
  user_id: string;
  year: number;
  month: number;
  category_id: string;
  planned_amount: number;
  created_at: string;
};

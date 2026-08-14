export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: "income" | "expense" | "transfer";
  color: string;
  is_default: boolean;
  created_at: string;
};

export type Account = {
  id: string;
  user_id: string;
  name: string;
  institution: string | null;
  type: "checking" | "investment" | "fgts" | "manual" | "credit_card";
  is_automatic: boolean;
  pluggy_item_id: string | null;
  pluggy_account_id: string | null;
  current_balance: number;
  updated_at: string;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string | null;
  date: string;
  description: string;
  amount: number;
  source: "manual" | "pluggy" | "csv";
  pluggy_transaction_id: string | null;
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

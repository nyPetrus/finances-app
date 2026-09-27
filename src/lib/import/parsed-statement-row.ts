// The common shape every bank-statement CSV parser in this directory
// produces, so statement-import.ts's insert/dedupe logic stays generic
// across formats.
export type ParsedStatementRow = {
  // "YYYY-MM-DD" — the statement carries no time of day.
  date: string;
  description: string;
  // Signed: income positive, expense negative.
  amount: number;
  // The bank's own per-day/per-transaction balance, when the format has one.
  balance: number | null;
  // A stable id from the source file itself (e.g. Nubank's own transaction
  // id), when the format provides one. When present, statement-import.ts
  // dedupes on this directly instead of its date+amount+description+
  // occurrence fallback, since it's exact rather than best-effort.
  externalId?: string;
};

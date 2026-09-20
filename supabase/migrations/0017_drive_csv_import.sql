-- Support importing bank-statement CSVs from a Google Drive folder into a
-- manual account (see the google-drive-conventions skill).

-- Which Drive folder holds this account's statement files.
alter table public.accounts
  add column google_drive_folder_id text;

-- The bank's own end-of-day balance ("Saldo do dia") as printed in the
-- statement, kept as-is on each imported row. Null for every other source.
alter table public.transactions
  add column balance numeric(14, 2);

-- CSV rows have no stable id like Pluggy's transaction id, so imports
-- derive one by hashing date + amount + description + an occurrence
-- counter (so genuinely identical same-day rows survive). The unique index
-- is the safety net behind the import's own existing-hash lookup; rows
-- without a hash (manual/pluggy) are unaffected since nulls never collide.
alter table public.transactions
  add column import_hash text;

create unique index transactions_account_import_hash_key
  on public.transactions (account_id, import_hash);

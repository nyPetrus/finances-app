-- When a statement file was last imported into this account (CSV upload or
-- Drive folder import). The Accounts table's "Last update" column shows it
-- for manual accounts; automatic accounts keep using updated_at (last sync).
alter table public.accounts
  add column last_imported_at timestamptz;

-- Backfill from the newest imported row: imported transactions are the ones
-- carrying an import_hash, and created_at is when that import ran.
update public.accounts a
set last_imported_at = t.last_import
from (
  select account_id, max(created_at) as last_import
  from public.transactions
  where import_hash is not null
  group by account_id
) t
where t.account_id = a.id;

-- Allows upserting synced accounts by their Pluggy account id.
-- Multiple NULLs are allowed by Postgres unique constraints, so manual
-- accounts (pluggy_account_id = null) are unaffected.
alter table public.accounts
  add constraint accounts_pluggy_account_id_key unique (pluggy_account_id);

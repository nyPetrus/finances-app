-- Allow syncing credit card accounts from Pluggy. Credit card balances are
-- stored as negative (debt owed), so the dashboard's total-balance sum
-- across accounts stays correct without special-casing the account type.
alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts add constraint accounts_type_check
  check (type in ('checking', 'investment', 'fgts', 'manual', 'credit_card'));

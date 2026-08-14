-- Lets a category be marked as a transfer between the user's own accounts
-- (e.g. a credit card bill payment), so it can be excluded from income and
-- expense totals instead of skewing them in both directions.
alter table public.categories drop constraint categories_kind_check;
alter table public.categories add constraint categories_kind_check
  check (kind in ('income', 'expense', 'transfer'));

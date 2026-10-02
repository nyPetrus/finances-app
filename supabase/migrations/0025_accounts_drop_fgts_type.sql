-- FGTS is no longer an account type (an FGTS balance is just an
-- Investment account). Any leftover FGTS accounts become Investment.
-- The 'manual' value stays as-is; the UI labels it "Other".
update public.accounts set type = 'investment' where type = 'fgts';

alter table public.accounts drop constraint accounts_type_check;
alter table public.accounts add constraint accounts_type_check
  check (type in ('checking', 'investment', 'manual', 'credit_card'));

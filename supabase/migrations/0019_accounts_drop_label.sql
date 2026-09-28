-- The separate "Account" alias (accounts.label, added in 0014) is folded
-- into accounts.name, which is now the single user-editable account name:
-- Pluggy sync only sets name when it first creates an account and never
-- overwrites it afterwards (see syncPluggyItem in pluggy-actions.ts).
--
-- Keep every alias the user already set by copying it into name first,
-- then drop the column. Run this AFTER the app code that stops reading
-- label has deployed.

update public.accounts
set name = btrim(label)
where label is not null and btrim(label) <> '';

alter table public.accounts drop column label;

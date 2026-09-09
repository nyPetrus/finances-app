-- "institution" is renamed to "source" (still the bank/institution name,
-- e.g. "Nubank") to make room for a distinct "label" field: a short,
-- user-editable nickname for the account, shown as the "Account" column.
alter table public.accounts rename column institution to source;

alter table public.accounts add column label text;

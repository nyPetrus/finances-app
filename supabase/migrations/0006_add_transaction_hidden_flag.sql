-- Manual hide/ignore flag, e.g. for a Pluggy transaction that was
-- canceled at the source but that Pluggy hasn't stopped returning yet.
-- The Pluggy sync upsert never sets this column, so it survives re-syncs.
alter table public.transactions add column is_hidden boolean not null default false;

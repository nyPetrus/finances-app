-- Lets a description mapping match transactions by exact equality
-- (the only mode until now), by prefix, or by substring, instead of
-- only exact matches. Existing rows default (and are backfilled) to
-- 'equal_to' so their current behavior is unchanged.
alter table public.mapped_descriptions
  add column check_type text not null default 'equal_to'
  check (check_type in ('equal_to', 'starts_with', 'contains'));

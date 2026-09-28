-- Accounts can now be deactivated instead of deleted, the same pattern
-- categories/classes already use (see 0018_category_classes_gordura_restrict.sql).
-- The Accounts table's toolbar no longer offers a hard delete at all — this
-- column is the only way a row leaves the visible list from here on.

alter table public.accounts add column is_active boolean not null default true;

-- Category and class names must be unique per user (case- and
-- whitespace-insensitive), regardless of id.
--
-- NOTE: if this fails with a duplicate-key error, you have existing
-- categories or classes whose names only differ by case/whitespace —
-- rename or merge them first, then re-run this migration.
create unique index categories_user_name_unique_idx
  on public.categories (user_id, lower(trim(name)));

create unique index classes_user_name_unique_idx
  on public.classes (user_id, lower(trim(name)));

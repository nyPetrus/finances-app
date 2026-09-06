-- Consolidates categories that share the same name (case/whitespace
-- insensitive) within a user into a single id: repoints every
-- transactions/classes/mapped_descriptions/budget_items row that
-- referenced a duplicate over to the kept id, then removes the
-- duplicate category rows.
--
-- budget_items has its own unique (user_id, year, month, category_id)
-- constraint and "on delete cascade" from categories, so if both the
-- kept and a duplicate category have a planned amount for the same
-- year/month, they're summed into the kept row before the duplicate
-- is removed (rather than letting the cascade silently delete it).
--
-- Run this BEFORE 0011_unique_category_class_names.sql — that
-- migration's unique index will fail to create while duplicate
-- category names still exist.
do $$
declare
  grp record;
  keep_id uuid;
begin
  for grp in
    select user_id, lower(trim(name)) as norm_name
    from public.categories
    group by user_id, lower(trim(name))
    having count(*) > 1
  loop
    -- Prefer a default-seeded category as the survivor, otherwise the
    -- oldest row.
    select id into keep_id
    from public.categories
    where user_id = grp.user_id
      and lower(trim(name)) = grp.norm_name
    order by is_default desc, created_at asc, id asc
    limit 1;

    update public.transactions
    set category_id = keep_id
    where user_id = grp.user_id
      and category_id in (
        select id from public.categories
        where user_id = grp.user_id and lower(trim(name)) = grp.norm_name and id <> keep_id
      );

    update public.classes
    set category_id = keep_id
    where user_id = grp.user_id
      and category_id in (
        select id from public.categories
        where user_id = grp.user_id and lower(trim(name)) = grp.norm_name and id <> keep_id
      );

    update public.mapped_descriptions
    set category_id = keep_id
    where user_id = grp.user_id
      and category_id in (
        select id from public.categories
        where user_id = grp.user_id and lower(trim(name)) = grp.norm_name and id <> keep_id
      );

    -- Merge budget_items: sum planned_amount into the kept row wherever
    -- both it and a duplicate have an entry for the same year/month.
    update public.budget_items keep_b
    set planned_amount = keep_b.planned_amount + dup_b.planned_amount
    from public.budget_items dup_b
    join public.categories dup_c on dup_c.id = dup_b.category_id
    where keep_b.category_id = keep_id
      and keep_b.user_id = grp.user_id
      and dup_c.user_id = grp.user_id
      and lower(trim(dup_c.name)) = grp.norm_name
      and dup_c.id <> keep_id
      and dup_b.year = keep_b.year
      and dup_b.month = keep_b.month;

    -- Remove the now-merged duplicate budget_items rows.
    delete from public.budget_items dup_b
    using public.categories dup_c
    where dup_b.category_id = dup_c.id
      and dup_c.user_id = grp.user_id
      and lower(trim(dup_c.name)) = grp.norm_name
      and dup_c.id <> keep_id
      and exists (
        select 1 from public.budget_items keep_b
        where keep_b.user_id = grp.user_id
          and keep_b.category_id = keep_id
          and keep_b.year = dup_b.year
          and keep_b.month = dup_b.month
      );

    -- Repoint whatever budget_items are left (non-conflicting months).
    update public.budget_items
    set category_id = keep_id
    where user_id = grp.user_id
      and category_id in (
        select id from public.categories
        where user_id = grp.user_id and lower(trim(name)) = grp.norm_name and id <> keep_id
      );

    -- Every reference has been moved off the duplicates — safe to remove them.
    delete from public.categories
    where user_id = grp.user_id
      and lower(trim(name)) = grp.norm_name
      and id <> keep_id;
  end loop;
end $$;

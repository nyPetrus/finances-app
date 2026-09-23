-- Reworks transaction classification:
--
-- 1. Classes are no longer owned by a single category. A class can be
--    reused across categories (e.g. "Impostos e taxas" under both Transporte
--    and Moradia); which (category, class) pairs are valid now lives in the
--    category_classes join table instead of classes.category_id.
-- 2. Transactions and description mappings must use a valid pair, enforced
--    by a composite foreign key into category_classes (not just app code).
-- 3. "Gordura" — how long a financial commitment lasts: 'high' = finite (it
--    ends on its own, e.g. a car loan installment), 'low' = recurs
--    indefinitely (rent, car insurance). Each class carries a default
--    (classes.default_gordura, nullable = no default, e.g. fines);
--    transactions.gordura is only a manual override — the effective value is
--    coalesce(transactions.gordura, classes.default_gordura), computed at
--    read time, never copied onto every row.
-- 4. Categories and classes can be deactivated (is_active) instead of
--    deleted: hidden from pickers for new data, kept on existing rows.
-- 5. Deleting a category/class that's still referenced by transactions,
--    description mappings or budget items is now refused by the database,
--    instead of silently uncategorizing transactions and cascading away
--    mappings and planned amounts.
--
-- The "refuse" FKs below use the default NO ACTION rather than RESTRICT:
-- both reject a delete that would leave a dangling reference, but NO ACTION
-- checks at the end of the statement, so deleting a whole auth user (which
-- cascades to categories *and* transactions in the same statement) still
-- works.

begin;

-- 1. Join table of valid (category, class) pairs ---------------------------

create table public.category_classes (
  user_id uuid not null references auth.users(id) on delete cascade,
  -- Link rows aren't financial data on their own, so they go away with their
  -- category/class — but if any transaction or mapping uses the pair, that
  -- row's FK below blocks the whole delete.
  category_id uuid not null references public.categories(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (category_id, class_id)
);

create index category_classes_class_idx on public.category_classes (class_id);

alter table public.category_classes enable row level security;

create policy "category_classes_owner" on public.category_classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Every class's current category becomes its first link.
insert into public.category_classes (user_id, category_id, class_id)
select user_id, category_id, id from public.classes;

-- A class's category could be changed after transactions already used it,
-- leaving those transactions on a pair that no longer matches. Keep them as
-- they are by linking every pair actually in use.
update public.transactions
set class_id = null
where class_id is not null and category_id is null;

insert into public.category_classes (user_id, category_id, class_id)
select distinct user_id, category_id, class_id
from public.transactions
where category_id is not null and class_id is not null
on conflict do nothing;

insert into public.category_classes (user_id, category_id, class_id)
select distinct user_id, category_id, class_id
from public.mapped_descriptions
where class_id is not null
on conflict do nothing;

alter table public.classes drop column category_id;

-- 2. Active flag and gordura -----------------------------------------------

alter table public.categories add column is_active boolean not null default true;
alter table public.classes add column is_active boolean not null default true;

alter table public.classes
  add column default_gordura text check (default_gordura in ('high', 'low'));

alter table public.transactions
  add column gordura text check (gordura in ('high', 'low'));

-- 3. Foreign keys: refuse instead of cascade / set null --------------------

alter table public.transactions
  drop constraint transactions_category_id_fkey,
  drop constraint transactions_class_id_fkey;

alter table public.transactions
  add constraint transactions_category_id_fkey
    foreign key (category_id) references public.categories(id),
  add constraint transactions_class_id_fkey
    foreign key (class_id) references public.classes(id),
  add constraint transactions_class_requires_category
    check (class_id is null or category_id is not null),
  -- MATCH SIMPLE (the default): only checked when both columns are set, so
  -- uncategorized and category-only transactions are unaffected.
  add constraint transactions_category_class_fkey
    foreign key (category_id, class_id)
    references public.category_classes(category_id, class_id);

alter table public.mapped_descriptions
  drop constraint mapped_descriptions_category_id_fkey,
  drop constraint mapped_descriptions_class_id_fkey;

alter table public.mapped_descriptions
  add constraint mapped_descriptions_category_id_fkey
    foreign key (category_id) references public.categories(id),
  add constraint mapped_descriptions_class_id_fkey
    foreign key (class_id) references public.classes(id),
  add constraint mapped_descriptions_category_class_fkey
    foreign key (category_id, class_id)
    references public.category_classes(category_id, class_id);

alter table public.budget_items
  drop constraint budget_items_category_id_fkey;

alter table public.budget_items
  add constraint budget_items_category_id_fkey
    foreign key (category_id) references public.categories(id);

commit;

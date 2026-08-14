-- Replaces the categories.kind CHECK constraint with a real lookup table,
-- so valid kinds are enforced by a foreign key instead of an inline list.
create table public.category_kinds (
  name text primary key
);

alter table public.category_kinds enable row level security;

create policy "category_kinds_read" on public.category_kinds
  for select using (true);

insert into public.category_kinds (name) values ('income'), ('expense'), ('transfer');

alter table public.categories drop constraint categories_kind_check;
alter table public.categories add constraint categories_kind_fkey
  foreign key (kind) references public.category_kinds(name);

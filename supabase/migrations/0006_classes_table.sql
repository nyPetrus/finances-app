-- Optional subcategories ("classes") nested under a category, e.g.
-- "Alimentação" -> "Restaurante" / "Mercado". One category has many classes.
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create index classes_category_idx on public.classes (category_id);

alter table public.classes enable row level security;

create policy "classes_owner" on public.classes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

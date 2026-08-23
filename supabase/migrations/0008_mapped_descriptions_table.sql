-- Maps an exact transaction description to a category (and optionally a
-- class), so uncategorized transactions with a matching description can be
-- auto-categorized via the "Sync" action on the Descriptions page.
--
-- Primary key is (user_id, description) rather than description alone,
-- since descriptions aren't unique across different users' data under RLS.
create table public.mapped_descriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  category_id uuid not null references public.categories(id) on delete cascade,
  class_id uuid references public.classes(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, description)
);

alter table public.mapped_descriptions enable row level security;

create policy "mapped_descriptions_owner" on public.mapped_descriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

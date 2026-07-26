-- Categories
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('income', 'expense')),
  color text not null default '#64748b',
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

-- Accounts
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  institution text,
  type text not null check (type in ('checking', 'investment', 'fgts', 'manual')),
  is_automatic boolean not null default false,
  pluggy_item_id text,
  pluggy_account_id text,
  current_balance numeric(14, 2) not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.accounts(id) on delete cascade,
  category_id uuid references public.categories(id) on delete set null,
  date date not null,
  description text not null,
  amount numeric(14, 2) not null,
  source text not null default 'manual' check (source in ('manual', 'pluggy', 'csv')),
  pluggy_transaction_id text unique,
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_category_idx on public.transactions (category_id);

-- Budget items: one row per category, per month, per year
create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year int not null,
  month int not null check (month between 1 and 12),
  category_id uuid not null references public.categories(id) on delete cascade,
  planned_amount numeric(14, 2) not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, year, month, category_id)
);

create index budget_items_user_year_idx on public.budget_items (user_id, year);

-- Row Level Security: every table is scoped to its own user
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.budget_items enable row level security;

create policy "categories_owner" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "accounts_owner" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_owner" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "budget_items_owner" on public.budget_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Seed default categories automatically whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categories (user_id, name, kind, color, is_default) values
    (new.id, 'Salário', 'income', '#22c55e', true),
    (new.id, 'Investimentos', 'income', '#0ea5e9', true),
    (new.id, 'Outras Receitas', 'income', '#14b8a6', true),
    (new.id, 'Alimentação', 'expense', '#f97316', true),
    (new.id, 'Transporte', 'expense', '#eab308', true),
    (new.id, 'Moradia', 'expense', '#8b5cf6', true),
    (new.id, 'Saúde', 'expense', '#ef4444', true),
    (new.id, 'Educação', 'expense', '#3b82f6', true),
    (new.id, 'Lazer', 'expense', '#ec4899', true),
    (new.id, 'Outras Despesas', 'expense', '#64748b', true);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

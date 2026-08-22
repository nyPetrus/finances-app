-- Lets a transaction optionally be tagged with a class (subcategory).
alter table public.transactions
  add column class_id uuid references public.classes(id) on delete set null;

create index transactions_class_idx on public.transactions (class_id);

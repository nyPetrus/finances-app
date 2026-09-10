-- Categories now pick a representative icon instead of a custom color;
-- every category badge/chip across the app renders that icon on a neutral
-- background instead of a per-category color. Existing rows (including
-- previously-seeded default categories) all fall back to 'tag' since there's
-- no reliable way to infer a fitting icon from old data automatically.
alter table public.categories add column icon text not null default 'tag';
alter table public.categories drop column color;

-- The default-category seed (on signup) referenced the now-dropped `color`
-- column — redefine it to seed `icon` instead, with icons that actually fit
-- each default category, for new signups going forward.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.categories (user_id, name, kind, icon, is_default) values
    (new.id, 'Salário', 'income', 'briefcase', true),
    (new.id, 'Investimentos', 'income', 'trending-up', true),
    (new.id, 'Outras Receitas', 'income', 'tag', true),
    (new.id, 'Alimentação', 'expense', 'utensils-crossed', true),
    (new.id, 'Transporte', 'expense', 'car', true),
    (new.id, 'Moradia', 'expense', 'home', true),
    (new.id, 'Saúde', 'expense', 'heart-pulse', true),
    (new.id, 'Educação', 'expense', 'graduation-cap', true),
    (new.id, 'Lazer', 'expense', 'film', true),
    (new.id, 'Outras Despesas', 'expense', 'tag', true);
  return new;
end;
$$;

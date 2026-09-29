-- Classes pick a representative icon too, same palette as categories
-- (CATEGORY_ICON_MAP). Existing and new classes default to 'tags' — the
-- icon the sidebar already uses for Classes.
alter table public.classes add column icon text not null default 'tags';

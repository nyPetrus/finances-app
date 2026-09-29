-- The Categories entity icon is now a box and the Classes one a single tag
-- (sidebar-nav.tsx), so the column defaults follow: a category with no
-- chosen icon shows the box, a new class starts on the tag.
alter table public.categories alter column icon set default 'box';
alter table public.classes alter column icon set default 'tag';

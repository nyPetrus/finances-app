-- "Gordura" is renamed to "Autonomy" app-wide (per explicit user request).
-- Values ('high'/'low') and semantics are unchanged: transactions.autonomy is
-- a manual override, classes.autonomy is the class's default, and the
-- effective value is coalesce(transactions.autonomy, classes.autonomy, 'high')
-- computed in the app (effectiveAutonomy in src/lib/classification.ts).
-- The column-level CHECKs follow the rename automatically; only their names
-- are updated so they don't keep mentioning the old term.
alter table public.transactions rename column gordura to autonomy;
alter table public.classes rename column default_gordura to autonomy;

alter table public.transactions rename constraint transactions_gordura_check to transactions_autonomy_check;
alter table public.classes rename constraint classes_default_gordura_check to classes_autonomy_check;

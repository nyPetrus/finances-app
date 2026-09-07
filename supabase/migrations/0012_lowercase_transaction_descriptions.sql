-- One-time backfill: lowercase every existing transaction description.
-- Going forward, both the Pluggy sync and the manual add/edit actions
-- lowercase the description before insert/update, so this shouldn't
-- need to run again.
update public.transactions
set description = lower(description)
where description <> lower(description);

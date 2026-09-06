-- Preserve time-of-day for transactions. The column keeps its name and
-- most existing behavior (date-range filtering, sorting) since it's
-- still comparable to plain date strings, but now also carries a time.
-- Historical rows get midnight since no time was ever recorded for them.
alter table public.transactions
  alter column date type timestamptz using date::timestamptz;

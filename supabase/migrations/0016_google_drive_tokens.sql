-- Stores one Google OAuth grant per user, used to read from their Drive on
-- demand (a button click, not a background job — see the "Google Drive
-- account folder import" feature). refresh_token is the long-lived
-- credential; access_token/access_token_expires_at cache the short-lived
-- token derived from it so a click doesn't always need a refresh round trip.
create table public.google_drive_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_token_expires_at timestamptz,
  google_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_drive_tokens enable row level security;

create policy "google_drive_tokens_owner" on public.google_drive_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

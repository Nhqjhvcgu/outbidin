-- Run this once in your Supabase project's SQL Editor
-- (Supabase dashboard -> SQL Editor -> New query -> paste -> Run)

create extension if not exists "pgcrypto";

create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  linkedin_url text not null unique,
  name text not null,
  headline text,
  category text not null,
  avatar_initial text not null default '?',
  bid_amount_cents integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_bid_idx on listings (bid_amount_cents desc);

-- Row Level Security: the public site can only ever READ listings.
-- Writes only happen from the Stripe webhook route, which uses the
-- service_role key and therefore bypasses these policies entirely.
alter table listings enable row level security;

drop policy if exists "Public listings are readable" on listings;
create policy "Public listings are readable"
  on listings for select
  using (true);

-- No insert/update/delete policy is created for the anon/public role,
-- so the browser-facing anon key cannot write to this table at all.

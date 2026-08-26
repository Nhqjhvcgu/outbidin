-- Run this once in your Supabase project's SQL Editor
-- (Supabase dashboard -> SQL Editor -> New query -> paste -> Run)
-- Safe to re-run: every statement uses IF NOT EXISTS / OR REPLACE / DROP...IF EXISTS.

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

alter table listings add column if not exists clicks integer not null default 0;

create index if not exists listings_bid_idx on listings (bid_amount_cents desc);

-- Row Level Security: the public site can only ever READ listings.
-- Writes only happen from the Dodo webhook route (new listings/bids) and
-- the two functions below (clicks, visitor count), all via the service_role
-- key, which bypasses these policies entirely.
alter table listings enable row level security;

drop policy if exists "Public listings are readable" on listings;
create policy "Public listings are readable"
  on listings for select
  using (true);

-- No insert/update/delete policy exists for the anon/public role, so the
-- browser-facing anon key cannot write to this table at all.

-- Called by /api/track-click whenever someone clicks "View profile".
create or replace function increment_clicks(target_url text)
returns integer
language sql
as $$
  update listings
  set clicks = clicks + 1
  where linkedin_url = target_url
  returning clicks;
$$;

-- Site-wide visitor counter. Single row, id = 1.
create table if not exists site_stats (
  id integer primary key default 1,
  total_views bigint not null default 0
);

insert into site_stats (id, total_views)
values (1, 0)
on conflict (id) do nothing;

alter table site_stats enable row level security;
-- No policies at all here: the public anon key has zero access, by design.
-- Only /api/track-view (using the service_role key) ever touches this table.

-- Called by /api/track-view once per page load.
create or replace function increment_total_views()
returns bigint
language sql
as $$
  update site_stats
  set total_views = total_views + 1
  where id = 1
  returning total_views;
$$;

-- Holds a submission's details between creating a Dodo checkout session and
-- receiving payment.succeeded. The order_id is a server-generated UUID stored in
-- the Dodo checkout metadata. Written by /api/checkout and consumed/deleted by
-- /api/webhook after Dodo confirms payment.succeeded.
create table if not exists pending_orders (
  order_id text primary key,
  linkedin_url text not null,
  name text not null,
  headline text,
  category text not null,
  bid_amount_cents integer not null,
  created_at timestamptz not null default now()
);

alter table pending_orders enable row level security;
-- No policies: only the service_role key (server-side routes) ever
-- touches this table. The public anon key has zero access, by design.

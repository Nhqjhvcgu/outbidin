-- Run this in Supabase SQL Editor (same place you ran schema.sql).
-- Adds click tracking to your EXISTING listings table without losing any data.

alter table listings add column if not exists clicks integer not null default 0;

-- A Postgres function that safely increments clicks by 1, callable from the
-- app without needing write access to the whole table (the app calls this
-- via supabase.rpc, not a raw UPDATE).
create or replace function increment_clicks(target_url text)
returns void
language sql
as $$
  update listings set clicks = clicks + 1 where linkedin_url = target_url;
$$;

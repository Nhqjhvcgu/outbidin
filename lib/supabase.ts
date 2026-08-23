import { createClient } from "@supabase/supabase-js";

export type Listing = {
  id: string;
  linkedin_url: string;
  name: string;
  headline: string | null;
  category: string;
  avatar_initial: string;
  bid_amount_cents: number;
  clicks: number;
  created_at: string;
  updated_at: string;
};

// Public, browser-safe client. Only ever used for read (select) queries.
// Row Level Security in Supabase restricts this key to SELECT only —
// see supabase/schema.sql.
export function getPublicSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey);
}

// Server-only client using the service role key. This bypasses Row Level
// Security, so it must NEVER be imported into a client component and the
// key must never be prefixed with NEXT_PUBLIC_. Only the Stripe webhook
// route uses this, to write a listing after a payment is confirmed.
export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}

import { NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// Called once per page load (fire-and-forget from the client) to increment
// the site-wide visitor counter. Uses the service role via the
// increment_total_views() Postgres function so the public site never needs
// write access to this table directly.
export async function POST() {
  try {
    const supabase = getServiceSupabase();
    const { data, error } = await supabase.rpc("increment_total_views");
    if (error) throw error;
    return NextResponse.json({ total_views: data ?? 0 });
  } catch (err) {
    console.error(err);
    // View tracking failing should never break the page for the visitor.
    return NextResponse.json({ total_views: null }, { status: 200 });
  }
}

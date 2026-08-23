import { NextRequest, NextResponse } from "next/server";
import { getServiceSupabase } from "@/lib/supabase";

// Called (fire-and-forget) when someone clicks "View profile" on a listing.
// Uses the service role via the increment_clicks() Postgres function so the
// public site never needs write access to the table directly.
export async function POST(req: NextRequest) {
  try {
    const { linkedin_url } = await req.json();
    if (!linkedin_url || typeof linkedin_url !== "string") {
      return NextResponse.json({ error: "Missing linkedin_url" }, { status: 400 });
    }
    const supabase = getServiceSupabase();
    const { error } = await supabase.rpc("increment_clicks", {
      target_url: linkedin_url,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    // Click tracking failing should never break the user's actual click-through.
    return NextResponse.json({ ok: false }, { status: 200 });
  }
}

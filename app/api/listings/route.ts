import { NextResponse } from "next/server";
import { getPublicSupabase } from "@/lib/supabase";

export async function GET() {
  try {
    const supabase = getPublicSupabase();
    const { data, error } = await supabase
      .from("listings")
      .select("*")
      .order("bid_amount_cents", { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json({ listings: data ?? [] });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ listings: [], error: "Could not load listings" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { PAYPAL_API_BASE, getPaypalAccessToken } from "@/lib/paypal";
import { getServiceSupabase } from "@/lib/supabase";
import { initialsFromName } from "@/lib/categories";

export async function POST(req: NextRequest) {
  try {
    const { order_id } = await req.json();
    if (!order_id) {
      return NextResponse.json({ error: "Missing order id." }, { status: 400 });
    }

    const accessToken = await getPaypalAccessToken();
    const captureRes = await fetch(
      `${PAYPAL_API_BASE}/v2/checkout/orders/${order_id}/capture`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    const capture = await captureRes.json();
    const captureStatus =
      capture?.purchase_units?.[0]?.payments?.captures?.[0]?.status ?? capture?.status;

    if (!captureRes.ok || captureStatus !== "COMPLETED") {
      console.error("PayPal capture did not complete", capture);
      return NextResponse.json(
        { error: "Payment did not complete. Please try again." },
        { status: 400 }
      );
    }

    const capturedValue =
      capture.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value;
    const capturedCents = capturedValue
      ? Math.round(parseFloat(capturedValue) * 100)
      : null;

    const supabase = getServiceSupabase();
    const { data: pending } = await supabase
      .from("pending_orders")
      .select("*")
      .eq("order_id", order_id)
      .maybeSingle();

    if (!pending) {
      // Already processed (e.g. the webhook beat us to it) — not an error.
      return NextResponse.json({ success: true, name: null, bid_amount_cents: capturedCents });
    }

    const finalCents = capturedCents ?? pending.bid_amount_cents;

    const { error: upsertError } = await supabase.from("listings").upsert(
      {
        linkedin_url: pending.linkedin_url,
        name: pending.name,
        headline: pending.headline,
        category: pending.category,
        avatar_initial: initialsFromName(pending.name),
        bid_amount_cents: finalCents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "linkedin_url" }
    );

    if (upsertError) {
      console.error("Failed to upsert listing after capture", upsertError);
      return NextResponse.json(
        { error: "Payment succeeded but saving your listing failed. Contact support." },
        { status: 500 }
      );
    }

    await supabase.from("pending_orders").delete().eq("order_id", order_id);

    return NextResponse.json({
      success: true,
      name: pending.name,
      bid_amount_cents: finalCents,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong confirming your payment." },
      { status: 500 }
    );
  }
}

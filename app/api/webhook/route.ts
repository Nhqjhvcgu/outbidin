import { NextRequest, NextResponse } from "next/server";
import { PAYPAL_API_BASE, getPaypalAccessToken } from "@/lib/paypal";
import { getServiceSupabase } from "@/lib/supabase";
import { initialsFromName } from "@/lib/categories";

// Backup path only — the /api/capture-order route is the primary way
// listings get written, firing synchronously right after the user approves
// payment. This webhook exists in case that call fails to complete (closed
// tab, network blip) even though PayPal actually captured the payment.
// PayPal doesn't use a simple local-HMAC signature like Stripe/Razorpay —
// verifying a webhook means asking PayPal's own API to confirm it.
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const event = JSON.parse(rawBody);

    const accessToken = await getPaypalAccessToken();
    const verifyRes = await fetch(
      `${PAYPAL_API_BASE}/v1/notifications/verify-webhook-signature`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auth_algo: req.headers.get("paypal-auth-algo"),
          cert_url: req.headers.get("paypal-cert-url"),
          transmission_id: req.headers.get("paypal-transmission-id"),
          transmission_sig: req.headers.get("paypal-transmission-sig"),
          transmission_time: req.headers.get("paypal-transmission-time"),
          webhook_id: process.env.PAYPAL_WEBHOOK_ID,
          webhook_event: event,
        }),
      }
    );
    const verification = await verifyRes.json();
    if (verification.verification_status !== "SUCCESS") {
      console.error("PayPal webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    if (event.event_type === "PAYMENT.CAPTURE.COMPLETED") {
      const resource = event.resource;
      const orderId: string | undefined = resource?.supplementary_data?.related_ids?.order_id;
      if (!orderId) {
        return NextResponse.json({ received: true });
      }

      const supabase = getServiceSupabase();
      const { data: pending } = await supabase
        .from("pending_orders")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

      // Already handled by /api/capture-order — nothing to do.
      if (!pending) {
        return NextResponse.json({ received: true });
      }

      const capturedCents = resource.amount?.value
        ? Math.round(parseFloat(resource.amount.value) * 100)
        : pending.bid_amount_cents;

      const { error } = await supabase.from("listings").upsert(
        {
          linkedin_url: pending.linkedin_url,
          name: pending.name,
          headline: pending.headline,
          category: pending.category,
          avatar_initial: initialsFromName(pending.name),
          bid_amount_cents: capturedCents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "linkedin_url" }
      );

      if (error) {
        console.error("Webhook failed to upsert listing", error);
        return NextResponse.json({ error: "DB write failed" }, { status: 500 });
      }

      await supabase.from("pending_orders").delete().eq("order_id", orderId);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

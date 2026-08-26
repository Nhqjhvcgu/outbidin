import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getServiceSupabase } from "@/lib/supabase";
import { initialsFromName } from "@/lib/categories";

function getWebhookSecretBytes(secret: string): Buffer {
  const encoded = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(encoded, "base64");
}

function verifyDodoSignature(
  rawBody: string,
  webhookId: string,
  webhookTimestamp: string,
  signatureHeader: string,
  secret: string
) {
  const timestamp = Number(webhookTimestamp);
  if (!Number.isFinite(timestamp)) return false;

  // Reject very old/future deliveries. Dodo signs the timestamp together
  // with the raw request body, following the Standard Webhooks spec.
  const age = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (age > 5 * 60) return false;

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", getWebhookSecretBytes(secret))
    .update(signedContent)
    .digest("base64");

  // The header can contain multiple signatures such as "v1,abc v1,def".
  return signatureHeader.split(/\s+/).some((part) => {
    const [version, value] = part.split(",", 2);
    if (version !== "v1" || !value) return false;
    try {
      const a = Buffer.from(value, "base64");
      const b = Buffer.from(expected, "base64");
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.DODO_PAYMENTS_WEBHOOK_KEY;
    if (!secret) {
      console.error("Missing DODO_PAYMENTS_WEBHOOK_KEY");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    const rawBody = await req.text();
    const webhookId = req.headers.get("webhook-id");
    const webhookSignature = req.headers.get("webhook-signature");
    const webhookTimestamp = req.headers.get("webhook-timestamp");

    if (!webhookId || !webhookSignature || !webhookTimestamp) {
      return NextResponse.json({ error: "Missing webhook signature headers" }, { status: 400 });
    }

    if (!verifyDodoSignature(rawBody, webhookId, webhookTimestamp, webhookSignature, secret)) {
      console.error("Dodo webhook signature verification failed");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    if (event.type !== "payment.succeeded") {
      return NextResponse.json({ received: true });
    }

    const payment = event.data;
    const pendingOrderId = payment?.metadata?.order_id;
    const paidAmount = Number(payment?.total_amount);

    if (!pendingOrderId || !payment?.payment_id) {
      console.error("Dodo payment.succeeded missing metadata/order id", event);
      return NextResponse.json({ received: true });
    }

    if (payment?.status !== "succeeded") {
      return NextResponse.json({ received: true });
    }

    const supabase = getServiceSupabase();
    const { data: pending, error: pendingError } = await supabase
      .from("pending_orders")
      .select("*")
      .eq("order_id", pendingOrderId)
      .maybeSingle();

    if (pendingError) {
      console.error("Failed to load pending order", pendingError);
      return NextResponse.json({ error: "DB read failed" }, { status: 500 });
    }

    // Dodo can retry the same webhook. Once the pending row is gone, the
    // payment has already been fulfilled.
    if (!pending) {
      return NextResponse.json({ received: true });
    }

    // The payment must at least cover the bid we created the checkout for.
    // Dodo's total_amount includes tax, so it may be higher than the bid.
    if (!Number.isFinite(paidAmount) || paidAmount < pending.bid_amount_cents) {
      console.error("Dodo payment amount is lower than pending bid", {
        pending: pending.bid_amount_cents,
        paid: paidAmount,
        paymentId: payment.payment_id,
      });
      return NextResponse.json({ error: "Payment amount mismatch" }, { status: 400 });
    }

    const { data: existing } = await supabase
      .from("listings")
      .select("bid_amount_cents")
      .eq("linkedin_url", pending.linkedin_url)
      .maybeSingle();

    // If the same profile was legitimately outbid while this checkout was
    // open, don't overwrite its newer, higher bid with an older lower bid.
    if (!existing || pending.bid_amount_cents > existing.bid_amount_cents) {
      const { error: upsertError } = await supabase.from("listings").upsert(
        {
          linkedin_url: pending.linkedin_url,
          name: pending.name,
          headline: pending.headline,
          category: pending.category,
          avatar_initial: initialsFromName(pending.name),
          bid_amount_cents: pending.bid_amount_cents,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "linkedin_url" }
      );

      if (upsertError) {
        console.error("Dodo webhook failed to upsert listing", upsertError);
        return NextResponse.json({ error: "DB write failed" }, { status: 500 });
      }
    }

    await supabase.from("pending_orders").delete().eq("order_id", pendingOrderId);

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Dodo webhook error", err);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

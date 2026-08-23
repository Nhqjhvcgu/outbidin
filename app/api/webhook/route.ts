import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { getServiceSupabase } from "@/lib/supabase";
import { initialsFromName } from "@/lib/categories";

// Stripe requires the raw, unparsed request body to verify the webhook
// signature, so this route must not run body-parsing middleware. App Router
// route handlers give us the raw text directly via req.text().
export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const meta = session.metadata;

    if (!meta || !meta.linkedin_url || !meta.name || !meta.category) {
      console.error("Checkout session missing required metadata", session.id);
      return NextResponse.json({ received: true });
    }

    // Trust the amount actually captured by Stripe, not the client-sent value.
    const bidAmountCents = session.amount_total ?? 0;

    const supabase = getServiceSupabase();
    const { error } = await supabase.from("listings").upsert(
      {
        linkedin_url: meta.linkedin_url,
        name: meta.name,
        headline: meta.headline || null,
        category: meta.category,
        avatar_initial: initialsFromName(meta.name),
        bid_amount_cents: bidAmountCents,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "linkedin_url" }
    );

    if (error) {
      console.error("Failed to upsert listing", error);
      return NextResponse.json({ error: "DB write failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}

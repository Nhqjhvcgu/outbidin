import { NextRequest, NextResponse } from "next/server";
import { PAYPAL_API_BASE, getPaypalAccessToken } from "@/lib/paypal";
import { getPublicSupabase, getServiceSupabase } from "@/lib/supabase";
import { MIN_BID_DOLLARS, isValidCategory } from "@/lib/categories";

const LINKEDIN_URL_RE = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9\-_%]+\/?$/;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const linkedin_url = String(body.linkedin_url || "").trim();
    const name = String(body.name || "").trim();
    const headline = String(body.headline || "").trim().slice(0, 140);
    const category = String(body.category || "").trim();
    const bidDollars = Number(body.bid_dollars);

    if (!LINKEDIN_URL_RE.test(linkedin_url)) {
      return NextResponse.json(
        { error: "Enter a full LinkedIn profile or company URL, e.g. https://www.linkedin.com/in/yourname" },
        { status: 400 }
      );
    }
    if (!name || name.length > 80) {
      return NextResponse.json({ error: "Enter a valid name (max 80 characters)." }, { status: 400 });
    }
    if (!isValidCategory(category)) {
      return NextResponse.json({ error: "Choose a valid category." }, { status: 400 });
    }
    if (!Number.isFinite(bidDollars) || bidDollars < MIN_BID_DOLLARS) {
      return NextResponse.json(
        { error: `Minimum bid is $${MIN_BID_DOLLARS}.` },
        { status: 400 }
      );
    }

    // If this profile is already listed, the new bid must beat its own
    // current bid — otherwise paying wouldn't change anything.
    const publicSupabase = getPublicSupabase();
    const { data: existing } = await publicSupabase
      .from("listings")
      .select("bid_amount_cents")
      .eq("linkedin_url", linkedin_url)
      .maybeSingle();

    if (existing && bidDollars * 100 <= existing.bid_amount_cents) {
      return NextResponse.json(
        {
          error: `You're already listed at $${(existing.bid_amount_cents / 100).toFixed(
            2
          )}. Bid higher than that to move up.`,
        },
        { status: 400 }
      );
    }

    const accessToken = await getPaypalAccessToken();
    const orderRes = await fetch(`${PAYPAL_API_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [
          {
            description: `Outbidin rank claim — ${name}`,
            amount: { currency_code: "USD", value: bidDollars.toFixed(2) },
          },
        ],
      }),
    });

    if (!orderRes.ok) {
      const errBody = await orderRes.text();
      console.error("PayPal order creation failed", errBody);
      return NextResponse.json(
        { error: "Something went wrong starting checkout. Please try again." },
        { status: 500 }
      );
    }

    const order = await orderRes.json();

    // Stash the submission against the order id — PayPal's own metadata
    // fields are too small to hold all of this, so the capture step (and
    // the webhook backup) look it up from here instead.
    const serviceSupabase = getServiceSupabase();
    const { error: insertError } = await serviceSupabase.from("pending_orders").insert({
      order_id: order.id,
      linkedin_url,
      name,
      headline: headline || null,
      category,
      bid_amount_cents: Math.round(bidDollars * 100),
    });
    if (insertError) {
      console.error("Failed to stash pending order", insertError);
      return NextResponse.json(
        { error: "Something went wrong starting checkout. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      order_id: order.id,
      client_id: process.env.PAYPAL_CLIENT_ID,
      name,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong starting checkout. Please try again." },
      { status: 500 }
    );
  }
}

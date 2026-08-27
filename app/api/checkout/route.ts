import { NextRequest, NextResponse } from "next/server";
import { getPublicSupabase, getServiceSupabase } from "@/lib/supabase";
import { MIN_BID_DOLLARS, isValidCategory } from "@/lib/categories";

const LINKEDIN_URL_RE = /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9\-_%]+\/?$/;

function getDodoBaseUrl() {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "live_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;
    const returnUrl = process.env.DODO_PAYMENTS_RETURN_URL || "https://outbidin.lol/success";

    if (!apiKey || !productId) {
      console.error("Missing DODO_PAYMENTS_API_KEY or DODO_PRODUCT_ID");
      return NextResponse.json(
        { error: "Payments are not configured yet. Please try again later." },
        { status: 500 }
      );
    }

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

    const bidAmountCents = Math.round(bidDollars * 100);
    const publicSupabase = getPublicSupabase();
    const { data: existing } = await publicSupabase
      .from("listings")
      .select("bid_amount_cents")
      .eq("linkedin_url", linkedin_url)
      .maybeSingle();

    if (existing && bidAmountCents <= existing.bid_amount_cents) {
      return NextResponse.json(
        {
          error: `You're already listed at $${(existing.bid_amount_cents / 100).toFixed(
            2
          )}. Bid higher than that to move up.`,
        },
        { status: 400 }
      );
    }

    // Generate our own id before calling Dodo. It is stored in the checkout
    // metadata so the signed payment webhook can find this exact submission.
    const pendingOrderId = crypto.randomUUID();
    const serviceSupabase = getServiceSupabase();

    const { error: insertError } = await serviceSupabase.from("pending_orders").insert({
      order_id: pendingOrderId,
      linkedin_url,
      name,
      headline: headline || null,
      category,
      bid_amount_cents: bidAmountCents,
    });

    if (insertError) {
      console.error("Failed to stash pending order", insertError);
      return NextResponse.json(
        { error: "Something went wrong starting checkout. Please try again." },
        { status: 500 }
      );
    }

    const checkoutPayload = {
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          // Dodo uses the lowest denomination of the currency here, so $1 = 100.
          // This is honored when the product is configured as Pay What You Want.
          amount: bidAmountCents,
        },
      ],
      billing_currency: "USD",
      return_url: returnUrl,
      metadata: {
        order_id: pendingOrderId,
      },
    };

    const checkoutRes = await fetch(`${getDodoBaseUrl()}/checkouts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(checkoutPayload),
      cache: "no-store",
    });

    const checkout = await checkoutRes.json().catch(() => null);

    if (!checkoutRes.ok || !checkout?.checkout_url) {
      await serviceSupabase.from("pending_orders").delete().eq("order_id", pendingOrderId);
      console.error("Dodo checkout creation failed", {
        status: checkoutRes.status,
        body: checkout,
      });
      return NextResponse.json(
        { error: "Something went wrong starting checkout. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkout_url: checkout.checkout_url,
      name,
      bid_amount_cents: bidAmountCents,
    });
  } catch (err) {
    console.error("Dodo checkout error", err);
    return NextResponse.json(
      { error: "Something went wrong starting checkout. Please try again." },
      { status: 500 }
    );
  }
}

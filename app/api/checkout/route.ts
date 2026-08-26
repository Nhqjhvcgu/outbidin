import { NextRequest, NextResponse } from "next/server";
import { getPublicSupabase, getServiceSupabase } from "@/lib/supabase";
import { MIN_BID_DOLLARS, isValidCategory } from "@/lib/categories";

const LINKEDIN_URL_RE =
  /^https:\/\/(www\.)?linkedin\.com\/(in|company)\/[a-zA-Z0-9\-_%]+\/?$/;

function getDodoBaseUrl() {
  return process.env.DODO_PAYMENTS_ENVIRONMENT === "test_mode"
    ? "https://test.dodopayments.com"
    : "https://live.dodopayments.com";
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.DODO_PAYMENTS_API_KEY;
    const productId = process.env.DODO_PRODUCT_ID;

    const returnUrl =
      process.env.DODO_PAYMENTS_RETURN_URL ||
      "https://outbidin.lol/success";

    if (!apiKey) {
      console.error("DODO ERROR: Missing DODO_PAYMENTS_API_KEY");

      return NextResponse.json(
        { error: "Dodo API key is not configured." },
        { status: 500 }
      );
    }

    if (!productId) {
      console.error("DODO ERROR: Missing DODO_PRODUCT_ID");

      return NextResponse.json(
        { error: "Dodo product ID is not configured." },
        { status: 500 }
      );
    }

    const body = await req.json();

    const linkedin_url = String(body.linkedin_url || "").trim();
    const name = String(body.name || "").trim();
    const headline = String(body.headline || "")
      .trim()
      .slice(0, 140);
    const category = String(body.category || "").trim();
    const bidDollars = Number(body.bid_dollars);

    if (!LINKEDIN_URL_RE.test(linkedin_url)) {
      return NextResponse.json(
        {
          error:
            "Enter a full LinkedIn profile or company URL.",
        },
        { status: 400 }
      );
    }

    if (!name || name.length > 80) {
      return NextResponse.json(
        { error: "Enter a valid name (max 80 characters)." },
        { status: 400 }
      );
    }

    if (!isValidCategory(category)) {
      return NextResponse.json(
        { error: "Choose a valid category." },
        { status: 400 }
      );
    }

    if (
      !Number.isFinite(bidDollars) ||
      bidDollars < MIN_BID_DOLLARS
    ) {
      return NextResponse.json(
        {
          error: `Minimum bid is $${MIN_BID_DOLLARS}.`,
        },
        { status: 400 }
      );
    }

    const bidAmountCents = Math.round(bidDollars * 100);

    const publicSupabase = getPublicSupabase();

    const { data: existing, error: existingError } =
      await publicSupabase
        .from("listings")
        .select("bid_amount_cents")
        .eq("linkedin_url", linkedin_url)
        .maybeSingle();

    if (existingError) {
      console.error("Supabase listing lookup error:", existingError);
    }

    if (
      existing &&
      bidAmountCents <= existing.bid_amount_cents
    ) {
      return NextResponse.json(
        {
          error: `You're already listed at $${(
            existing.bid_amount_cents / 100
          ).toFixed(2)}. Bid higher than that to move up.`,
        },
        { status: 400 }
      );
    }

    const pendingOrderId = crypto.randomUUID();

    const serviceSupabase = getServiceSupabase();

    const { error: insertError } = await serviceSupabase
      .from("pending_orders")
      .insert({
        order_id: pendingOrderId,
        linkedin_url,
        name,
        headline: headline || null,
        category,
        bid_amount_cents: bidAmountCents,
      });

    if (insertError) {
      console.error(
        "Supabase pending order error:",
        insertError
      );

      return NextResponse.json(
        {
          error:
            "Could not create pending order. Please try again.",
        },
        { status: 500 }
      );
    }

    const checkoutPayload = {
      product_cart: [
        {
          product_id: productId,
          quantity: 1,
          amount: bidAmountCents,
        },
      ],

      billing_currency: "USD",

      return_url: returnUrl,

      metadata: {
        order_id: pendingOrderId,
      },

      allowed_payment_method_types: [
        "credit",
        "debit",
      ],
    };

    console.log("Creating Dodo checkout:", {
      environment:
        process.env.DODO_PAYMENTS_ENVIRONMENT,
      productId,
      amount: bidAmountCents,
      returnUrl,
      orderId: pendingOrderId,
    });

    const checkoutRes = await fetch(
      `${getDodoBaseUrl()}/checkouts`,
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify(checkoutPayload),

        cache: "no-store",
      }
    );

    const rawResponse = await checkoutRes.text();

    let checkout: any = null;

    try {
      checkout = JSON.parse(rawResponse);
    } catch {
      checkout = {
        raw: rawResponse,
      };
    }

    console.log("Dodo response:", {
      status: checkoutRes.status,
      response: checkout,
    });

    if (!checkoutRes.ok || !checkout?.checkout_url) {
      await serviceSupabase
        .from("pending_orders")
        .delete()
        .eq("order_id", pendingOrderId);

      console.error("DODO CHECKOUT FAILED:", {
        status: checkoutRes.status,
        response: checkout,
      });

      return NextResponse.json(
        {
          error:
            checkout?.message ||
            checkout?.error ||
            checkout?.detail ||
            "Dodo rejected the checkout request.",

          dodo_status: checkoutRes.status,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      checkout_url: checkout.checkout_url,
      name,
      bid_amount_cents: bidAmountCents,
    });
  } catch (err) {
    console.error("Checkout route crashed:", err);

    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected checkout error.",
      },
      { status: 500 }
    );
  }
}

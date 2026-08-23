import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { getPublicSupabase } from "@/lib/supabase";
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
    const supabase = getPublicSupabase();
    const { data: existing } = await supabase
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

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || req.nextUrl.origin;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(bidDollars * 100),
            product_data: {
              name: `Outbidin rank claim — ${name}`,
              description: `Bid of $${bidDollars} to rank on the Outbidin LinkedIn leaderboard`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        linkedin_url,
        name,
        headline,
        category,
        bid_dollars: String(bidDollars),
      },
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?cancelled=1`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong starting checkout. Please try again." },
      { status: 500 }
    );
  }
}

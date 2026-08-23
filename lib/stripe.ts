import Stripe from "stripe";

let stripe: Stripe | null = null;

// Lazily constructed so the app can build without STRIPE_SECRET_KEY set
// (Vercel needs the build to succeed before env vars are validated at runtime).
export function getStripe() {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("Missing STRIPE_SECRET_KEY");
    }
    stripe = new Stripe(key);
  }
  return stripe;
}

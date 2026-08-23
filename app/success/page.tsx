import Link from "next/link";
import { getStripe } from "@/lib/stripe";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  let name: string | null = null;
  let bid: string | null = null;

  if (session_id) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(session_id);
      name = session.metadata?.name ?? null;
      if (session.amount_total) {
        bid = (session.amount_total / 100).toFixed(0);
      }
    } catch {
      // fall through to generic message
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-md text-center count-in">
        <p className="text-sm tracking-[0.2em] uppercase mb-4" style={{ color: "var(--gold)" }}>
          Payment confirmed
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--ink)" }}>
          {name ? `${name} is on the board.` : "You're on the board."}
        </h1>
        <p className="mb-8" style={{ color: "var(--muted)" }}>
          {bid
            ? `Your $${bid} bid is live now. Anyone can outbid you at any time — check back to defend your rank.`
            : "Your bid is being processed and will appear on the leaderboard shortly."}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 rounded-full font-medium"
          style={{ background: "var(--gold)", color: "var(--bg)" }}
        >
          View the leaderboard
        </Link>
      </div>
    </main>
  );
}

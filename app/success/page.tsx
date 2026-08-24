import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; amount?: string }>;
}) {
  const { name, amount } = await searchParams;

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
          {amount
            ? `Your $${amount} bid is live now. Anyone can outbid you at any time — check back to defend your rank.`
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

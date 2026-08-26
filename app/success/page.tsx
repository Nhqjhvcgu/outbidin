import Link from "next/link";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; payment_id?: string; email?: string }>;
}) {
  const { status, payment_id } = await searchParams;
  const succeeded = status === "succeeded";

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="max-w-md text-center count-in">
        <p className="text-sm tracking-[0.2em] uppercase mb-4" style={{ color: "var(--gold)" }}>
          {succeeded ? "Payment received" : "Checkout complete"}
        </p>
        <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ color: "var(--ink)" }}>
          {succeeded ? "Your payment went through." : "Thanks for your payment."}
        </h1>
        <p className="mb-8" style={{ color: "var(--muted)" }}>
          Your listing is activated by our payment webhook after Dodo confirms the payment. It may take a few seconds to appear on the board.
        </p>
        {payment_id && (
          <p className="text-xs mb-6 break-all" style={{ color: "var(--muted-2)" }}>
            Payment: {payment_id}
          </p>
        )}
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

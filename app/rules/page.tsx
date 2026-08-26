import Link from "next/link";

export const metadata = {
  title: "Rules & Moderation — Outbidin",
};

export default function RulesPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-6 py-14">
        <Link href="/" className="text-sm underline" style={{ color: "var(--muted)" }}>
          ← Back to the board
        </Link>

        <h1 className="font-display text-3xl sm:text-4xl mt-6 mb-8" style={{ color: "var(--ink)" }}>
          Rules & Moderation
        </h1>

        <Section title="What Outbidin is">
          <p>
            Outbidin is a paid leaderboard. Anyone can submit a LinkedIn profile or company
            page along with a bid, and listings are ranked by bid amount, highest first.
            Paying more than the current top bid moves you to #1; anyone can outbid you at
            any time.
          </p>
        </Section>

        <Section title="What you can submit">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Your own LinkedIn profile or company page, or one you have permission to list.</li>
            <li>An accurate name and headline that describe the profile being listed.</li>
            <li>One of the listed categories that genuinely fits the profile.</li>
          </ul>
        </Section>

        <Section title="Prohibited content and activity">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>Listing someone else's LinkedIn profile without their permission (impersonation).</li>
            <li>Sexually explicit, hateful, violent, or otherwise illegal content in any field.</li>
            <li>Spam, scam, or fraudulent listings, including fake or misleading profiles.</li>
            <li>Automated or bot-submitted entries intended to manipulate rankings.</li>
            <li>Any use of the payment flow for a purpose other than listing a profile on the board.</li>
          </ul>
        </Section>

        <Section title="Moderation and enforcement">
          <p>
            Every listing is reviewable after submission. We remove any listing that violates
            these rules as soon as we become aware of it, without refunding the bid paid to
            create it. Repeated or serious violations may result in that LinkedIn profile being
            permanently blocked from the board.
          </p>
        </Section>

        <Section title="Report a listing">
          <p>
            If you spot a listing that violates these rules, email{" "}
            <a href="mailto:contact@outbidin.lol" className="underline" style={{ color: "var(--gold)" }}>
              support@outbidin.lol
            </a>{" "}
            with a link to the listing and a short description of the issue. We review reports
            promptly.
          </p>
        </Section>

        <Section title="Refunds">
          <p>
            Bids are non-refundable except where a listing is removed for violating these
            rules, or as required by law. Since rank is determined purely by bid amount,
            being outbid by someone else is expected behavior, not grounds for a refund.
          </p>
        </Section>
      </div>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-display text-xl mb-3" style={{ color: "var(--ink)" }}>
        {title}
      </h2>
      <div className="text-[15px] leading-relaxed" style={{ color: "var(--muted)" }}>
        {children}
      </div>
    </div>
  );
}

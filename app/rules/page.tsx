export const metadata = {
  title: "Rules & Moderation — Outbidin",
  description: "Outbidin rules, moderation standards, reporting and refund policy.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="font-display text-xl mb-3"
        style={{ color: "var(--ink)" }}
      >
        {title}
      </h2>
      <div className="text-sm leading-7" style={{ color: "var(--muted)" }}>
        {children}
      </div>
    </section>
  );
}

export default function RulesPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-14 pb-16">
        <p
          className="text-xs tracking-[0.25em] uppercase mb-3"
          style={{ color: "var(--gold)" }}
        >
          Outbidin
        </p>
        <h1
          className="font-display text-4xl sm:text-5xl leading-[1.05] mb-4"
          style={{ color: "var(--ink)" }}
        >
          Rules &amp; Moderation
        </h1>
        <p className="text-base leading-relaxed mb-10" style={{ color: "var(--muted)" }}>
          Outbidin is a paid leaderboard for LinkedIn profiles and companies.
          Keep listings accurate, lawful and respectful so the board remains useful to everyone.
        </p>

        <Section title="1. What you can list">
          <p>
            You may submit your own LinkedIn profile or company page, or a profile/page you are authorized to represent.
            The submitted URL must be a valid LinkedIn profile or company URL.
          </p>
        </Section>

        <Section title="2. Prohibited content">
          <ul className="list-disc pl-5 space-y-1">
            <li>Impersonation, deceptive identity claims or fraudulent information.</li>
            <li>Illegal, threatening, hateful or abusive content.</li>
            <li>Spam, malware, phishing or links intended to harm visitors.</li>
            <li>Content that infringes another person's or company's rights.</li>
            <li>Listings submitted without authorization where authorization is required.</li>
          </ul>
        </Section>

        <Section title="3. Bidding and ranking">
          <p>
            Rankings are determined by bid amount. A higher valid bid can move a listing above another listing.
            Bids are submitted through our payment provider and a listing only becomes active after payment is confirmed.
          </p>
        </Section>

        <Section title="4. Moderation">
          <p>
            We may remove or reject a listing if it violates these rules, appears fraudulent, creates a safety or legal risk,
            or is otherwise unsuitable for the board. Repeated or serious violations may result in a permanent block from submitting listings.
          </p>
        </Section>

        <Section title="5. Report a listing">
          <p>
            If you see a listing that violates these rules, email{" "}
            <a
              href="mailto:contact@outbidin.lol"
              className="underline underline-offset-2"
              style={{ color: "var(--gold)" }}
            >
              contact@outbidin.lol
            </a>{" "}
            with the listing link and a short description of the issue. We review reports promptly.
          </p>
        </Section>

        <Section title="6. Refunds">
          <p>
            Bids are generally non-refundable because the service is based on the submitted bid and resulting ranking.
            A refund may be considered when a payment was charged in error, a listing is removed for violating these rules,
            or a refund is required by applicable law.
          </p>
        </Section>
      </div>
    </main>
  );
}

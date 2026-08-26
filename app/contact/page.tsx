export const metadata = {
  title: "Contact — Outbidin",
  description: "Contact the Outbidin team.",
};

export default function ContactPage() {
  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-14 pb-16">
        <p
          className="text-xs tracking-[0.25em] uppercase mb-3"
          style={{ color: "var(--gold)" }}
        >
          Get in touch
        </p>
        <h1
          className="font-display text-4xl sm:text-5xl leading-[1.05] mb-4"
          style={{ color: "var(--ink)" }}
        >
          Contact us
        </h1>
        <p className="text-base leading-relaxed mb-8" style={{ color: "var(--muted)" }}>
          Questions about a listing, a payment, moderation, or your account? Send us an email and include the relevant listing or payment details when possible.
        </p>

        <div
          className="rounded-2xl p-6"
          style={{ background: "var(--surface-2)", border: "1px solid var(--line)" }}
        >
          <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "var(--muted-2)" }}>
            Email
          </p>
          <a
            href="mailto:contact@outbidin.lol"
            className="text-lg underline underline-offset-4"
            style={{ color: "var(--gold)" }}
          >
            contact@outbidin.lol
          </a>
        </div>
      </div>
    </main>
  );
}

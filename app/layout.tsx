import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outbidin — Pay to sit at the top of LinkedIn",
  description:
    "A live-bid leaderboard for LinkedIn profiles. Outbid the person above you to claim their rank.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}

        <footer
          className="border-t px-5 py-8 sm:px-6"
          style={{ background: "var(--surface)", borderColor: "var(--line)" }}
        >
          <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
            <p style={{ color: "var(--muted-2)" }}>
              © {new Date().getFullYear()} Outbidin
            </p>
            <nav className="flex items-center gap-5" aria-label="Footer navigation">
              <a
                href="/rules"
                className="underline underline-offset-2"
                style={{ color: "var(--muted)" }}
              >
                Rules &amp; Moderation
              </a>
              <a
                href="/contact"
                className="underline underline-offset-2"
                style={{ color: "var(--muted)" }}
              >
                Contact
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

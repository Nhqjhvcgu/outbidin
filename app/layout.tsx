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
      <body className="antialiased">{children}</body>
    </html>
  );
}

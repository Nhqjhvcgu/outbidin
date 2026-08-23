"use client";

import { useEffect, useState } from "react";
import { CATEGORIES } from "@/lib/categories";
import type { Listing } from "@/lib/supabase";
import BidModal from "@/components/BidModal";

function formatDollars(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

export default function Home() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/listings");
        const data = await res.json();
        if (!cancelled) setListings(data.listings ?? []);
      } catch {
        if (!cancelled) setListings([]);
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const filtered =
    listings?.filter((l) => activeCategory === "All" || l.category === activeCategory) ?? [];
  const [top, ...rest] = filtered;

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-14 pb-28">
        {/* Header */}
        <header className="mb-10 count-in">
          <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "var(--gold)" }}>
            The board only goes one way: up
          </p>
          <h1 className="font-display italic text-4xl sm:text-5xl leading-[1.05] mb-4" style={{ color: "var(--ink)" }}>
            Pay to sit at the top of LinkedIn.
          </h1>
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            Rank is not earned here, it&apos;s bought. List your profile, name your price, and
            hold the spot until someone pays more than you did.
          </p>
        </header>

        {/* Category filter */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar">
          {["All", ...CATEGORIES].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              className="whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm shrink-0"
              style={
                activeCategory === c
                  ? { background: "var(--gold)", color: "var(--bg)" }
                  : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--line)" }
              }
            >
              {c}
            </button>
          ))}
        </div>

        {/* Leaderboard */}
        {listings === null && (
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Loading the board…
          </p>
        )}

        {listings !== null && filtered.length === 0 && (
          <div
            className="rounded-2xl p-8 text-center count-in"
            style={{ background: "var(--surface)", border: "1px dashed var(--line)" }}
          >
            <p className="font-display text-xl mb-2" style={{ color: "var(--ink)" }}>
              Nobody&apos;s claimed this category yet.
            </p>
            <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
              Be the first name on the board — it only takes $5 to open it.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="px-5 py-2.5 rounded-full font-medium text-sm"
              style={{ background: "var(--gold)", color: "var(--bg)" }}
            >
              Claim it
            </button>
          </div>
        )}

        {top && (
          <div
            className="rounded-2xl p-6 mb-4 count-in relative overflow-hidden"
            style={{ background: "var(--surface)", border: "1px solid var(--gold)" }}
          >
            <div className="absolute inset-x-0 top-0 h-1 rail" />
            <div className="flex items-center gap-4">
              <Avatar initial={top.avatar_initial} rank={1} />
              <div className="flex-1 min-w-0">
                <p className="text-xs mb-1" style={{ color: "var(--gold)" }}>
                  #1 · the corner office
                </p>
                <p className="font-display text-xl truncate" style={{ color: "var(--ink)" }}>
                  {top.name}
                </p>
                {top.headline && (
                  <p className="text-sm truncate" style={{ color: "var(--muted)" }}>
                    {top.headline}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="font-display text-2xl tabular" style={{ color: "var(--gold-soft)" }}>
                  {formatDollars(top.bid_amount_cents)}
                </p>
                <a
                  href={top.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs underline"
                  style={{ color: "var(--muted)" }}
                >
                  View profile
                </a>
              </div>
            </div>
          </div>
        )}

        {rest.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            {rest.map((l, i) => (
              <Row key={l.id} listing={l} rank={i + 2} last={i === rest.length - 1} />
            ))}
          </div>
        )}

        {/* Latest activity ticker */}
        {listings && listings.length > 0 && (
          <div className="mt-10 count-in">
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: "var(--muted-2)" }}>
              Latest activity
            </p>
            <div className="space-y-2">
              {[...listings]
                .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
                .slice(0, 4)
                .map((l) => (
                  <div key={l.id} className="flex justify-between text-sm">
                    <span style={{ color: "var(--ink)" }}>{l.name}</span>
                    <span className="tabular" style={{ color: "var(--muted)" }}>
                      {formatDollars(l.bid_amount_cents)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 flex justify-center" style={{ background: "linear-gradient(0deg, var(--bg) 60%, transparent)" }}>
        <button
          onClick={() => setModalOpen(true)}
          className="px-6 py-3.5 rounded-full font-medium shadow-lg"
          style={{ background: "var(--gold)", color: "var(--bg)" }}
        >
          Claim your rank →
        </button>
      </div>

      {modalOpen && (
        <BidModal
          onClose={() => {
            setModalOpen(false);
          }}
        />
      )}

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}

function Avatar({ initial, rank }: { initial: string; rank: number }) {
  return (
    <div
      className="w-12 h-12 rounded-full flex items-center justify-center font-display text-lg shrink-0"
      style={{
        background: rank === 1 ? "var(--gold)" : "var(--surface-2)",
        color: rank === 1 ? "var(--bg)" : "var(--ink)",
        border: rank === 1 ? "none" : "1px solid var(--line)",
      }}
    >
      {initial}
    </div>
  );
}

function Row({ listing, rank, last }: { listing: Listing; rank: number; last: boolean }) {
  return (
    <div
      className="flex items-center gap-4 px-5 py-4"
      style={{
        background: "var(--surface)",
        borderBottom: last ? "none" : "1px solid var(--line)",
      }}
    >
      <span className="w-6 text-sm tabular text-right shrink-0" style={{ color: "var(--muted-2)" }}>
        {rank}
      </span>
      <Avatar initial={listing.avatar_initial} rank={rank} />
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate" style={{ color: "var(--ink)" }}>
          {listing.name}
        </p>
        {listing.headline && (
          <p className="text-sm truncate" style={{ color: "var(--muted)" }}>
            {listing.headline}
          </p>
        )}
      </div>
      <p className="tabular font-medium shrink-0" style={{ color: "var(--gold)" }}>
        {formatDollars(listing.bid_amount_cents)}
      </p>
    </div>
  );
}

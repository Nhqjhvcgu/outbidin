"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  UserSearch,
  TrendingUp,
  Megaphone,
  Search,
  Users,
  Sparkles,
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { CATEGORIES, MIN_BID_DOLLARS } from "@/lib/categories";
import type { Listing } from "@/lib/supabase";
import { timeAgo } from "@/lib/time";
import BidModal from "@/components/BidModal";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  All: LayoutGrid,
  "Founders & Executives": Building2,
  "Recruiters & Talent": UserSearch,
  "Sales & Growth": TrendingUp,
  "Marketing & Content": Megaphone,
  "Job Seekers": Search,
  "Consultants & Freelancers": Users,
  Other: Sparkles,
};

function formatDollars(cents: number) {
  return `$${Math.round(cents / 100).toLocaleString("en-US")}`;
}

function trackClick(linkedinUrl: string) {
  fetch("/api/track-click", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ linkedin_url: linkedinUrl }),
  }).catch(() => {});
}

export default function Home() {
  const [listings, setListings] = useState<Listing[] | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [quickUrl, setQuickUrl] = useState("");
  const [quickCategory, setQuickCategory] = useState<string>("");
  const [totalViews, setTotalViews] = useState<number | null>(null);
  const pillRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const pillContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetch("/api/track-view", { method: "POST" })
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.total_views === "number") setTotalViews(data.total_views);
      })
      .catch(() => {});
  }, []);

  // Center the selected category pill in its scroll container. Uses
  // getBoundingClientRect (viewport-relative) rather than offsetLeft, since
  // offsetLeft is measured against the nearest *positioned* ancestor — which
  // isn't necessarily this scroll container — and was producing wrong,
  // ever-drifting scroll targets.
  useEffect(() => {
    const container = pillContainerRef.current;
    const pill = pillRefs.current[activeCategory];
    if (!container || !pill) return;
    const containerRect = container.getBoundingClientRect();
    const pillRect = pill.getBoundingClientRect();
    const pillCenterInContent =
      pillRect.left - containerRect.left + container.scrollLeft + pillRect.width / 2;
    const target = pillCenterInContent - container.clientWidth / 2;
    container.scrollTo({
      left: Math.max(0, target),
      behavior: "smooth",
    });
  }, [activeCategory]);

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
  const currentTopCents = listings?.length
    ? Math.max(...listings.map((l) => l.bid_amount_cents))
    : 0;
  const heroBaseBid =
    currentTopCents > 0 ? Math.round(currentTopCents / 100) + 1 : MIN_BID_DOLLARS;
  const [heroOverride, setHeroOverride] = useState<number | null>(null);
  const heroBid = heroOverride ?? heroBaseBid;
  const [modalInitialBid, setModalInitialBid] = useState<number | undefined>(undefined);

  function openModalWithQuickFields() {
    setModalInitialBid(undefined);
    setModalOpen(true);
  }

  function openModalForHeroBid() {
    setModalInitialBid(heroBid);
    setModalOpen(true);
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)" }}>
      <div className="max-w-2xl mx-auto px-5 sm:px-6 pt-14 pb-28">
        {/* Stats bar */}
        {totalViews !== null && (
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm mb-6"
            style={{ background: "var(--surface-2)", color: "var(--muted)" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "var(--gold)" }}
            />
            {totalViews.toLocaleString("en-US")} visitors since launch
          </motion.div>
        )}

        {/* Header */}
        <motion.header
          className="mb-8"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <p className="text-xs tracking-[0.25em] uppercase mb-3" style={{ color: "var(--gold)" }}>
            The board only goes one way: up
          </p>
          {currentTopCents > 0 ? (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <h1 className="font-display text-3xl sm:text-4xl" style={{ color: "var(--ink)" }}>
                Claim #1 for
              </h1>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setHeroOverride(Math.max(MIN_BID_DOLLARS, heroBid - 1))}
                aria-label="Decrease amount"
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium"
                style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
              >
                −
              </motion.button>
              <button
                onClick={openModalForHeroBid}
                className="font-display text-3xl sm:text-4xl tabular"
                style={{ color: "var(--gold)" }}
              >
                {formatDollars(heroBid * 100)}
              </button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setHeroOverride(heroBid + 1)}
                aria-label="Increase amount"
                className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-medium"
                style={{ background: "var(--surface-2)", color: "var(--ink)", border: "1px solid var(--line)" }}
              >
                +
              </motion.button>
            </div>
          ) : (
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.05] mb-4" style={{ color: "var(--ink)" }}>
              Pay to sit at the top of LinkedIn.
            </h1>
          )}
          <p className="text-base leading-relaxed" style={{ color: "var(--muted)" }}>
            New spots start at ${MIN_BID_DOLLARS}. Paying less than the #1 price still puts
            you on the board at whatever place your bid can take.
          </p>
        </motion.header>

        {/* Quick submit */}
        <motion.div
          className="flex flex-col sm:flex-row gap-2 mb-8"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <input
            type="url"
            placeholder="Your LinkedIn profile or company URL"
            value={quickUrl}
            onChange={(e) => setQuickUrl(e.target.value)}
            className="quick-input flex-1"
          />
          <select
            value={quickCategory}
            onChange={(e) => setQuickCategory(e.target.value)}
            className="quick-input sm:w-48"
          >
            <option value="">Choose a category</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={openModalWithQuickFields}
            className="px-6 py-3 rounded-full font-medium shrink-0"
            style={{ background: "var(--gold)", color: "var(--bg)" }}
          >
            Outbid
          </motion.button>
        </motion.div>

        {/* Category filter */}
        <div
          ref={pillContainerRef}
          className="flex gap-2 overflow-x-auto pb-2 mb-6 no-scrollbar"
        >
          {["All", ...CATEGORIES].map((c) => {
            const Icon = CATEGORY_ICONS[c] ?? Sparkles;
            return (
              <button
                key={c}
                ref={(el) => {
                  pillRefs.current[c] = el;
                }}
                onClick={() => setActiveCategory(c)}
                className="relative whitespace-nowrap px-3.5 py-1.5 rounded-full text-sm shrink-0 transition-colors duration-200 flex items-center gap-1.5"
                style={{
                  color: activeCategory === c ? "var(--bg)" : "var(--muted)",
                  border: activeCategory === c ? "none" : "1px solid var(--line)",
                }}
              >
                {activeCategory === c && (
                  <motion.span
                    layoutId="activePill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: "var(--gold)" }}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className="relative w-3.5 h-3.5" strokeWidth={2.25} />
                <span className="relative">{c}</span>
              </button>
            );
          })}
        </div>

        {/* Leaderboard */}
        {listings === null && (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-16 rounded-2xl"
                style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
                animate={{ opacity: [0.4, 0.7, 0.4] }}
                transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.15 }}
              />
            ))}
          </div>
        )}

        <AnimatePresence mode="wait">
          {listings !== null && filtered.length === 0 && (
            <motion.div
              key="empty"
              className="rounded-2xl p-8 text-center"
              style={{ background: "var(--surface)", border: "1px dashed var(--line)" }}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
            >
              <p className="font-display text-xl mb-2" style={{ color: "var(--ink)" }}>
                Nobody&apos;s claimed this category yet.
              </p>
              <p className="text-sm mb-5" style={{ color: "var(--muted)" }}>
                Be the first name on the board — it only takes ${MIN_BID_DOLLARS} to open it.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={openModalWithQuickFields}
                style={{ background: "var(--gold)", color: "var(--bg)" }}
              >
                Claim it
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {top && (
            <motion.div
              key={top.id}
              layout
              className="rounded-2xl p-6 mb-4 relative overflow-hidden"
              style={{ background: "var(--surface)", border: "1px solid var(--gold)" }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              whileHover={{ y: -2 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
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
                  <p className="text-xs mt-1" style={{ color: "var(--muted-2)" }}>
                    {timeAgo(top.updated_at)} · {top.clicks ?? 0} click{top.clicks === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-2xl tabular" style={{ color: "var(--gold-soft)" }}>
                    {formatDollars(top.bid_amount_cents)}
                  </p>
                  <a
                    href={top.linkedin_url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => trackClick(top.linkedin_url)}
                    className="text-xs underline"
                    style={{ color: "var(--muted)" }}
                  >
                    View profile
                  </a>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {rest.length > 0 && (
          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            <AnimatePresence>
              {rest.map((l, i) => (
                <Row key={l.id} listing={l} rank={i + 2} last={i === rest.length - 1} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Latest activity ticker */}
        {listings && listings.length > 0 && (
          <motion.div
            className="mt-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <p className="text-xs tracking-[0.2em] uppercase mb-3" style={{ color: "var(--muted-2)" }}>
              Latest activity
            </p>
            <div className="space-y-2">
              {[...listings]
                .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
                .slice(0, 4)
                .map((l, i) => (
                  <motion.div
                    key={l.id}
                    className="flex justify-between text-sm"
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + i * 0.06, duration: 0.3 }}
                  >
                    <span style={{ color: "var(--ink)" }}>{l.name}</span>
                    <span className="tabular" style={{ color: "var(--muted)" }}>
                      {formatDollars(l.bid_amount_cents)}
                    </span>
                  </motion.div>
                ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 p-4 flex justify-center" style={{ background: "linear-gradient(0deg, var(--bg) 60%, transparent)" }}>
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={openModalWithQuickFields}
          className="px-6 py-3.5 rounded-full font-medium shadow-lg"
          style={{ background: "var(--gold)", color: "var(--bg)" }}
        >
          Claim your rank →
        </motion.button>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <BidModal
            initialLinkedinUrl={quickUrl}
            initialCategory={quickCategory}
            initialBid={modalInitialBid}
            onClose={() => {
              setModalOpen(false);
            }}
          />
        )}
      </AnimatePresence>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .quick-input {
          background: var(--surface);
          border: 1px solid var(--line);
          border-radius: 9999px;
          padding: 0.75rem 1.1rem;
          color: var(--ink);
          font-size: 0.95rem;
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .quick-input::placeholder {
          color: var(--muted-2);
        }
        .quick-input:focus {
          outline: none;
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(201, 162, 39, 0.15);
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

function Row({
  listing,
  rank,
  last,
  index,
}: {
  listing: Listing;
  rank: number;
  last: boolean;
  index: number;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.04, 0.4) }}
      whileHover={{ x: 2 }}
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
        <p className="text-xs mt-0.5" style={{ color: "var(--muted-2)" }}>
          {timeAgo(listing.updated_at)} · {listing.clicks ?? 0} click{listing.clicks === 1 ? "" : "s"}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="tabular font-medium" style={{ color: "var(--gold)" }}>
          {formatDollars(listing.bid_amount_cents)}
        </p>
        <a
          href={listing.linkedin_url}
          target="_blank"
          rel="noreferrer"
          onClick={() => trackClick(listing.linkedin_url)}
          className="text-xs underline"
          style={{ color: "var(--muted)" }}
        >
          View
        </a>
      </div>
    </motion.div>
  );
}

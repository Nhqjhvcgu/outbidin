"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CATEGORIES, MIN_BID_DOLLARS } from "@/lib/categories";

export default function BidModal({
  onClose,
  initialLinkedinUrl = "",
  initialCategory = "",
  initialBid,
}: {
  onClose: () => void;
  initialLinkedinUrl?: string;
  initialCategory?: string;
  initialBid?: number;
}) {
  const [linkedinUrl, setLinkedinUrl] = useState(initialLinkedinUrl);
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [category, setCategory] = useState<string>(
    initialCategory && (CATEGORIES as readonly string[]).includes(initialCategory)
      ? initialCategory
      : CATEGORIES[0]
  );
  const [bid, setBid] = useState(String(initialBid ?? MIN_BID_DOLLARS));
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkedin_url: linkedinUrl.trim(),
          name: name.trim(),
          headline: headline.trim(),
          category,
          bid_dollars: Number(bid),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        setLoading(false);
        return;
      }

      if (!data.checkout_url) {
        setError("Checkout could not be created. Please try again.");
        setLoading(false);
        return;
      }

      // Dodo hosts the secure payment page. We redirect the customer there
      // instead of loading a payment SDK into this modal.
      window.location.assign(data.checkout_url);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-6"
      style={{ background: "rgba(6,10,16,0.75)" }}
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 sm:p-8"
        style={{ background: "var(--surface)", border: "1px solid var(--line)" }}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase mb-1" style={{ color: "var(--gold)" }}>
              Claim your rank
            </p>
            <h2 className="font-display text-2xl" style={{ color: "var(--ink)" }}>
              Put your profile up.
            </h2>
          </div>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            aria-label="Close"
            className="text-2xl leading-none"
            style={{ color: "var(--muted)" }}
          >
            ×
          </motion.button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="LinkedIn profile or company URL">
            <input
              required
              type="url"
              placeholder="https://www.linkedin.com/in/yourname"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Name">
            <input
              required
              maxLength={80}
              placeholder="Jordan Reyes"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="One-line headline">
            <input
              maxLength={140}
              placeholder="Helping B2B teams close bigger deals"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="input"
            />
          </Field>

          <Field label="Category">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label={`Your bid (min $${MIN_BID_DOLLARS})`}>
            <div className="relative">
              <span
                className="absolute left-4 top-1/2 -translate-y-1/2"
                style={{ color: "var(--muted)" }}
              >
                $
              </span>
              <input
                required
                type="number"
                min={MIN_BID_DOLLARS}
                step={1}
                value={bid}
                onChange={(e) => setBid(e.target.value)}
                className="input pl-7"
              />
            </div>
          </Field>

          {error && (
            <p className="text-sm" style={{ color: "var(--rust)" }}>
              {error}
            </p>
          )}

          <motion.button
            whileHover={{ scale: loading ? 1 : 1.015 }}
            whileTap={{ scale: loading ? 1 : 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-full font-medium mt-2 disabled:opacity-60"
            style={{ background: "var(--gold)", color: "var(--bg)" }}
          >
            {loading ? "Preparing checkout…" : `Continue to pay $${bid || 0}`}
          </motion.button>
          <p className="text-xs text-center" style={{ color: "var(--muted-2)" }}>
            Handled securely by Dodo Payments. Your rank goes live after payment is confirmed.
          </p>
        </form>
      </motion.div>

      <style jsx global>{`
        .input {
          width: 100%;
          background: var(--surface-2);
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 0.7rem 1rem;
          color: var(--ink);
          font-size: 0.95rem;
        }
        .input::placeholder {
          color: var(--muted-2);
        }
      `}</style>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs mb-1.5" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

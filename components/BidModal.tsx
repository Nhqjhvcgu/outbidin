"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { CATEGORIES, MIN_BID_DOLLARS } from "@/lib/categories";

interface PayPalButtonsInstance {
  render: (container: HTMLElement) => void;
}
interface PayPalNamespace {
  Buttons: (options: {
    createOrder: () => Promise<string>;
    onApprove: (data: { orderID: string }) => void | Promise<void>;
    onCancel?: () => void;
    onError?: (err: unknown) => void;
  }) => PayPalButtonsInstance;
}
declare global {
  interface Window {
    paypal?: PayPalNamespace;
  }
}

// PayPal's checkout widget is a client-side script parameterized by your
// client id, so (unlike a static script URL) we can only load it once we
// know which client id to use — reload only if that id ever changes.
let paypalScriptPromise: Promise<void> | null = null;
let paypalScriptClientId: string | null = null;
function loadPaypalScript(clientId: string): Promise<void> {
  if (typeof window !== "undefined" && window.paypal && paypalScriptClientId === clientId) {
    return Promise.resolve();
  }
  if (paypalScriptPromise && paypalScriptClientId === clientId) return paypalScriptPromise;
  paypalScriptClientId = clientId;
  paypalScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById("paypal-sdk");
    if (existing) existing.remove();
    const script = document.createElement("script");
    script.id = "paypal-sdk";
    script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load PayPal"));
    document.body.appendChild(script);
  });
  return paypalScriptPromise;
}

type CheckoutData = { order_id: string; client_id: string; name: string };

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
  const router = useRouter();
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
  const [checkoutData, setCheckoutData] = useState<CheckoutData | null>(null);
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);

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
      setCheckoutData(data);
    } catch {
      setError("Couldn't reach the server. Try again.");
      setLoading(false);
    }
  }

  // Once we have an order, load PayPal's SDK and render its buttons into
  // our own container — this is an in-modal widget, not a redirect.
  useEffect(() => {
    if (!checkoutData) return;
    let cancelled = false;

    (async () => {
      try {
        await loadPaypalScript(checkoutData.client_id);
        if (cancelled || !paypalContainerRef.current || !window.paypal) return;
        paypalContainerRef.current.innerHTML = "";
        window.paypal
          .Buttons({
            createOrder: () => Promise.resolve(checkoutData.order_id),
            onApprove: async () => {
              setLoading(true);
              try {
                const res = await fetch("/api/capture-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ order_id: checkoutData.order_id }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setError(data.error || "Payment could not be confirmed.");
                  setLoading(false);
                  return;
                }
                router.push(
                  `/success?name=${encodeURIComponent(
                    data.name ?? checkoutData.name
                  )}&amount=${Math.round((data.bid_amount_cents ?? 0) / 100)}`
                );
              } catch {
                setError("Payment succeeded but confirming it failed. Contact support.");
                setLoading(false);
              }
            },
            onCancel: () => setLoading(false),
            onError: () => {
              setError("PayPal ran into a problem. Please try again.");
              setLoading(false);
            },
          })
          .render(paypalContainerRef.current);
      } catch {
        if (!cancelled) setError("Couldn't load PayPal. Please try again.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [checkoutData, router]);

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
              {checkoutData ? "Complete your payment." : "Put your profile up."}
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

        {!checkoutData ? (
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
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input"
              >
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
              Handled securely by PayPal. Your rank goes live the moment payment clears.
            </p>
          </form>
        ) : (
          <div>
            <p className="text-sm mb-4" style={{ color: "var(--muted)" }}>
              Paying ${bid} to claim a spot as <strong>{checkoutData.name}</strong>.
            </p>
            <div ref={paypalContainerRef} />
            {error && (
              <p className="text-sm mt-3" style={{ color: "var(--rust)" }}>
                {error}
              </p>
            )}
            <button
              onClick={() => {
                setCheckoutData(null);
                setError(null);
              }}
              className="text-xs mt-4 underline"
              style={{ color: "var(--muted-2)" }}
            >
              ← Edit details
            </button>
          </div>
        )}
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

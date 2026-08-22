# Outbidin — a pay-to-rank leaderboard for LinkedIn profiles

Same mechanic as outbid.lol: submit a LinkedIn profile, name a bid, get ranked.
Someone else can outbid you and take your spot at any time. Built with
Next.js, Stripe (payment), and Supabase (database).

This guide assumes zero prior experience with any of these tools. Follow it
top to bottom and you'll have a live site on your own domain by the end.

---

## 0. What you need before starting

- Your domain (you said you already have this)
- A Stripe account (you said you already have this)
- A free [Supabase](https://supabase.com) account — this is new, it's the database
- A free [Vercel](https://vercel.com) account — this is new, it's where the site is hosted
- A free [GitHub](https://github.com) account — Vercel deploys from a GitHub repo

---

## 1. Set up the database (Supabase)

1. Go to [supabase.com](https://supabase.com) → sign up → **New project**.
2. Pick any name and password (save the password somewhere), pick a region close to your users.
3. Once the project finishes setting up, go to **SQL Editor** (left sidebar) → **New query**.
4. Open `supabase/schema.sql` from this project, copy all of it, paste it into the SQL editor, click **Run**.
   This creates the `listings` table that holds every profile + bid.
5. Go to **Project Settings → API**. You'll need three values from this page in step 3 below:
   - `Project URL` → this is `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → this is `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key (click reveal) → this is `SUPABASE_SERVICE_ROLE_KEY`

   The `service_role` key can write to your database with no restrictions.
   Never put it in any file that starts with `NEXT_PUBLIC_`, never commit it
   to a public GitHub repo. It only ever goes into Vercel's environment
   variables (server-side only), which is what step 3 below has you do.

---

## 2. Put the code on GitHub

1. Create a new empty repository on GitHub (e.g. `outbidin`).
2. In a terminal, inside this project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/outbidin.git
   git push -u origin main
   ```

---

## 3. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → sign up/log in with GitHub.
2. **Add New → Project** → select the `outbidin` repo you just pushed.
3. Framework preset should auto-detect as **Next.js** — leave defaults.
4. Before clicking Deploy, open **Environment Variables** and add these (values from Supabase step 1, and Stripe — see step 5 below):

   | Key | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | from Supabase |
   | `SUPABASE_SERVICE_ROLE_KEY` | from Supabase |
   | `STRIPE_SECRET_KEY` | from Stripe (step 5) |
   | `STRIPE_WEBHOOK_SECRET` | from Stripe (step 6, add after first deploy) |
   | `NEXT_PUBLIC_SITE_URL` | your domain, e.g. `https://outbidin.lol` |

5. Click **Deploy**. In ~1 minute you'll get a live URL like `outbidin.vercel.app` — the site works right now, just not on your own domain yet and not accepting real payments yet (that's steps 4–6).

---

## 4. Connect your domain

1. In the Vercel project → **Settings → Domains** → type `outbidin.lol` (your domain) → **Add**.
2. Vercel will show you either:
   - One **A record** (if using the domain's root, e.g. `outbidin.lol`) pointing to an IP like `76.76.21.21`, or
   - One **CNAME record** (if using a subdomain, e.g. `www.outbidin.lol`) pointing to `cname.vercel-dns.com`
3. Go to wherever you bought the domain (Namecheap, GoDaddy, Porkbun, etc.) → find **DNS settings / Manage DNS** for that domain.
4. Add the exact record Vercel showed you. Delete any conflicting existing A/CNAME record on the same host.
5. Wait 10 minutes to a few hours for DNS to propagate. Vercel's Domains page shows a green checkmark once it's live, and auto-issues a free HTTPS certificate — no extra step needed.
6. Once it's live, go back to Vercel env vars and update `NEXT_PUBLIC_SITE_URL` to your real domain, then **redeploy** (Deployments tab → ⋯ → Redeploy).

---

## 5. Connect Stripe (test mode first)

1. In your [Stripe Dashboard](https://dashboard.stripe.com), make sure the toggle top-right says **Test mode** for now — you'll switch to live mode in step 7.
2. Go to **Developers → API keys** → copy the **Secret key** (starts with `sk_test_`).
3. Paste it into Vercel as `STRIPE_SECRET_KEY` (Settings → Environment Variables → edit).

---

## 6. Connect the Stripe webhook (this is what makes payments actually update the leaderboard)

1. In Stripe → **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://outbidin.lol/api/webhook` (your real domain, once step 4 is live).
3. Select event: `checkout.session.completed`.
4. Click **Add endpoint**. Click into it, reveal the **Signing secret** (starts with `whsec_`).
5. Paste that into Vercel as `STRIPE_WEBHOOK_SECRET`.
6. Redeploy the project (Deployments → ⋯ → Redeploy) so the new env vars take effect.

Test it: on your live site, submit a bid using a Stripe test card — number `4242 4242 4242 4242`, any future expiry, any CVC. After paying, you should land on the success page and see the listing appear on the leaderboard within a few seconds.

---

## 7. Go live (accept real payments)

1. In Stripe, finish **Activate your account** if you haven't (business details, bank account).
2. Flip the dashboard toggle from **Test mode** to **Live mode**.
3. Repeat steps 5 and 6 in live mode: copy the **live** secret key (`sk_live_...`) and create a **new** webhook endpoint in live mode (test-mode and live-mode webhooks are separate), get its live `whsec_...` signing secret.
4. Update `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in Vercel with the live values, redeploy.

You're now taking real payments on your own domain.

---

## Running it locally (optional, for making changes before deploying)

```bash
npm install
cp .env.local.example .env.local   # then fill in the values
npm run dev
```
Open `http://localhost:3000`. Use `stripe listen --forward-to localhost:3000/api/webhook` (via the Stripe CLI) to test webhooks locally.

## Editing rules, categories, or copy

- Minimum bid and categories: `lib/categories.ts`
- Homepage copy and layout: `app/page.tsx`
- Colors/fonts: `app/globals.css` (colors) and `app/layout.tsx` (fonts)
- Bid form: `components/BidModal.tsx`

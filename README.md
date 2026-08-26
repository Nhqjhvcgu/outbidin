# Outbidin

Outbidin is a Next.js App Router site backed by Supabase and Dodo Payments.

## Payment flow

1. The visitor submits a LinkedIn URL, name, category and bid.
2. `/api/checkout` validates the submission and creates a Dodo hosted Checkout Session.
3. The customer is redirected to Dodo's secure checkout.
4. Dodo sends `payment.succeeded` to `/api/webhook`.
5. The webhook verifies Dodo's HMAC signature and writes the listing to Supabase.

The browser return page is not treated as proof of payment. The signed webhook is the source of truth.

## Vercel environment variables

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DODO_PAYMENTS_API_KEY`
- `DODO_PAYMENTS_WEBHOOK_KEY`
- `DODO_PAYMENTS_ENVIRONMENT` (`test_mode` while testing, `live_mode` for production)
- `DODO_PAYMENTS_RETURN_URL` (`https://outbidin.lol/success`)
- `DODO_PRODUCT_ID`

## Dodo product

Create a one-time **Pay What You Want** product in Dodo Payments. The checkout route passes the visitor's bid in the lowest currency unit (USD cents).

## Webhook

Create a Dodo webhook endpoint at:

`https://outbidin.lol/api/webhook`

Subscribe to `payment.succeeded` (and optionally `payment.failed`). Copy the endpoint signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`.

## Supabase

Run `supabase/schema.sql` in the Supabase SQL Editor.

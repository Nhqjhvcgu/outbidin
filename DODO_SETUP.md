# Dodo Payments setup for Outbidin

1. In Dodo Payments, use **test mode** first.
2. Create a one-time **Pay What You Want** product. Set the minimum to $1 if that matches the site.
3. Open the product details and copy its product ID into Vercel as `DODO_PRODUCT_ID`.
4. In Developer -> API Keys, create/copy the test API key and put it in `DODO_PAYMENTS_API_KEY`.
5. In Developer -> Webhooks, add `https://outbidin.lol/api/webhook`. Subscribe to `payment.succeeded` and optionally `payment.failed`.
6. Open the endpoint Overview and copy its signing secret into `DODO_PAYMENTS_WEBHOOK_KEY`. Never put this secret in GitHub or client code.
7. In Vercel set `DODO_PAYMENTS_ENVIRONMENT=test_mode` and `DODO_PAYMENTS_RETURN_URL=https://outbidin.lol/success`.
8. Deploy and use Dodo's webhook Testing tab to confirm `/api/webhook` returns 2xx.
9. Make a real test-mode checkout. Confirm the Dodo webhook log shows `payment.succeeded` and the listing appears in Supabase.
10. Only after this works, create/use the live Dodo credentials, switch the webhook endpoint to the live environment if required by the dashboard, and change `DODO_PAYMENTS_ENVIRONMENT=live_mode`.

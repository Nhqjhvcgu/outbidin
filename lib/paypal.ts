// PayPal has no official lightweight SDK for this use case, so we call
// their REST API v2 directly with fetch. Live mode only (no sandbox
// switch), matching this project's needs.

export const PAYPAL_API_BASE = "https://api-m.paypal.com";

export async function getPaypalAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !secret) {
    throw new Error("Missing PAYPAL_CLIENT_ID or PAYPAL_CLIENT_SECRET");
  }
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");
  const res = await fetch(`${PAYPAL_API_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) {
    throw new Error(`Failed to get PayPal access token: ${res.status}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

# Payments in Sri Lanka

**Status: Secondary.** Two independent research papers (September 2026) agree on the points below.
Check fees on each provider's own pricing page before quoting them to a customer.

- **Stripe and PayPal** cannot be used by a Sri Lankan entity to receive payments. Plan on local
  gateways.
- **PayHere** supports recurring billing with stored cards: tokenization is LKR 8 per card per
  month. The processing fee depends on the plan: about 3.30% on standard plans, 2.69% on Premium
  (LKR 9,990 per month).
- **Settlement** takes T+1 to T+3 depending on gateway and bank. Model cash flow on T+3.
- **LankaQR** is the Central Bank's national QR standard for local payments.

## Engineering rules

- Never simulate a payment in the browser. Today's marketplace checkout waits 1.5 s and says
  "MockStripe" (`src/app/(dashboard)/marketplace/page.tsx`). Payment is confirmed only through a
  server-side, signature-verified webhook.
- Verify every inbound webhook's HMAC signature before acting on it, comparing in constant time.
  The Manus research includes a correct WhatsApp example to follow.
- `stripe`, `razorpay`, `@paypal/checkout-server-sdk` and `square` are installed but nothing
  calls them.

# Stripe Integration Guide (KanamEvents)

Configure Stripe so payments work in **KanamEvents** (create payment intent, card form, confirm for guests and logged-in users).

## New Stripe account checklist

If you opened a **new Stripe account**, recreate everything in that account—keys from the old account will not work.

1. **API keys** (Test mode first): [Dashboard → API keys](https://dashboard.stripe.com/test/apikeys)
   - Publishable key (`pk_test_…`) → backend/frontend env
   - Secret key (`sk_test_…`) → backend only
2. **Products & Prices** for Pro/Enterprise subscriptions:
   - Prefer the setup script (idempotent):
     ```bash
     ./scripts/setup-stripe-products.sh --write-env
     ```
   - Creates:
     - Pro monthly ($99) → `STRIPE_PRICE_PRO_MONTHLY`
     - Pro yearly ($948) → `STRIPE_PRICE_PRO_YEARLY`
     - Enterprise yearly ($3000) → `STRIPE_PRICE_ENTERPRISE_YEARLY`
   - **Enterprise is annual-only** (no monthly Enterprise price / checkout).
   - Or create Prices in Dashboard and set the env vars manually.
3. **Webhook** endpoint (subscription lifecycle):
   - URL: `https://<your-api-host>/api/v1/webhooks/stripe`
   - Events to enable (minimum): `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`
4. **Connect** (organizer payouts): enable Connect Express in the new account and re-onboard organizers (old `acct_…` IDs will not work).
5. **Rotate env** in local `.env`, staging, and production (never reuse old secrets). Restart API + frontend after changing keys.

---

## 1. What’s already in the app

- **Backend**
  - `POST /api/v1/payments/create-intent` – creates a PaymentIntent; returns `clientSecret`
  - `POST /api/v1/payments/confirm` – confirms payment and creates order (authenticated)
  - `POST /api/v1/payments/guest/confirm` – guest checkout confirm
  - `POST /api/v1/webhooks/stripe` – subscription webhooks (signature verified)
  - Keys read from environment / secrets manager

- **Frontend**
  - Stripe Elements on checkout; confirms the PaymentIntent, then calls KanamEvents APIs to finalize the order

---

## 2. Configure environment variables

### Docker (root `.env` next to `docker-compose.yml`)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # from Dashboard webhook or Stripe CLI
# Subscription prices (Dashboard → Products)
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_YEARLY=price_...
STRIPE_PRICE_ENTERPRISE_YEARLY=price_...
# Enterprise monthly not used (annual-only)
# STRIPE_PRICE_ENTERPRISE_MONTHLY=
```

Restart after changing:

```bash
docker compose restart backend frontend
```

### Frontend only (`npm run dev` in `eventpro-frontend`)

Add to `eventpro-frontend/.env.local` if needed:

```bash
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

(Optional—publishable key is also served by `GET /api/v1/payments/config`.)

---

## 3. Verify

1. Start the stack (`make local-up` or `docker compose up`).
2. Checkout → card form should load (no “Payment is not configured”).
3. Test cards:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`
   - 3DS: `4000 0025 0000 3155`

If you see “Invalid API Key”, `STRIPE_SECRET_KEY` is wrong for this account—update `.env` and restart the backend.

---

## 4. Local webhook forwarding (optional)

Ticket payments do not require webhooks for the sync confirm path. For **subscriptions**:

```bash
stripe listen --forward-to localhost:8080/api/v1/webhooks/stripe
```

Put the CLI signing secret in `STRIPE_WEBHOOK_SECRET`.

---

## 5. Checklist

| Step | Done |
|------|------|
| New Stripe account: create/copy test (then live) API keys | ☐ |
| Set `STRIPE_SECRET_KEY` + `STRIPE_PUBLISHABLE_KEY` in root `.env` | ☐ |
| Recreate subscription Price IDs and set `STRIPE_PRICE_*` | ☐ |
| Create webhook to `/api/v1/webhooks/stripe` + `STRIPE_WEBHOOK_SECRET` | ☐ |
| Enable Connect if payouts are in scope | ☐ |
| Restart backend/frontend; test checkout with `4242…` | ☐ |

---

## 6. Security

- Never commit `.env` or secret keys.
- Use test keys locally; live keys only in production via secrets manager.
- Publishable key is browser-safe; secret key stays on the server.

See also [docs/VARIABLES.md](./VARIABLES.md).

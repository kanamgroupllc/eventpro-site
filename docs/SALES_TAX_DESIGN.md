# Sales Tax: Jurisdiction-Based (Billing Address)

## How it should work

Sales tax in the US is determined by **where the buyer is located** (destination-based), not by a single platform-wide rate. For **digital goods and event tickets**, the standard (Stripe, TaxJar, etc.) is to use the **billing address** for tax – not a separate “which state?” question.

1. **Collect billing address at checkout**  
   A **Billing address** section (country, state) is a normal part of checkout. Users expect it; we use state/country for tax automatically. No need to ask “which state are you buying from?” – the state comes from their billing address.

2. **Look up the applicable rate**  
   Use the buyer’s state (e.g. `CA`, `NY`) to get the tax rate for that jurisdiction. Rates can come from:
   - A **config or DB table** of state → rate (simple, you maintain it).
   - A **tax provider** (TaxJar, Avalara, Stripe Tax) for automatic, up-to-date rates and rules.

3. **Compute tax at checkout**  
   `GET /payments/checkout-totals?subtotal=100&state=CA&country=US` returns `tax` and `total` for that jurisdiction. Frontend shows “Tax (CA): $X.XX” and creates the payment intent for `total`.

4. **Store jurisdiction on the order**  
   Save `tax_amount` and **buyer state** (e.g. `buyer_state`) on the order for records and remittance.

5. **Remittance**  
   Remitting tax to each state is separate (filings, registrations). The design supports it by storing which state the tax was calculated for.

## Implementation in this codebase

- **Checkout totals API** accepts optional `state` and `country`. If provided, the backend uses **state-based rates** (e.g. `eventpro.tax.rates-by-state` in config). If not provided or unknown state, it falls back to `eventpro.tax.default-rate` (e.g. 0).
- **US only for now:** Only `country=US` (or omitted) uses the state rate map. Other countries can be added later (e.g. VAT by country).
- **Checkout UI** collects **State** (and **Country**) before payment (guest form and/or a “Tax location” step for logged-in users). These are sent to `getCheckoutTotals(subtotal, state, country)` and, for guest, in the confirm payload so the order can store `buyer_state`.
- **Order** stores `tax_amount`, `buyer_state`, and `buyer_country` (migration V27) for records and remittance.

### Stripe and billing address

- **Frontend:** The billing address (country, state) from the checkout form is sent to Stripe when confirming the card via `confirmCardPayment(..., { payment_method: { card, billing_details: { address: { state, country } } } })`. Stripe can validate this with the address on the user’s card (AVS).
- **Backend:** After payment is confirmed, the backend retrieves the PaymentIntent with `expand=payment_method` and reads `payment_method.billing_details.address` (state, country). That Stripe-validated address is preferred when saving `buyer_state` and `buyer_country` on the order; if Stripe has no address (e.g. card element without billing details), the request body state/country from the frontend is used as fallback.

## Optional later

- **Event location:** Some rules tax by event location; we have event address and could add event-based overrides.
- **Tax provider:** Replace the config map with TaxJar/Avalara/Stripe Tax for accuracy and local rates.
- **Zip/county** for more precise rates where needed.

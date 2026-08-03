# Pre-Launch: Test Scenarios (Web + Mobile) & Roadmap

This document aligns **test scenarios for Web and Mobile** before go-live and summarizes **what’s left to implement** from the roadmap. It references the **KanamEvents Ticketing Platform: US Market Design Document** for user stories, quality attributes, and differentiation.

---

## 1. Design Document Reference

The **KanamEvents Ticketing Platform: US Market Design Document** defines:

- **User groups:** Customer, Event Organizer, Administrator  
- **Quality attributes:** Performance (&lt;2s response, 10k concurrent users), availability, PCI DSS, scalability, US regulatory (1099-K, tax)  
- **Differentiation:** Early/instant payouts, community data ownership, white-label/customization, cultural taxonomy, diaspora impact  
- **MVP (Phase 0):** Event creation, ticket tiers, discovery, guest/account checkout, QR tickets, check-in app, data export, basic branding  
- **Iterations:** Risk & payout scaling → White-label & vertical expansion → Platform maturity & geo-expansion  
- **Backend requirements:** Risk scoring, payouts, KYC, notifications, 1099-K, refunds, API access, multi-currency, etc.

Implementation status and remaining work are tracked in `docs/MVP_ROADMAP.md`, `docs/TODO-identity-check-and-verification.md`, and `docs/MOBILE_FEATURE_PARITY.md`.

---

## 2. Pre-Launch Test Scenarios (Web + Mobile)

Test each scenario on **both Web and Mobile** unless marked (Web only) or (Mobile only). Use the same backend and data where possible.

---

### 2.1 Customer (Design Doc: “Customer” user stories)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| C1 | **Discover events** – List all events, filter by category/date/location | ✓ | ✓ | Home/Discover + Events list |
| C2 | **View event details** – Title, date, location, description, image, ticket types, add-ons (if Pro/Enterprise organizer) | ✓ | ✓ | Event detail page/screen |
| C3 | **Guest checkout** – Purchase tickets without creating an account; enter email + payment | ✓ | ✓ | Cart → Checkout as guest |
| C4 | **Account checkout** – Log in (or sign up), add to cart, complete checkout with saved/entered payment | ✓ | ✓ | Logged-in flow |
| C5 | **Multiple tickets** – Add multiple ticket types and quantities for one event; confirm in cart and order | ✓ | ✓ | Cart and order confirmation |
| C6 | **Multiple events** – Add tickets from different events to cart; checkout; confirm separate line items/orders | ✓ | ✓ | Multi-event cart |
| C7 | **Reserved seating (Pro/Enterprise events)** – Select seats from map, add to cart, confirm seat details on ticket | ✓ | (Web) | Mobile seat map optional |
| C8 | **Donations (Pro/Enterprise events)** – Optional donation at checkout; amount reflected in order total and confirmation | ✓ | ✓ | Event with donations enabled |
| C9 | **Add-ons / merchandise (Pro/Enterprise events)** – Add optional add-ons at checkout; total includes add-ons | ✓ | ✓ | Event with add-ons; Basic organizer events show no add-ons |
| C10 | **Order confirmation** – After payment: confirmation page/screen, email with QR ticket (if notifications enabled) | ✓ | ✓ | Order success + email |
| C11 | **Order history** – Logged-in user sees list of orders; can open order details | ✓ | ✓ | Profile → Order history |
| C12 | **Pricing page** – View tiers (Basic/Pro/Enterprise); upgrade CTA for non-Pro/non-Enterprise | ✓ | ✓ | Pricing screen with “Upgrade to Pro” on mobile |
| C13 | **Subscription return (Mobile)** – After Stripe subscription checkout, return to app via deep link; tier/role sync; navigate to Profile | — | ✓ | `eventpro://subscription/return`; sync + refresh user |

---

### 2.2 Event Organizer (Design Doc: “Event Organizer” user stories)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| O1 | **Create event** – Title, date/time, location, description, image; save as draft | ✓ | (Web) | Mobile: “Create event” opens web |
| O2 | **Edit event** – Update details; add/edit ticket tiers (Basic: up to 3; Pro/Enterprise: unlimited) | ✓ | ✓ | Event edit; tier gating on ticket count |
| O3 | **Publish event** – Change status draft → published; event appears on public list | ✓ | ✓ | Publish action |
| O4 | **Event templates & video** – Set event page template and promotional video URL; public page shows video | ✓ | (Web) | Theming + video embed |
| O5 | **Reserved seating** – Enable reserved seating (Pro/Enterprise), create seat map; public page shows “Select Seats” | ✓ | (Web) | Gated by tier |
| O6 | **Custom domain (Pro/Enterprise)** – Set custom domain on event; field stored and returned in API | ✓ | (Web) | DNS/routing separate |
| O7 | **Add-ons / enhancements (Pro/Enterprise)** – Create add-ons for event; Basic organizer sees “Enhancements (Pro)” / Pricing upsell | ✓ | ✓ | Event enhancements screen; gated |
| O8 | **Donations** – Enable donations for event; optional donation at checkout | ✓ | (Web) | Pro/Enterprise |
| O9 | **View ticket sales / attendees** – List attendees, ticket types sold; export CSV (all tiers) | ✓ | ✓ | Attendees list + export |
| O10 | **Email attendees (Pro/Enterprise)** – Send email to ticket holders from platform | ✓ | (Web) | Basic: no “Email attendees” |
| O11 | **Financial Hub** – View total revenue, available for payout, pending; platform fees line; Instant Payout button (if eligible) | ✓ | ✓ | Dashboard Financial Hub |
| O12 | **Request payout** – Click Instant Payout when eligible; request submitted (actual payout is placeholder until bank/KYC done) | ✓ | ✓ | Button disabled when payouts paused (e.g. W-9) |
| O13 | **1099-K / W-9** – W-9 submission and $600 threshold messaging; Tax Center / Document Vault (Enterprise: 1099-K download) | ✓ | ✓ | Tax Center; Enterprise gating for 1099-K |
| O14 | **Check-in** – Scan QR code at door; ticket marked checked-in; “Already checked in” handled | ✓ | ✓ | Check-in screen + QR scanner |
| O15 | **Organizer dashboard** – Summary, recent sales, AI insights, top cultural interests, draft/published events, stats | ✓ | ✓ | Dashboard |
| O16 | **Verification (KYC)** – Start Identity Check; submit entity type, address, (optional ID session); see PENDING then VERIFIED/REJECTED | ✓ | (Web) | Mobile: “Complete on web” / open web |
| O17 | **Rejection UX** – When REJECTED, see “Verification declined” and rejection reason (if provided); Resubmit opens flow again | ✓ | ✓ | Profile rejection card |
| O18 | **Profile by tier** – Basic: no team, no white-label; Pro: team, custom domain, no API; Enterprise: team, white-label, API keys | ✓ | ✓ | Profile and Organizer dashboard |
| O19 | **White-label (Enterprise)** – Set logo, primary color, hide “Powered by KanamEvents”; published event page reflects branding | ✓ | (Web) | Event page uses organizer branding |
| O20 | **Team (Pro/Enterprise)** – Invite by email (existing user), role Admin/Editor/Viewer; member sees owner’s events and can edit | ✓ | (Web) | Mobile: “Manage on web” |
| O21 | **API keys (Enterprise)** – Create/list/revoke API keys; call API with X-Api-Key | ✓ | (Web) | Mobile: “Manage on web” |

---

### 2.3 Administrator (Design Doc: “Administrator” user stories)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| A1 | **Admin access** – Only ADMIN role can access admin tab/section | ✓ | ✓ | Tab/screen visibility |
| A2 | **User management** – List users, update role (e.g. to ORGANIZER) | ✓ | ✓ | Admin users screen |
| A3 | **Verification pending** – List pending KYC submissions; approve or reject with optional reason | ✓ | ✓ | Admin verification screen |
| A4 | **Rejection reason** – Reject with reason; organizer sees reason on Profile (Web + Mobile) | ✓ | ✓ | Backend stores; frontend displays |
| A5 | **Events list** – View/manage events (if implemented) | ✓ | Planned | Admin events |
| A6 | **Event sales / revenue / subscription payments** – View reports (if implemented) | ✓ | Planned | Admin event-sales, revenue, subscription-payments |

---

### 2.4 Auth & Account (Cross-cutting)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| AUTH1 | **Login** – Email + password; JWT stored; redirect to home/main app | ✓ | ✓ | 401 clears session |
| AUTH2 | **Sign up** – Create account; success message; redirect to Verify or Login | ✓ | ✓ | Post-signup → Verify on mobile |
| AUTH3 | **Forgot password** – Submit email; “Check your email” (backend may be placeholder) | ✓ | ✓ | Forgot password screen |
| AUTH4 | **Verify email** – Screen/message “Check your email for verification link” | ✓ | ✓ | Verify screen (mobile); web /verify |
| AUTH5 | **Reset password** – Screen for new password (token from email when backend supports); placeholder OK | ✓ | ✓ | Reset password screen |
| AUTH6 | **Logout** – Sign out; token cleared; redirect to login/auth | ✓ | ✓ | Profile → Sign out |
| AUTH7 | **Profile edit** – Update name, email, etc.; save | ✓ | ✓ | Profile edit screen |
| AUTH8 | **Settings** – App/site settings (if any) | ✓ | ✓ | Settings screen |

---

### 2.5 Payments & Checkout (Cross-cutting)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| PAY1 | **Checkout totals** – Subtotal, tax (if enabled), fees, donation, add-ons; total matches order | ✓ | ✓ | GET checkout-totals / UI |
| PAY2 | **Stripe payment** – Complete payment with test card; order created; confirmation | ✓ | ✓ | Stripe test mode |
| PAY3 | **Guest checkout** – No account; email captured; order linked to guest | ✓ | ✓ | |
| PAY4 | **Failed payment** – Card declined or error; user sees error; no order created | ✓ | ✓ | |
| PAY5 | **Subscription checkout (Pro/Enterprise)** – Start upgrade from Pricing; Stripe Checkout; Web: return to /subscription/return; Mobile: return to app via deep link, sync tier | ✓ | ✓ | successUrl with from=app on mobile |

---

### 2.6 Tier Gating (Pricing Page as Source of Truth)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| T1 | **Basic organizer** – No add-ons, no email attendees, no reserved seating, no custom domain, no early/instant payout, no team, no white-label, no API | ✓ | ✓ | UI and API enforce |
| T2 | **Pro organizer** – Add-ons, donations, email attendees, reserved seating, custom domain, 50% early payout (by risk); no instant 100%, no API, no white-label | ✓ | ✓ | |
| T3 | **Enterprise organizer** – All Pro + 100% instant payout (by risk), API keys, white-label branding | ✓ | ✓ | |
| T4 | **Upgrade prompts** – Basic sees “Upgrade to Pro” / “Enhancements (Pro)” where applicable; Pro sees “Manage plan” | ✓ | ✓ | Pricing + in-app CTAs |

---

### 2.7 Performance & Security (Design Doc: Quality Attributes)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| PERF1 | **Response time** – Key pages/API responses under ~2s under normal load | ✓ | ✓ | Design doc: &lt;2s |
| PERF2 | **Heavy load** – (Optional) Load test; 10k concurrent users if required for launch | ✓ | ✓ | Design doc: 10k concurrent |
| SEC1 | **HTTPS / secure storage** – All traffic HTTPS; tokens in httpOnly cookie or SecureStore | ✓ | ✓ | PCI DSS alignment |
| SEC2 | **No sensitive data in client** – No raw card numbers in frontend; Stripe handles payment data | ✓ | ✓ | |
| SEC3 | **Role-based access** – USER cannot call organizer/admin APIs; ORGANIZER cannot call admin-only APIs | ✓ | ✓ | Backend auth |

---

### 2.8 Data & Compliance (Design Doc: US Regulatory)

| # | Scenario | Web | Mobile | Notes |
|---|----------|-----|--------|--------|
| D1 | **Attendee export (CSV)** – Organizer exports attendee data; file contains expected columns | ✓ | (Web) | Community data ownership |
| D2 | **W-9 / $600 threshold** – Messaging when W-9 required; payouts paused until W-9 submitted | ✓ | ✓ | Tax Center / dashboard |
| D3 | **1099-K (Enterprise)** – Document Vault lists/downloads 1099-K PDF; Basic/Pro see upgrade | ✓ | (Web) | Enterprise only |
| D4 | **Sales tax** – If tax enabled, checkout shows tax line; order stores tax amount | ✓ | ✓ | Config-based rate |

---

## 3. What’s Left to Implement (Roadmap)

Aligned with `docs/MVP_ROADMAP.md`, `docs/TODO-identity-check-and-verification.md`, and the **Design Document**.

### 3.1 Payouts & Identity (High – for real money and compliance)

| Item | Description | Doc ref |
|------|-------------|---------|
| **Bank account & real payouts** | Collect payout bank details (e.g. Stripe Connect); store securely; execute real payouts. Today “Request Payout” and `availableBalance` are placeholders. | MVP_ROADMAP, Design Doc § Backend Required |
| **ID verification** | Integrate Stripe Identity (or Persona); capture ID document; pass `idSessionId` in KYC submit; backend verifies session and drives VERIFIED/REJECTED. | TODO-identity §1 |
| **Risk/OFAC after KYC** | On KYC submit: run OFAC/watchlist check and ID verification result; set verification_status IN_PROGRESS → VERIFIED/REJECTED; optionally notify user. | TODO-identity §2 |
| **Rejection UX** | “Verification declined” and “Resubmit” are implemented; show backend **rejection reason** when provided (Web + Mobile). | TODO-identity §5 (partially done) |

### 3.2 Tax & Compliance

| Item | Description | Doc ref |
|------|-------------|---------|
| **Sales tax** | Jurisdiction-based rates and remittance (e.g. TaxJar/Avalara/Stripe Tax). Config-based default rate exists. | MVP_ROADMAP |
| **1099-K** | Document Vault and gating done; actual 1099-K generation/filing out of scope for MVP. | MVP_ROADMAP, Design Doc |

### 3.3 Product / Pricing Page Alignment

| Item | Description | Doc ref |
|------|-------------|---------|
| **Tiered payout execution** | Wire 50% early (Pro) and 100% instant (Enterprise) to real payout flow once bank and risk are in place. | MVP_ROADMAP, Design Doc |
| **Dynamic pricing** | Enterprise: automated tiered pricing (e.g. Early Bird expiry). | Pricing page, Design Doc Iteration 3 |
| **Multi-currency, SLA, on-premise** | Enterprise per pricing page; not yet implemented. | MVP_ROADMAP |
| **Automated marketing segments** | Pro/Enterprise: segment builder for attendees. | Pricing page, Design Doc AI |

### 3.4 Mobile Parity (Optional for launch)

| Item | Description | Doc ref |
|------|-------------|---------|
| **Event create/edit on mobile** | Full create/edit flow in app (or keep “open web” for now). | MOBILE_FEATURE_PARITY |
| **Admin: Events, Event sales, Revenue, Subscription payments** | Admin screens on mobile. | MOBILE_FEATURE_PARITY |
| **Partners screen** | Mobile equivalent of /partners. | MOBILE_FEATURE_PARITY |
| **Export / 1099-K on mobile** | “Export attendees” and “Download 1099-K” with share/save. | MOBILE_FEATURE_PARITY |

### 3.5 Design Document – Backend Required (Summary)

From the Design Document “Backend Required Features” section, still to implement or complete:

1. **Early/Instant payouts** – Real payment processing and tiered payout execution (depends on bank + risk).
2. **Organizer risk scoring** – Implemented for eligibility; refine with ML/fraud signals if needed.
3. **Non-traditional payments** – Mobile money, remittance (future).
4. **Cash/offline payments** – Community partner / cash-at-door (future).
5. **Custom domain mapping** – Field done; DNS/routing and serving events on custom domain (infra).
6. **Data export API** – CSV export exists; ensure CCPA/GDPR-compliant flow and consent logging.
7. **Notification service** – Event reminders, payment confirmations (SES/SNS).
8. **1099-K report generation** – IRS-compliant document generation (Enterprise).
9. **Refund/chargeback processing** – Payment reversal handling.
10. **Check-in anomaly detection** – ML for fraud at door (Design Doc AI).
11. **Multi-currency** – Regional payment/currency expansion.
12. **API access** – Implemented for Enterprise (create/list/revoke keys, X-Api-Key auth).

---

## 4. Suggested Test Execution Order

1. **Auth (Web + Mobile):** Login, sign up, forgot password, verify, reset password, logout.  
2. **Customer flows (Web + Mobile):** Discovery → event detail → guest checkout → order confirmation; then logged-in checkout and order history.  
3. **Organizer flows (Web + Mobile):** Create/edit/publish event, tickets, add-ons (Pro/Enterprise), dashboard, Financial Hub, check-in, Profile by tier.  
4. **Payments:** Checkout totals, Stripe test payment, subscription checkout and (on mobile) deep link return + sync.  
5. **Tier gating:** Basic vs Pro vs Enterprise organizer and customer-facing features.  
6. **Admin:** User management, verification pending, approve/reject with reason, confirm rejection on Profile.  
7. **Performance/security:** Smoke test under load; confirm HTTPS and no card data in client.

---

## 5. Document References

| Document | Purpose |
|----------|---------|
| **KanamEvents Ticketing Platform: US Market Design Document** | User stories, architecture, quality attributes, differentiation, MVP phases, iterations, backend requirements. |
| `docs/MVP_ROADMAP.md` | Pricing tier matrix, iteration status, what’s left (payouts, identity, tax, product). |
| `docs/TODO-identity-check-and-verification.md` | KYC/ID verification, risk/OFAC, bank account, rejection UX checklist. |
| `docs/MOBILE_FEATURE_PARITY.md` | Web route → mobile screen mapping and implementation status. |
| `docs/TESTING_CHECKLIST.md` | Focused checklist for team management, white-label, API keys, donations, custom domain. |

---

*Pre-launch test and roadmap doc. Update test results and roadmap status as you complete work.*

# KanamEvents MVP Roadmap

Implementation must align with **what each price tier promises on the Pricing page**. This doc ties the roadmap to those tiers and tracks status.

---

## Pricing tiers (source of truth)

These match `eventpro-frontend/src/pages/Pricing.tsx`. All implementation and gating must respect them.

| Feature / capability | Basic | Pro | Enterprise |
|----------------------|-------|-----|------------|
| **Ticketing** | | | |
| Event creation | ✅ | ✅ | ✅ |
| Multiple ticket tiers | Up to 3 | Unlimited | Unlimited |
| QR code tickets | ✅ | ✅ | ✅ |
| Guest checkout | ✅ | ✅ | ✅ |
| Reserved seating | ❌ | ✅ | ✅ |
| **Payouts** | | | |
| Standard payout (T+2 after event) | ✅ | ✅ | ✅ |
| 50% early payout | ❌ | ✅ | ✅ |
| 100% instant payout | ❌ | ❌ | ✅ |
| **Customization** | | | |
| Logo & basic colors / basic color theming | ✅ | ✅ | ✅ |
| Branded event pages | ✅ | ✅ | ✅ |
| Custom domain mapping | ❌ | ✅ | ✅ |
| Full HTML/CSS customization | ❌ | ✅ | ✅ |
| White-label (no KanamEvents branding) | ❌ | ❌ | ✅ |
| **Revenue tools** | | | |
| Merchandise & add-on sales | ❌ | ✅ | ✅ |
| Donations & fundraising / fundraising thermometers | ❌ | ✅ | ✅ |
| Dynamic pricing | ❌ | ❌ | ✅ |
| **Data & marketing** | | | |
| Attendee data export (CSV) | ✅ | ✅ | ✅ |
| Email ticket holders from platform | (see CRM) | ✅ | ✅ |
| Automated marketing segments | ❌ | ✅ | ✅ |
| **Support** | | | |
| Email support | ✅ | ✅ | ✅ |
| Priority email & chat support | ❌ | ✅ | ✅ |
| Dedicated account manager | ❌ | ❌ | ✅ |
| **Pro / Enterprise only** | | | |
| Advanced analytics dashboard | ❌ | ✅ | ✅ |
| API access for integrations | ❌ | ❌ | ✅ |
| 1099-K tax compliance reports | ❌ | ❌ | ✅ |
| SLA guarantee (99.9% uptime) | ❌ | ❌ | ✅ |
| On-premise hosting option | ❌ | ❌ | ✅ |
| Multi-currency support | ❌ | ❌ | ✅ |
| Custom feature development | ❌ | ❌ | ✅ |

**Implementation rule:** Any feature listed above must be **gated by plan** (Basic / Pro / Enterprise) in code and config. Do not ship a capability to a tier that doesn’t have it on the pricing page.

---

## Iteration 1: Automated Risk & Payout Scaling

**Goal:** Scale early payouts and improve event page quality, in line with pricing tiers.

| Focus area | Pricing-page alignment | Features to implement | Status |
|------------|------------------------|------------------------|--------|
| **Risk management** | Enables Pro (50% early) and Enterprise (100% instant) | Automated risk scoring: score organizers by history, ticket price, KYC. Risk level (LOW/MEDIUM/HIGH) stored on user; recalc via POST /organizer/risk-score/recalculate and on KYC submit. | 🟢 Risk scoring done |
| **Payout expansion** | Basic: T+2 only. Pro: 50% early. Enterprise: 100% instant. | Tiered payout eligibility in organizer summary: Basic = T+2 only; Pro = 50% early (LOW/MEDIUM risk); Enterprise = instant (LOW) or 50% early (MEDIUM). Shown on Profile. Actual payout execution still placeholder. | 🟢 Eligibility done |
| **Customization** | Basic: “Basic color theming”. Pro: “Full HTML/CSS” + custom domain. | **Basic (all tiers):** Pre-set event templates + promotional video/YouTube embed on event page. **Pro+:** Custom domain + full HTML/CSS (Iteration 2). | 🟢 Basic theming done (templates + video embed) |
| **Data utility** | Pro/Enterprise: “Email ticket holders” / marketing. | Basic Organizer CRM: organizers can email their ticket holders from the platform (Pro/Enterprise). Basic keeps export only. | 🟢 Email attendees done (Pro/Enterprise gated) |

### Iteration 1 – Implementation order (tier-aware)

1. **Basic theming (all tiers)**  
   - Pre-set event page templates (e.g. 2–3).  
   - Promotional video URL (e.g. YouTube) on event model + embed on event detail page.  
   - **Gating:** Available to all plans (Basic + Pro + Enterprise).

2. **Organizer CRM – email attendees (Pro + Enterprise)**  
   - “Email attendees” from organizer event/attendees view; send via platform (e.g. SendGrid/SES).  
   - **Gating:** Only for Pro and Enterprise; hide or disable for Basic.

3. **Risk scoring (backend for payouts)**  
   - Schema: organizer risk score + inputs (history, ticket price band, event type, KYC).  
   - Scoring job/API; store score (and optionally tier) on organizer/account.  
   - **Gating:** Drives who gets 50% vs 100% early payout; no UI tier purchase yet.

4. **Tiered early payouts**  
   - **Pro:** 50% early payout option (subject to risk).  
   - **Enterprise:** 100% instant payouts.  
   - **Basic:** Standard T+2 only.  
   - Wire payout flow to plan + risk score; enforce in backend.

---

## Iteration 2: White-Label & Vertical Expansion

**Goal:** Pro/Enterprise differentiation and revenue tools as on the pricing page.

| Focus area | Pricing-page alignment | Features to implement | Status |
|------------|------------------------|------------------------|--------|
| **White-label / Pro** | Pro: “Custom domain mapping”. Enterprise: “Full white-label branding”. | Custom domain field on event (Pro/Enterprise), stored and returned in API. | 🟢 Custom domain field done |
| **Vertical expansion** | Pro/Enterprise: “Merchandise & add-on sales”, “Donations & fundraising”. | Add-ons gated. Donations: event.donationsEnabled (Pro/Enterprise), optional amount at checkout, stored on order. | 🟢 Donations done |
| **Data integration** | Enterprise: “API access for integrations”. | API keys (create/list/revoke), X-Api-Key auth. **Gating:** Enterprise only. | 🟢 API keys done |

### Current implementation vs pricing

- **Merchandise & add-ons**  
  - **Done (MVP):** Event add-ons (merchandise, add-on, upgrade); organizer CRUD; checkout “Enhance Your Experience” from API.  
  - **Done:** **Gate by plan:** Only Pro and Enterprise organizers can create add-ons (OrganizerController + frontend); public GET `/api/v1/events/{id}/addons` returns empty for Basic-organizer events so checkout shows no add-ons; Basic organizers see “Enhance (Pro)” link to /pricing and no add-on management UI.  
  - **Done:** Donations: event.donationsEnabled (Pro/Enterprise), optional donation at checkout; order.donation_amount stored.

- **Custom domain**  
  - **Done:** Event.customDomain (Pro/Enterprise), create/update via organizer/event APIs; frontend form field (Pro/Enterprise only).

- **API access**  
  - **Done:** API keys table, create/list/revoke (Enterprise only); X-Api-Key header authenticates as that user.

- **Team management (Pro/Enterprise)**  
  - **Done:** `organizer_team_members` table; invite by email (user must exist), roles (ADMIN/EDITOR/VIEWER), list/remove/update role. Organizer dashboard returns events the user owns or is a team member of; all organizer event actions (edit, attendees, add-ons, etc.) allow access for team members.

- **Reserved seating (Pro/Enterprise)**  
  - **Done:** Event flag `reservedSeatingEnabled`; tickets can have `seat_section`, `seat_row`, `seat_number`. Organizer: enable "Reserved seating" on event (create/update), then create seat map via "Seat map" section on event edit (sections: name, row count, seats per row, price). Public event page: "Select Seats" tab shows real seat map when reserved seating is enabled and seat map exists; add-by-ticket-id to cart. **Flow:** Enable reserved seating → Save event → Create seat map → Event page shows seating and allows seat selection and add to cart.

- **Full white-label / custom branding (Enterprise only)**  
  - **Done:** User branding fields; Profile UI and backend updates gated to Enterprise. Event response includes organizer branding; public event page shows custom logo, primary color, and hides "Powered by KanamEvents" when set. Fields: `branding_logo_url`, `branding_primary_color`, `branding_hide_platform`, color, and “hide platform branding”. Event response includes organizer branding; public event page shows custom logo, applies primary color, and hides “Powered by KanamEvents” when set.

---

## Tier gating checklist (implementation)

Before release, ensure:

- [x] **Basic:** No custom domain, no add-ons, no fundraising, no early payouts, no “email attendees”, no reserved seating, no full HTML/CSS.
- [x] **Pro:** Add-ons + fundraising allowed; 50% early payout allowed; custom domain allowed; email attendees allowed; reserved seating allowed; no 100% instant payout, no API access, no white-label.
- [x] **Enterprise:** Everything in Pro + 100% instant payout, API access, white-label, and other Enterprise-only features from the pricing page.
- [x] **Risk scoring:** Used only to decide eligibility for 50% / 100% early payout within Pro/Enterprise; not a separate “tier” on the pricing page.

---

## Taxes (current scope)

- **1099-K tax compliance reports**  
  Per pricing page: **Enterprise only**. Document Vault (list + download 1099-K PDF) is gated to Enterprise; Basic/Pro see an upgrade prompt. W-9 submission and $600 threshold progress remain available to all tiers (needed for payout unlock).
- **Sales tax / VAT on ticket sales**  
  **Implemented (default off).** Default rate is 0% (`eventpro.tax.default-rate` / `EVENTPRO_TAX_DEFAULT_RATE`). When set to a value > 0, tax is calculated at checkout (GET `/payments/checkout-totals`), shown on checkout, and order total = subtotal + tax. Tax amount is stored on the order. Jurisdiction-based rates and remittance are not yet implemented.

---

## Summary: Where to focus

**Iteration 1 (tier-aligned):**

1. Basic theming (templates + video) for **all tiers**.  
2. Organizer CRM (email attendees) for **Pro + Enterprise** only.  
3. Risk scoring (backend) to support 50% / 100% payout automation.  
4. Tiered payouts: **Basic = T+2**, **Pro = 50% early option**, **Enterprise = 100% instant**.

**Iteration 2 (tier-aligned):**

1. **Gate add-ons and fundraising** to Pro + Enterprise; add donation/fundraising flow.  
2. **Custom domain** for Pro (and Enterprise).  
3. **API access (beta)** for Enterprise only.

Use this doc as the single source of truth; keep the **Status** column and checklist updated as work completes.

---

## What’s left to implement

**Payouts & identity**

- [x] **Bank account & real payouts:** Stripe Connect Express onboarding; Connect account ID on user; real payouts via Stripe Transfer when bank connected. (Previously: collect payout bank account (e.g. via Stripe Connect), store securely, and execute real payouts. Currently “Request Payout” is a placeholder; `availableBalance` / `pendingBalance` are computed from orders but no money is sent.
- **ID verification:** Integrate Stripe Identity or Persona for ID document capture; pass session/verification ID in KYC submission (backend already accepts `idSessionId` / `idProvider`); backend to verify session and drive VERIFIED/REJECTED.
- **Risk/OFAC:** When KYC is submitted, user is set to **IN_PROGRESS** (done). Still to do: run OFAC (or similar) check and ID verification result; automated path from IN_PROGRESS → VERIFIED/REJECTED; optionally notify user. Admin approve/reject continues to work.
- [x] **Rejection UX:** When verification_status is REJECTED, show “Verification declined” and “Resubmit” on Profile (web + mobile); display rejection reason when provided. Web: Identity Check modal for resubmit; mobile: Resubmit on web with reason.

**On hold (implementation in place, not enabled until config ready)**  
Bank account & Connect payouts, ID verification (Stripe Identity/Persona), and OFAC/risk checks are implemented in code but on hold. Enable when Stripe secret key and Connect are configured; ID verification and real OFAC can be wired when those products are ready.

**Tax & compliance**

- **Sales tax:** Jurisdiction-based rates and remittance are not fully automated (config-based state rates exist; optional: TaxJar/Avalara/Stripe Tax).
- **1099-K:** Document Vault and gating are done; actual 1099-K generation/filing is out of scope for MVP.

**Product / pricing**

- [x] **Tiered payouts execution:** Payout request creates real Stripe Transfer to Connect account when bank is connected; eligibility (50% early / 100% instant) remains gated by tier and risk; actual transfer amount uses requested amount up to available balance.
- **Dynamic pricing, multi-currency, SLA, on-premise:** Per pricing page, these are Enterprise; not yet implemented.

**Event page & organizer**

- [x] **Organizer on event:** Show organizer (name, avatar, link) on event detail (web + mobile).
- [x] **Other events by organizer:** “More from this organizer” / “Other events” by same organizer (web + mobile).
- [x] **Contact organizer:** “Contact organizer” (email or in-app) from event page.
- [x] **Follow organizers:** Follow/unfollow; “Following” list; optionally “Events from organizers you follow”.

**Event media**

- [x] **Multiple event images:** Multiple images per event (gallery/carousel); backend + web + mobile.
- [x] **Promotional video on mobile:** Render `promotionalVideoUrl` (e.g. YouTube) in mobile EventDetailScreen (web already has embed).

---

See also: `docs/TODO-identity-check-and-verification.md` for the full KYC checklist.

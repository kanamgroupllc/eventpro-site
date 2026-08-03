# EventPro — design brief for Stitch (web & mobile)

This document inventories **implemented features and UI surfaces** so tools like **Stitch** (or any designer) can wireframe and redesign **web** (`eventpro-frontend`) and **mobile** (`eventpro-mobile`) against real product scope. The stack shares one backend API.

**Related docs:** [`MVP_ROADMAP.md`](./MVP_ROADMAP.md), [`TODO-identity-check-and-verification.md`](./TODO-identity-check-and-verification.md).

---

## Table of contents

1. [Product overview](#1-product-overview)
2. [Discovery & events (attendee)](#2-discovery--events-attendee)
3. [Cart & checkout](#3-cart--checkout)
4. [Orders & tickets](#4-orders--tickets)
5. [Account, profile & settings](#5-account-profile--settings)
6. [Organizer dashboard & tools](#6-organizer-dashboard--tools)
7. [Check-in (organizer)](#7-check-in-organizer)
8. [Admin](#8-admin)
9. [Marketing / static pages (web)](#9-marketing--static-pages-web)
10. [Tier gating](#10-tier-gating)
11. [Design system hints](#11-design-system-hints)
12. [Web vs mobile parity](#12-web-vs-mobile-parity)

---

## 1. Product overview

**What it is:** Event discovery, ticketing, and checkout for attendees; organizer dashboard for events, tickets, payouts, and compliance; admin console for platform operations. **Same backend** for web (Vite + React) and mobile (Expo + React Native).

### User types

- **Guest** — browse, cart, checkout (Stripe); guest checkout where supported.
- **Authenticated user** — profile, orders, notifications, follow organizers, settings.
- **Organizer** (`ORGANIZER` or `ADMIN`) — attendee capabilities plus organizer tools. **Subscription tiers** gate features: **Basic / Pro / Enterprise** (aligned with the public Pricing page).
- **Admin** — platform stats, users, verification queue, events, revenue, subscription payment recording.

### Global UX — web

- Sticky **navigation**: Home, Events; when logged in: **My Orders**, **Following**, **Profile**.
- **Language** switcher, **theme** (light / dark / system), **cart**, **notifications**, **Sign up** or **avatar menu** (Profile, Settings, Admin / Organizer if applicable, Log out).
- **Footer** on marketing-style layouts.
- **Page transitions** (Framer Motion) between routes.
- **Toasts** (Sonner + shadcn toaster).

### Global UX — mobile

- **Bottom tabs:** **Home** (discover stack), **Profile** (profile stack); **Organizer** tab if user is organizer or admin; **Admin** tab if admin.
- **Auth stack** (login, sign-up, forgot password, verify, reset password) — not forced on launch; users can browse first.
- **Theme** context, **cart**, **recently viewed**, **notification preferences** (syncs `pushEnabled` with API as in-app preference).
- **Deep link:** `eventpro://subscription/return` after Stripe Checkout to sync subscription and show confirmation.

---

## 2. Discovery & events (attendee)

**Implemented**

- **Event list** with pagination, **keyword search**, optional filter by **organizer** (“more from this organizer”).
- **Category filter** (e.g. web home; API supports events by category).
- **Event detail:** title, description, date/time, location/address, hero + **image gallery**, **promotional video** (e.g. YouTube) on web and mobile.
- **Organizer block:** name, avatar, link; **follow / unfollow**; **contact organizer** (message + sender email).
- **“More from this organizer”** → filtered event list.
- **Share** actions (web).
- **Recently viewed** events (web + mobile).
- **Reserved seating (Pro/Enterprise):** when enabled, **seat map** on public event / checkout path; seats with section, row, number tied to inventory.

**Web-only / richer**

- **Home** landing: hero, animated stats, trending/upcoming events, category chips, CTAs.

**Mobile**

- Flow: Home → Events list → Event detail → Checkout; list title varies (e.g. “More from this organizer”).

---

## 3. Cart & checkout

**Implemented**

- **Server-backed cart:** add, update quantity, remove, clear.
- **Add-ons** (“Enhance your experience”) from public API — **no add-ons for events owned by Basic-tier organizers** (backend returns empty).
- **Donations** at checkout when the event has fundraising enabled (Pro/Enterprise).
- **Checkout totals** API: subtotal, tax rate, tax, total; optional **state/country** for tax parameters.
- **Stripe:** publishable key from API; **PaymentIntent**; **confirm** for logged-in user from cart; **guest reserve** + **guest confirm** with guest contact/payment payload.
- **Reservation countdown** when guest reservation is active.
- **Guest checkout** UI (multiple form layouts on web).
- Post-purchase **success / ticket reveal** style experiences (web components).

**Mobile**

- Full checkout screen; some error paths offer opening the **website** checkout.

---

## 4. Orders & tickets

**Implemented**

- **Order history** and **order detail** (tickets, QR-oriented presentation) on web and mobile.
- **Organizer check-in** uses ticket identifiers (see [§7](#7-check-in-organizer)).

---

## 5. Account, profile & settings

**Implemented**

- **Sign up, login, logout**; **email verification**; **forgot / reset password**.
- **Profile:** avatar, name, email; **profile picture upload**; navigation to edit profile, settings, orders, following, pricing.
- **Profile edit** screen/page.
- **Following:** followed organizers; unfollow.
- **Settings (web):** shortcuts to edit profile, order history, pricing; **in-app notifications** toggle (API `pushEnabled`); appearance; clear recently viewed; help/privacy links; sign out; optional account danger zone.
- **Settings (mobile):** overlapping settings; some flows **open the web app** for full parity.
- **Notifications:** paginated list, **mark as read**.
- **Pricing:** tier comparison, **Stripe Checkout** for Pro/Enterprise; **return URL** syncs subscription tier and organizer role (web route `/subscription/return`).
- **Subscription sync** API after checkout (web query param + mobile deep link).

### Organizer-specific on profile (web)

- **Organizer summary:** events hosted, tickets sold, revenue, balances, **payout eligibility** (standard T+2, 50% early, 100% instant) with explanatory labels.
- **Identity / KYC:** status; **Identity Check** modal (multi-step: entity, address, optional verification session placeholder); **resubmit** when **REJECTED** + **rejection reason** display.
- **Recalculate risk score** (organizer).
- **Enterprise — API keys:** create (secret shown once), list, revoke.
- **Pro/Enterprise — Team:** list, invite by email + role (ADMIN / EDITOR / VIEWER), change role, remove.
- **Enterprise — white-label:** logo URL, primary color, hide “Powered by” on public event pages.
- **W-9** and **tax / 1099** related UI (vault and gating per product rules — see MVP roadmap).

---

## 6. Organizer dashboard & tools

### Web (`/organizer`)

- **Draft vs published** events; **publish** action.
- Per-event: **edit**, **tickets**, **enhancements** (add-ons), **check-in**, **email attendees** (Pro/Enterprise, modal with subject/body).
- **Insights:** narrative insight, **event pulses** (e.g. trending / slowing), audience interests.
- **Live ticket feed** (recent sales).
- **Financial hub:** balances, **payout request**, **Stripe Connect** connection status, **Connect onboarding** (redirect flow), eligibility messaging.
- **Tax center** (W-9, tax forms list, downloads where implemented).
- **Export center:** CSV exports (attendees, check-in, marketing emails, financial summary).

### Web — event authoring

- **Create / edit event** (primary: `EventFormNew`): schedule, location, category, **page template**, **custom domain** (Pro+), **donations** toggle, **reserved seating** toggle, **promotional video** URL, **gallery** images, hero image, etc.
- **Tickets:** CRUD for ticket types (price, capacity, etc.); integrates with **reserved seating** when enabled.
- **Enhancements:** add-on CRUD (Pro/Enterprise): name, description, price, category, image, sizes, display order, featured flag.
- **Seat map builder:** sections, rows, seats per row, pricing — organizer-only APIs.

### Mobile — organizer tab

- **Dashboard:** event list, publish, summary metrics, recent sales, insights; **request payout** (lighter than web Financial Hub).
- **Event detail:** links to **tickets**, **enhancements**, **check-in**; **edit event** opens **browser** at `…/organizer/events/:id/edit`.
- **New event** opens **browser** at `…/organizer/events/new`.
- Treat mobile organizer as **operations companion**; **authoring and seat maps stay on web**.

---

## 7. Check-in (organizer)

**Implemented**

- **Web:** dedicated check-in route.
- **Mobile:** check-in screen + **QR scanner**; API checks in by ticket id and returns result payload for display.

---

## 8. Admin

### Web (`/admin/*`)

Nested routes under a dedicated admin layout:

- **Overview / dashboard** — aggregate stats (users, events, tickets sold, revenue, growth).
- **Users** — pagination, **create admin user**, **role** and **status** updates.
- **Verification** — pending KYC list, **approve** / **reject** (optional reason).
- **Events** — pagination, **status** updates.
- **Event sales** — per-event sales summary.
- **Revenue** — time-series style data with period parameter.
- **Subscription payments** — manual payment record entry.

### Mobile

- Same areas as separate screens in an **Admin** stack (compact layouts, same APIs).

---

## 9. Marketing / static pages (web)

- **Partners, Contact, Help, Privacy**
- **Not found** page

---

## 10. Tier gating

Wireframes should respect plan differences (see Pricing page in app):

- **Basic:** no organizer add-ons on public events from Basic organizers, no email-attendees, no custom domain, no reserved seating configuration, payout messaging focused on standard schedule; etc.
- **Pro:** add-ons, donations, custom domain, reserved seating, email attendees, 50% early payout *eligibility* (with risk rules).
- **Enterprise:** API keys, white-label branding, 100% instant *eligibility* (with risk), extended tax/document experiences as documented in MVP roadmap.

**Risk level** (LOW / MEDIUM / HIGH) affects **which payout options appear**, not the public pricing tier names.

---

## 11. Design system hints

**Web**

- **shadcn/ui** + **Tailwind**; CSS variable theming; **Framer Motion** for transitions.
- Notable composite components: `FinancialHub`, `IdentityCheckModal`, `CartMenu`, `NotificationCenter`, `SeatingMap`, `EmailAttendeesDialog`, `TaxCenter`, `ExportCenter`, etc. (under `eventpro-frontend/src/components/`).

**Mobile**

- **React Navigation** (stacks + tabs); **Ionicons**; shared API client in `@eventpro/shared`; theme via app theme context.

---

## 12. Web vs mobile parity

| Area | Web | Mobile |
|------|-----|--------|
| Browse / search / event detail | Full | Full |
| Cart / checkout | Full | Full (with fallback to web in edge cases) |
| Orders / order detail | Full | Full |
| Profile, notifications, following, pricing | Full | Full (some actions open browser) |
| Identity check, W-9, tax vault, API keys, team, branding | Full | Mostly **web** via external links |
| Organizer dashboard / publish / payouts / insights / exports | Full | **Light** (no full export/financial parity on device) |
| Create/edit event, seat map | Full | **Web only** (deep link) |
| Check-in + QR | Full | Full |
| Admin | Full | Full (compact) |

---

## Suggested prompts for Stitch

When generating screens, anchor on **primary journeys**:

1. **Guest:** land → event detail → cart → guest checkout → confirmation.
2. **Attendee:** login → follow organizer → checkout with tax fields → orders.
3. **Organizer:** subscription upgrade → create event → tickets → publish → dashboard / payouts / Connect onboarding.
4. **Organizer ops:** check-in list + QR; email attendees (Pro+).
5. **Admin:** verification queue approve/reject; user role changes.

---

*This file is derived from the current codebase layout and API surface; update it when major features ship.*

# EventPro — QA E2E usage guide (web only, MVP)

**Audience:** QA engineers doing end-to-end testing in the browser.  
**Scope:** [eventpro-frontend](../eventpro-frontend) (Vite + React) and the Spring Boot API it calls. **Mobile app (`eventpro-mobile`) is out of scope** for this MVP deployment guide.

**Related docs:** [PRE_LAUNCH_TEST_AND_ROADMAP.md](./PRE_LAUNCH_TEST_AND_ROADMAP.md) (full scenario matrix), [VARIABLES.md](./VARIABLES.md) (environment), [CREATE_FIRST_ADMIN.md](./CREATE_FIRST_ADMIN.md) (first admin). For **raw HTTP request bodies and call order** (curl/Postman), see [API_REQUEST_FLOWS.md](./API_REQUEST_FLOWS.md).

---

## MVP scope

| In scope | Out of scope |
|----------|----------------|
| All flows in `eventpro-frontend` via URLs below | `eventpro-mobile` screens, deep links, app store builds |
| API behavior observable from the browser (Network tab) + optional Swagger | PRE_LAUNCH rows marked **Mobile only** (see §6) |

---

## Architecture and roles (for QA context)

- **Frontend:** SPA — React Router. Route table: [eventpro-frontend/src/App.tsx](../eventpro-frontend/src/App.tsx).
- **API:** Default `http://localhost:8080`. Base URL env: `VITE_API_BASE_URL` ([eventpro-frontend/AGENTS.md](../eventpro-frontend/AGENTS.md)).
- **Platform roles** (JWT claims → Spring `ROLE_*`): `ADMIN`, `ORGANIZER`, `USER` — see [packages/eventpro-shared/src/types.ts](../packages/eventpro-shared/src/types.ts).
- **Signup** allows **USER** or **ORGANIZER** only (not ADMIN). Admin is created via seed, DB promotion, or **Admin → User Management → Create admin user** ([CREATE_FIRST_ADMIN.md](./CREATE_FIRST_ADMIN.md)).

**Important distinction**

- **Platform role:** `ADMIN` / `ORGANIZER` / `USER` (who you are on the product).
- **Organizer team role:** `ADMIN` / `EDITOR` / `VIEWER` (staff under one organizer). Not the same as platform `ADMIN`.

**Route guards**

- [ProtectedRoute.tsx](../eventpro-frontend/src/components/ProtectedRoute.tsx): not logged in → `/login` (with `state.from`). Logged in but wrong platform role for that route → **`/`** (home), not login.
- [AdminLayout.tsx](../eventpro-frontend/src/components/AdminLayout.tsx): requires platform **ADMIN**.
- Organizer routes use `allowedRoles={["ORGANIZER", "ADMIN"]}` so a platform **ADMIN** can open organizer tools without being platform **ORGANIZER**.

**Admin using organizer UI**

- A platform **ADMIN** can use `/organizer/*`. Organizer-only **Profile** sections may still key off `hasRole("ORGANIZER")` — for KYC/branding E2E, prefer a real **ORGANIZER** account; use ADMIN only for access smoke checks.

**Post-signup and “verify email”**

- After successful signup, the app navigates to **`/login`**, not `/verify` ([SignUp.tsx](../eventpro-frontend/src/pages/SignUp.tsx)).
- `/verify` is a static “check your inbox” page.
- Login issues a JWT without an email-verified gate in the reviewed auth path — treat inbox verification as **UX unless your environment proves otherwise**.

**Cart and session**

- **Guest cart:** `localStorage` keys `eventpro_cart` and `eventpro_cart_saved_at`; cart **expires after 24 hours** ([CartContext.tsx](../eventpro-frontend/src/contexts/CartContext.tsx)).
- **After login:** local guest items are sent to the **server cart**, then local keys are removed (merge behavior).
- **JWT:** TTL from `JWT_ACCESS_TTL_SECONDS` ([VARIABLES.md](./VARIABLES.md)). When the token expires, expect re-login; confirm actual UX (no silent refresh assumed).

**API debugging**

- Swagger: `http://localhost:8080/swagger-ui/index.html` ([backend/services/AGENTS.md](../backend/services/AGENTS.md)). Use for 401/403 checks (e.g. USER token on admin endpoints).

---

## 1. Environment and test data

### 1.1 Prerequisites

| Item | Notes |
|------|--------|
| Database | PostgreSQL with **Flyway migrations applied** (fresh vs upgraded schema). |
| API | Running and reachable at the URL configured in `VITE_API_BASE_URL`. |
| Web | `npm run dev` in `eventpro-frontend` (default **5173**) or deployed staging URL. |
| Stripe | Test mode: `VITE_STRIPE_PUBLISHABLE_KEY` + backend Stripe vars per [VARIABLES.md](./VARIABLES.md). Use test card **4242 4242 4242 4242** (any future expiry, any CVC) for success paths. |
| S3 / images | Optional for local: LocalStack or real bucket per VARIABLES; without it, image upload may fail — use events without upload or fix env. |
| Subscriptions | Pro/Enterprise checkout needs Stripe **Products/Prices** configured; see VARIABLES — otherwise upgrade flows error. |

Label runs **Local** vs **Staging** when behavior differs (email delivery, webhooks, S3).

**Product note:** Some flows (password reset email, full payout automation) may still be partial — see [PRE_LAUNCH_TEST_AND_ROADMAP.md](./PRE_LAUNCH_TEST_AND_ROADMAP.md) §3. Log gaps without blocking unrelated cases.

### 1.2 Suggested test personas (copy-paste)

Use distinct emails per environment. Password must satisfy signup: **≥8 characters**, at least **one lowercase**, **one uppercase**, **one digit** ([SignUp.tsx](../eventpro-frontend/src/pages/SignUp.tsx)).

| Persona | Suggested email | Password | How to create |
|---------|-----------------|----------|----------------|
| **Platform admin** | `admin@eventpro.local` | `password` | Flyway seed when no admin exists ([V28__seed_first_admin.sql](../backend/services/modules/eventpro-api/src/main/resources/db/migration/V28__seed_first_admin.sql)) |
| **Organizer (Basic)** | `qa.organizer.basic@example.com` | `TestPass1a` | `/signup` → role **ORGANIZER** |
| **Organizer (Pro/Ent)** | `qa.organizer.pro@example.com` | `TestPass1b` | Same, then upgrade via `/pricing` → Stripe **or** DB/admin tier (see [UserServiceImpl](../backend/services/modules/eventpro-core/src/main/java/com/accessplus/eventpro/core/user/service/impl/UserServiceImpl.java) tier + role rules) |
| **Registered attendee** | `qa.attendee@example.com` | `TestPass1c` | `/signup` → role **USER** |
| **Guest** | N/A | N/A | No account; use checkout guest path |

After the first admin exists, additional admins: **Admin → Users → Create admin user** ([CREATE_FIRST_ADMIN.md](./CREATE_FIRST_ADMIN.md)).

### 1.3 Event categories (must match DB seed)

Pick **exactly** one of these **names** when creating events (see [V2__seed_categories.sql](../backend/services/modules/eventpro-api/src/main/resources/db/migration/V2__seed_categories.sql)):

- Music  
- Sports  
- Arts & Crafts  
- Fashion & Beauty  
- Health & Fitness  
- School Program  

### 1.4 Sample event / ticket data (for scripted tests)

| Field | Example value |
|--------|----------------|
| Event name | `QA E2E Concert 2026` |
| Description | `Automated test event — safe to delete` |
| Category | `Music` |
| City | `Austin` |
| Country | `United States` (or value required by UI) |
| Start / end | Future dates; **end after start** |
| Ticket type name | `General Admission` |
| Ticket price | `25.00` (or minimum allowed) |

---

## 2. USER flows (guest + registered)

### 2.1 Public routes (no login)

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/pricing` | Plans (Basic / Pro / Enterprise) |
| `/partners`, `/contact`, `/help`, `/privacy` | Marketing / legal |
| `/events` | Event list |
| `/events/:id` | Event detail, add to cart |
| `/signup`, `/login`, `/verify`, `/forgot-password`, `/reset-password` | Auth |
| `/checkout` | Checkout (guest or logged-in) |

### 2.2 Authenticated routes (any platform role)

| Path | Purpose |
|------|---------|
| `/profile` | Profile |
| `/profile/edit` | Edit profile |
| `/profile/following` | Following |
| `/settings` | Settings |
| `/orders` | Order history |
| `/notifications` | Notifications |
| `/subscription/return` | Post–Stripe subscription return |
| `/enterprise/subscription` | Enterprise subscription (legacy `/subscription/enterprise` redirects here) |

### 2.3 Guest checkout (E2E)

1. Open `/` or `/events` **without** logging in.  
2. Open a **published** event (`/events/{id}`).  
3. Select ticket type and quantity; add to cart (max **4 per line item** — `MAX_TICKETS_PER_LINE` in [Checkout.tsx](../eventpro-frontend/src/pages/Checkout.tsx)).  
4. Open `/checkout`.  
5. Choose **Continue as guest** (or equivalent); enter **first name, last name, email** (and **phone** if required).  
6. Complete review → pay with Stripe test card.  
7. **Expect:** success UI; guest email receives communication per env config.

**Boundaries**

- **Empty cart:** `/checkout` shows empty state (“Your cart is empty”).  
- **Zero total:** Payment should not start; UI shows error such as “Order total must be greater than 0”.  
- **Declined card:** Use Stripe test decline numbers — expect error, **no** completed order (PAY4).

### 2.4 Registered user checkout (E2E)

1. Log in as **USER**.  
2. Add tickets; open `/checkout`.  
3. No guest identity step; proceed to payment.  
4. **Expect:** order visible under **`/orders`**.

### 2.5 Cart merge (E2E)

1. As guest, add items (stored locally).  
2. Log in from checkout or navbar.  
3. **Expect:** items appear in server-backed cart; localStorage guest keys cleared after sync ([CartContext.tsx](../eventpro-frontend/src/contexts/CartContext.tsx)).

### 2.6 Short scenarios — profile / social / subscription

- **Following:** `/profile/following` — follow/unfollow if event organizer supports it from UI.  
- **Notifications:** `/notifications` — open list after actions that generate notifications (if any in env).  
- **Subscription upgrade (web):** `/pricing` → start checkout → return via **`/subscription/return`** when Stripe success URL is configured (aligns with PAY5 on web).

### 2.7 Forgot / reset password

Exercise `/forgot-password` and `/reset-password`. Document **actual** behavior (email received vs message only). PRE_LAUNCH notes backend may be placeholder — file defects without blocking checkout smoke.

---

## 3. ORGANIZER flows

**Entry:** `/organizer` ([Organizer.tsx](../eventpro-frontend/src/pages/Organizer.tsx)).

### 3.1 Organizer URL ladder

All require login as **ORGANIZER** or **ADMIN** (platform).

| Path | Purpose |
|------|---------|
| `/organizer` | Dashboard; drafts / published; publish action |
| `/organizer/events/new` | Create event ([EventFormNew.tsx](../eventpro-frontend/src/pages/EventFormNew.tsx)) |
| `/organizer/events/:id/edit` | Edit event |
| `/organizer/events/:id/tickets` | Ticket types |
| `/organizer/events/:id/seat-map` | Seat map (Pro/Enterprise gating) |
| `/organizer/events/:id/enhancements` | Add-ons / enhancements (tier-gated) |
| `/organizer/team` | Team members (Pro/Enterprise) |
| `/organizer/branding` | White-label / branding |
| `/organizer/api-keys` | Organizer API keys (Enterprise) |
| `/organizer/financials` | Financial hub |
| `/organizer/check-in` | Check-in / scanner |

### 3.2 Recommended organizer E2E (golden path)

1. Log in as **ORGANIZER** (not platform ADMIN for full KYC/profile parity).  
2. **`/organizer/events/new`** — fill required fields; use seeded **category**; optional image if S3 works. Save **draft**.  
3. **`/organizer/events/{id}/tickets`** — create at least one paid ticket type.  
4. **`/organizer`** — **Publish** event.  
5. In a **second browser profile** (incognito): open **`/events/{id}`** as **guest** and as **registered USER**; purchase ticket(s).  
6. Organizer: **`/organizer/check-in`** — verify check-in behavior; **`/organizer/financials`** — revenue visible per rules.  
7. **Pro/Enterprise only:** enhancements, donations, reserved seating, email attendees, team invite — see [Pricing.tsx](../eventpro-frontend/src/pages/Pricing.tsx) and PRE_LAUNCH §2.6.

### 3.3 Organizer verification (KYC) + admin loop

- Organizer submits verification from profile/organizer UI (web).  
- **INDIVIDUAL:** SSN **last 4** required. **BUSINESS:** **EIN** required ([VerificationServiceImpl.java](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/service/impl/VerificationServiceImpl.java)).  
- **Admin:** `/admin/verification` → open detail → approve or **reject with reason**.  
- **Organizer:** sees status and rejection reason when applicable.

### 3.4 Team management

- **`/organizer/team`** — invite by email; invitee must be an **existing user**. Roles: team **ADMIN**, **EDITOR**, **VIEWER** (not platform roles).  
- **Negative:** invite unknown email — expect validation/error.

---

## 4. ADMIN flows

**Shell:** `/admin` → redirect to **`/admin/overview`**. Sidebar: [AdminLayout.tsx](../eventpro-frontend/src/components/AdminLayout.tsx).

### 4.1 Admin routes

| Path | In sidebar? | Purpose |
|------|-------------|---------|
| `/admin/overview` | Yes | Dashboard |
| `/admin/users` | Yes | Users; **Create admin user** |
| `/admin/roles-permissions` | Yes | Roles & permissions |
| `/admin/verification` | Yes | KYC queue |
| `/admin/verification/:id` | (from list) | KYC detail |
| `/admin/events` | Yes | Admin events |
| `/admin/revenue` | Yes | Revenue |
| `/admin/api-keys` | Yes | Platform API keys |
| `/admin/audit-logs` | Yes | Audit logs |
| `/admin/event-reviewer-permissions` | Yes | Reviewer roles |
| `/admin/system-health` | Yes | System health |
| `/admin/hub` | **No** — type URL | Hub ([Admin.tsx](../eventpro-frontend/src/pages/Admin.tsx)) |
| `/admin/event-sales` | **No** / via hub | Event sales |
| `/admin/subscription-payments` | **No** / via hub | Subscription payments |

### 4.2 Recommended admin E2E

1. Log in as **`admin@eventpro.local`** (or created admin).  
2. **`/admin/users`** — list loads; optionally change user role to **ORGANIZER**.  
3. **`/admin/verification`** — process one pending KYC; reject with reason and confirm organizer sees it.  
4. **`/admin/hub`** — navigate to event-sales / subscription links.  
5. Spot-check **`/admin/revenue`**, **`/admin/audit-logs`**, **`/admin/events`**.  
6. **Negative (UI):** log in as **USER** → open **`/admin`** → redirect to **`/`**.  
7. **Negative (API):** Swagger with USER JWT → admin-only endpoint → **403**.

---

## 5. Cross-cutting (all personas)

### 5.1 P0 smoke (~15–30 min)

| Step | Action | Pass hint |
|------|--------|-----------|
| 1 | Guest: home → event → add ticket → `/checkout` → guest pay | Success screen |
| 2 | Organizer: login → new event → ticket → publish | Event on `/events` |
| 3 | Admin: login → `/admin/users` | Table loads |
| 4 | USER: visit `/admin` | Redirect to `/` |

### 5.2 Empty and error states

- Cart empty on `/checkout`.  
- Invalid event ID `/events/00000000-0000-0000-0000-000000000000` (or bad UUID) — 404 or error UI.  
- Sold-out / inventory errors — per API response.

### 5.3 Defect reporting

Record: **URL**, **persona/role**, **time**, **browser**, failing **API** status/body from Network tab or Swagger. Optional HAR for checkout.

### 5.4 Data hygiene

- Use `qa.*@` or `+` aliases for parallel runs.  
- Clear guest cart: DevTools → Application → Local Storage → remove `eventpro_cart` and `eventpro_cart_saved_at`.  
- Decide per suite: **disposable** events vs **shared golden** event IDs.

---

## 6. Traceability (PRE_LAUNCH)

Map major flows to [PRE_LAUNCH_TEST_AND_ROADMAP.md](./PRE_LAUNCH_TEST_AND_ROADMAP.md). **MVP web:** **Execute** in browser, or **N/A** if the row is mobile-only / not applicable.

| Area | PRE_LAUNCH IDs | MVP web | Pass criteria (examples) |
|------|----------------|---------|----------------------------|
| Customer discovery | C1, C2 | Execute | List loads; detail shows tickets |
| Checkout guest / account | C3, C4, C5, C6 | Execute | Order completes; history for user |
| Reserved seating | C7 | Execute | Seat map purchase on web |
| Donations / add-ons | C8, C9 | Execute (tier-dependent) | Line items and totals correct |
| Confirmation | C10 | Execute | Success UI (+ email if configured) |
| Orders / pricing | C11, C12 | Execute | `/orders`; `/pricing` renders |
| Subscription return (app deep link) | C13 | **N/A** | Mobile deep link — not MVP web |
| Web subscription return | PAY5 (§2.5) | Execute | `/subscription/return` after Stripe |
| Organizer create/edit/publish | O1–O5, O8 | Execute | Draft → published on discover |
| Enhancements / financials / check-in | O7, O9–O12, O14–O15 | Execute | Per tier |
| KYC | O16–O17 | Execute | Admin ↔ organizer status |
| Tier / team / API / white-label | O18–O21 | Execute (tier-dependent) | Gating matches tier |
| Admin | A1–A6 | Execute | RBAC + lists |
| Auth | AUTH1–AUTH8 | Execute | Login, signup→login, logout |
| Payments | PAY1–PAY4 | Execute | Totals, success, decline, guest |
| Tier gating | T1–T4 | Execute | Basic vs Pro vs Enterprise |
| Security | SEC1–SEC3 | Execute | HTTPS prod; no card data in app; role checks |
| Compliance / data | D1–D4 | Execute (tier/env) | CSV export, tax line if enabled |

---

## 7. QA process

### 7.1 Test case template

| Field | Description |
|-------|-------------|
| ID | Unique case id |
| Persona | Guest / USER / ORGANIZER / ADMIN |
| Preconditions | Accounts, data, env |
| Steps | Numbered UI steps |
| Expected result | Observable outcome |
| Priority | P0 smoke / P1+ |
| Linked PRE_LAUNCH | e.g. C3, PAY2 |
| MVP web | Execute / N/A |

### 7.2 Browsers

Define minimums for **staging** (e.g. latest Chrome + Safari, or Edge). Run smoke on all minimums before release.

### 7.3 Release gate

- **P0 smoke** must pass.  
- **SEC3** (role-based API access) and **PAY2** (successful Stripe test payment) failures are **release blockers** unless explicitly waived by product.

---

*Document generated from the EventPro QA E2E plan. Routes and behavior reflect the codebase at time of writing; re-verify after major refactors.*

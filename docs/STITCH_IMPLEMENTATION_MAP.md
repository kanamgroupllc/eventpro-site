# Stitch designs → codebase map

Use this when aligning **Stitch exports** (`docs/stitch_event_details/<folder>/`) with the app. Each folder typically contains:

- `screen.png` — visual reference  
- `code.html` — static Tailwind mock (tokens, layout, copy hints—not production code)

**How to work:** pick a **Status** bucket, then work **screen → existing page/component**, reusing tokens from `code.html` (colors, radii, typography) in React/CSS.

**Last synced with codebase:** March 2026 (routes and primary files below reflect `eventpro-frontend` + `eventpro-mobile` as of this update).

**Legend**

| Status | Meaning |
|--------|--------|
| **Aligned** | Current UI already covers the flow; minor polish only |
| **Partial** | Exists but layout/styling/copy diverges from Stitch, and/or placeholder data / missing backend |
| **Gap** | Implement or significantly reshape to match design |
| **Design-only** | No matching product surface yet (or out of scope for app UI) |

---

## Root file

| Asset | Map to | Status |
|-------|--------|--------|
| `eventpro_design_brief.html` | Meta / index from Stitch | Design-only (reference) |

---

## Auth & onboarding

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `login` | `eventpro-frontend/src/pages/Login.tsx` | `eventpro-mobile/src/screens/LoginScreen.tsx` | Partial |
| `sign_up` | `pages/SignUp.tsx` | `screens/SignUpScreen.tsx` | Partial |
| `sign_up_refined_form` | Same as sign up | Same | Partial |
| `forgot_password` | `pages/ForgotPassword.tsx` | `screens/ForgotPasswordScreen.tsx` | Partial |
| `splash_screen_1`, `splash_screen_2` | No web splash | `SplashScreen.tsx` (Expo flow) + `app.json` assets | Partial |

---

## Discovery & search

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `discovery`, `discovery_home`, `discovery_web` | `pages/Home.tsx`, `pages/Events.tsx` | `screens/HomeScreen.tsx`, `EventsListScreen.tsx` | Partial |
| `search_results` | `Events.tsx` + search UX; `CategoryFilter` / API keyword | Events list + search | Partial |
| `electric_pulse` | Decorative/brand motion on Home or cards | Optional | Design-only / polish |

---

## Event detail & browsing

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `event_details_1`, `event_details_2`, `event_details_web` | `pages/EventDetails.tsx` | `screens/EventDetailScreen.tsx` | Partial |
| `ticket_selection` | Event detail + cart add; ticket type list | Same | Partial |
| `step_1_details_media`, `step_2_schedule_location`, `step_3_tickets_capacity` | `pages/EventFormNew.tsx` (create/edit wizard sections) | Create/edit often opens **web** (`WEB_URL/organizer/events/...`) | Partial (web) / Gap (mobile = web) |

---

## Checkout & seats

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `checkout_1` … `checkout_4` | `pages/Checkout.tsx` + `GuestCheckoutForm*.tsx`, `CheckoutPaymentForm.tsx` | `screens/CheckoutScreen.tsx` | Partial |
| `checkout_web` | Checkout page | Checkout | Partial |
| `checkout_with_zoomable_map` | `components/SeatingMap.tsx` + checkout | Seat selection + checkout | Partial |
| `checkout_detailed_order_summary_dropdown` | Checkout order summary / collapsible sections | Checkout | Partial |
| `checkout_detailed_seat_selection_1` … `3` | `SeatingMap.tsx`, `EventDetails` seat flow | Event detail → checkout | Partial |
| `checkout_payment_method_selection`, `checkout_payment_processing` | Stripe Elements / payment flow in checkout | Same | Partial |
| `checkout_prominent_confirm_button_1`, `2` | Checkout CTA layout | Checkout | Partial |
| `select_seats_row_selection_1` … `5` | Seat map rows/sections | Same | Partial |
| `select_seats_timer_warning_popup` | `ReservationCountdown.tsx` + warnings | Checkout | Partial |
| `select_seats_reservation_extended_toast` | Toast / reservation UX | Partial |
| `seat_map_builder` | Organizer seat map in event edit flow (`api` `createEventSeatMap`, event form) | **Web only** (deep link) | Partial (web) |

---

## Orders, tickets, post-purchase

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `my_tickets`, `my_tickets_web` | `pages/OrderHistory.tsx`, order detail | `OrderHistoryScreen.tsx`, `OrderDetailScreen.tsx` | Partial |
| `my_tickets_wallet` | Order/ticket presentation (QR) | Order detail | Partial |
| `order_confirmation_success_1`, `2` | Post-checkout success / `SuccessTicketReveal`, `PostPurchaseCelebration` | Checkout success path | Partial |
| `order_confirmation_social_sharing_options`, `order_confirmation_all_social_sharing_options_1`, `2` | `components/ShareActions.tsx` | Share actions if present | Partial |
| `order_confirmation_share_to_story_1`, `2` | Share flow (story-style) | **Gap** — may not match native share |
| `instagram_story_share_template`, `instagram_story_save_confirmation` | Share + social templates | **Design-only / Gap** (marketing templates); see `InstagramStoryTemplate` if present | Partial / Gap |
| `tiktok_share_template`, `tiktok_share_save_confirmation` | Same | `TikTokShareScreens.tsx` (mock-style) | Partial |
| `payment_failure` | Checkout error handling | Checkout | Partial |

---

## Profile, settings, account

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `user_profile` | `pages/Profile.tsx` | `screens/ProfileScreen.tsx` | Partial |
| `edit_profile_1`, `edit_profile_2` | `pages/ProfileEdit.tsx` | `ProfileEditScreen.tsx` | Partial |
| `profile_settings` | `pages/Settings.tsx` | `SettingsScreen.tsx` | Partial |
| `edit_profile_delete_confirmation`, `edit_profile_delete_confirmation_with_password` | Account deletion if implemented | Settings / profile | **Gap** — confirm product + API |
| `account_deleted_confirmation` | Post-delete screen | **Gap** |

---

## Organizer (dashboard, money, branding, team)

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `organizer_dashboard`, `web_organizer_dashboard` | `pages/Organizer.tsx` + `components/OrganizerDashboardStitch.tsx` (greeting + KPI strip) | `OrganizerDashboardScreen.tsx` | Partial |
| `financial_hub_web_view` | `components/FinancialHub.tsx` (embedded in Organizer; anchor `#organizer-financial`) | Summary on dashboard; full hub **web** | Partial |
| `team_management` | `pages/TeamManagement.tsx` — route **`/organizer/team`** (Stitch-style shell; placeholder data until org API) | **Web** primary; Profile shortcuts may still exist | Partial |
| `white_label_branding_configuration` | `pages/OrganizerBranding.tsx` — route **`/organizer/branding`**; Enterprise branding may also appear under Profile | **Web** | Partial |
| `check_in_attendee_management_web` | `pages/CheckIn.tsx` + attendees APIs | `CheckInScreen.tsx` (Stitch-style: live attendance, search, filters, list, FAB, bottom actions) | Partial |
| `check_in_scanner` | Check-in + QR | `QRScannerScreen.tsx` | Partial |
| `event_reviewer_permissions` | `pages/AdminEventReviewerPermissions.tsx` — **`/admin/event-reviewer-permissions`** | Event-scoped review UX TBD | Partial |

---

## Admin & verification

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `admin_dashboard_overview`, `admin_dashboard_web` | `pages/Admin.tsx`, `AdminDashboard.tsx` | `AdminOverviewScreen.tsx` | Partial |
| `admin_revenue_overview` | `pages/AdminRevenue.tsx` | `AdminRevenueScreen.tsx` | Partial |
| `user_management`, `user_management_web` | `pages/UserManagement.tsx` | `AdminUsersScreen.tsx` (Stitch-style list + chips) | Partial |
| `user_roles_management` | — | `UserRolesManagementScreen.tsx` (Stitch-style role cards; wired from admin overview) | Partial |
| `user_roles_permissions_web` | `pages/AdminRolesPermissions.tsx` — **`/admin/roles-permissions`** | See mobile roles screen | Partial |
| `verification_queue_1`, `2`, `verification_queue_web` | `pages/AdminVerification.tsx` (metrics + table; links to detail) | `AdminVerificationScreen.tsx` (tabs, stats, queue cards) | Partial |
| `verification_review_detail` | `pages/AdminVerificationDetail.tsx` — **`/admin/verification/:id`** | Web-first | Partial |
| `rejection_reason_modal` | Reject verification (inline reason on list) | Admin verification | Partial |
| `api_key_management`, `api_key_management_web` | `pages/AdminApiKeys.tsx` — **`/admin/api-keys`**; Enterprise keys may also surface on Profile | **Web** | Partial |
| `audit_logs_overview`, `audit_logs_web` | `pages/AdminAuditLogs.tsx` — **`/admin/audit-logs`** | — | Partial |
| `global_system_health`, `global_system_health_monitoring_web` | `pages/AdminSystemHealth.tsx` — **`/admin/system-health`** | `AdminSystemHealthScreen.tsx` | Partial |
| `support_agent_dashboard`, `support_analytics`, `ticket_detail_agent` | — | `SupportAgentWorkspaceScreen.tsx`, `SupportAnalyticsScreen.tsx`, `TicketDetailAgentScreen.tsx` (mock/placeholder data) | Partial |
| `agent_chat_view`, `live_chat_support`, `contact_support` | `pages/Contact.tsx`, `pages/Help.tsx` | `LiveChatSupportScreen.tsx` (UI shell; no live agent backend in repo) | Partial / Gap |
| `help_center` | `pages/Help.tsx` | `HelpCenterScreen.tsx` | Partial |

**Admin sidebar (web):** `components/AdminLayout.tsx` — includes Overview, Users, **Roles & permissions**, Verification, Events, Revenue, API Keys, **Audit Logs**, Reviewer roles, **System Health** (see `App.tsx` nested routes under `/admin/*`).

---

## Subscription & billing

| Stitch folder | Primary map (web) | Primary map (mobile) | Status |
|---------------|-------------------|----------------------|--------|
| `subscription_management_web` | `pages/Pricing.tsx`, `Settings` links, `SubscriptionReturn.tsx` | `PricingScreen.tsx` | Partial |
| `enterprise_subscription_management` | `pages/EnterpriseSubscription.tsx` — **`/enterprise/subscription`** | Enterprise flows may deep-link web | Partial |

---

## System & misc

| Stitch folder | Primary map | Status |
|---------------|-------------|--------|
| `system_settings` | `Settings.tsx` + theme (`ThemeToggle`, `PreferencesContext`) | Partial |
| `system_maintenance` | `eventpro-mobile` `SystemMaintenanceScreen.tsx` | Partial (screen exists; product use TBD) |
| `refund_review`, `refund_success` | Limited UI; `RefundSuccessScreen.tsx` on mobile | **Gap** (full refund wizard) |
| `organizer_approval_email`, `organizer_rejection_email` | Backend email HTML (`EmailServiceImpl` etc.) — not React routes | **Backend/templates** — align HTML emails separately |
| `end_chat_confirmation` | Chat UI not in product | Design-only |

---

## Web routes quick reference (organizer & admin)

| Route | Page component |
|-------|------------------|
| `/organizer` | `Organizer.tsx` |
| `/organizer/team` | `TeamManagement.tsx` |
| `/organizer/branding` | `OrganizerBranding.tsx` |
| `/organizer/check-in` | `CheckIn.tsx` |
| `/admin/overview` | `AdminDashboard.tsx` |
| `/admin/users` | `UserManagement.tsx` |
| `/admin/roles-permissions` | `AdminRolesPermissions.tsx` |
| `/admin/verification` | `AdminVerification.tsx` |
| `/admin/verification/:id` | `AdminVerificationDetail.tsx` |
| `/admin/audit-logs` | `AdminAuditLogs.tsx` |
| `/admin/system-health` | `AdminSystemHealth.tsx` |

---

## Suggested implementation order (high impact first)

1. **Checkout + seats** — `Checkout.tsx`, `SeatingMap.tsx`, `ReservationCountdown`, payment components — many Stitch variants converge here.  
2. **Event detail** — `EventDetails.tsx` / mobile `EventDetailScreen.tsx` — match `event_details_*`.  
3. **Discovery** — `Home.tsx`, `Events.tsx` — match `discovery_*`, `search_results`.  
4. **Organizer** — `Organizer.tsx`, `OrganizerDashboardStitch`, `FinancialHub.tsx`, `TeamManagement.tsx`, `OrganizerBranding.tsx`, `CheckIn.tsx` — match dashboard + financial + team + branding + check-in.  
5. **Profile** — `Profile.tsx` (team, API keys, verification CTA) — match `user_profile`, legacy branding entry points.  
6. **Admin** — `AdminLayout` routes: users, roles, verification (+ detail), audit logs, system health, reviewer permissions.  
7. **Auth** — `Login`, `SignUp`, `ForgotPassword` — align with Stitch `login`, `sign_up_*`, `forgot_password`.  
8. **Post-purchase** — `ShareActions`, order success — social templates may stay **marketing** unless you scope native share.  
9. **Defer or scope explicitly:** full live chat backend, splash branding polish, full refund flows, account deletion, parity on Instagram story flows, support agent **real** metrics (screens exist as mocks).

---

## Per-folder checklist (when implementing)

For each Stitch folder you tackle:

1. Open `screen.png` and skim `code.html` for **color tokens**, **typography**, **spacing**, **component boundaries**.  
2. Find the **Primary map** file(s) in the table above.  
3. Prefer **CSS variables / Tailwind** already in the repo; only introduce new tokens if the design system is meant to shift globally.  
4. Keep **feature flags and tier gating** (Basic / Pro / Enterprise) as in `MVP_ROADMAP.md`.  
5. **Mobile:** if the map says “web only”, either keep deep link to web or build parity deliberately (separate task).

---

*Update this file when screens or routes change. Paths are relative to `eventpro-frontend` / `eventpro-mobile` unless noted.*

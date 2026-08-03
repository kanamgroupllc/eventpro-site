# Mobile Feature Parity with Web

This doc maps every web app route/screen to the mobile app and tracks implementation status. The goal is for the mobile app to reflect the web app.

## Web routes → Mobile screens

| Web route | Mobile equivalent | Status |
|-----------|-------------------|--------|
| **Public** | | |
| `/` Home | Tab: Discover (home feed / featured) | Done |
| `/pricing` | Screen: Pricing | Done |
| `/partners` | Screen: Partners | Planned |
| `/events` | Tab: Discover → Events list | Done |
| `/events/:id` | Screen: EventDetail (tickets, add to cart) | Done |
| `/signup` | Screen: SignUp (auth stack) | Done |
| `/verify` | Screen: Verify (email verification) | Planned |
| `/login` | Screen: Login (auth stack) | Done |
| `/forgot-password` | Screen: ForgotPassword | Done |
| `/reset-password` | Screen: ResetPassword | Planned |
| `/checkout` | Screen: Checkout (cart, totals, pay) | Done |
| **Logged-in** | | |
| `/profile` | Tab: Profile → Profile screen | Done |
| `/profile/edit` | Screen: ProfileEdit | Done |
| `/settings` | Screen: Settings | Done |
| `/orders` | Screen: OrderHistory | Done |
| `/subscription/return` | Handle deep link / in-app after Stripe redirect | Planned |
| **Organizer** | | |
| `/organizer` | Tab: Organizer → Dashboard | Done |
| `/organizer/check-in` | Screen: CheckIn | Done |
| `/organizer/events/new` | Screen: EventFormNew | Planned |
| `/organizer/events/:id/edit` | Screen: EventFormEdit | Planned |
| `/organizer/events/:id/tickets` | Screen: EventTickets (list) | Done |
| `/organizer/events/:id/enhancements` | Screen: EventEnhancements (list) | Done |
| **Admin** | | |
| `/admin` | Tab: Admin (if ADMIN) → Overview | Done |
| `/admin/overview` | Admin stack: Dashboard | Done |
| `/admin/users` | Admin stack: UserManagement | Done |
| `/admin/verification` | Admin stack: AdminVerification | Done |
| `/admin/events` | Admin stack: AdminEvents | Planned |
| `/admin/event-sales` | Admin stack: AdminEventSales | Planned |
| `/admin/revenue` | Admin stack: AdminRevenue | Planned |
| `/admin/subscription-payments` | Admin stack: AdminSubscriptionPayments | Planned |

## Mobile navigation structure

- **Auth stack** (when not logged in): Login, SignUp, ForgotPassword, ResetPassword, Verify.
- **Main tabs** (when logged in):
  - **Discover**: Home, Events list, Event detail, Checkout (stack).
  - **Profile**: Profile, ProfileEdit, Settings, OrderHistory (stack).
  - **Organizer** (if ORGANIZER or ADMIN): Dashboard, Event list, Event detail/edit, Tickets, Enhancements, Check-in (stack).
  - **Admin** (if ADMIN only): Overview, Users, Verification, Events, Event sales, Revenue, Subscription payments (stack).
- **Modals / one-offs**: Pricing, Partners (can be screens in Discover or Profile).

## Shared API (@eventpro/shared)

The shared client must expose all endpoints the web uses so mobile can call the same backend. See `packages/eventpro-shared/src/createApiClient.ts`. Add any missing method there and in `EventProApi` interface when implementing a new mobile screen.

## Platform-specific behavior

- **Stripe Checkout (subscription):** Web redirects to Stripe then back to `/subscription/return`. Mobile can use in-app browser (WebView) or external browser and deep link back into the app with `eventpro://subscription/return`.
- **File upload (event image):** Web uses `<input type="file">`. Mobile uses `expo-image-picker` or similar and sends multipart from a URI or base64; backend should accept the same.
- **Export (CSV/PDF):** Web triggers blob download. Mobile can show “Open in…” or save to device via sharing / file system API.
- **1099-K download:** Same as export; mobile saves or shares the PDF.

## Implementation order

1. **Navigation:** Tab navigator (Discover, Profile, Organizer, Admin) + stack per tab.
2. **Auth:** SignUp, ForgotPassword, ResetPassword, Verify (use shared API).
3. **Discover:** Home, Events list, Event detail (getEvents, getEvent, getTicketTypes, getEventAddons).
4. **Checkout & orders:** Cart, Checkout (guest + logged-in), Order history (cart + payments API).
5. **Profile:** Profile, ProfileEdit, Settings (user + verification + subscription sync).
6. **Organizer:** Dashboard (summary, recent sales), Event CRUD, Tickets, Enhancements, Check-in (already done).
7. **Admin:** All admin screens and API calls.

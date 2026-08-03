# EventPro — API request flows (cookbook)

Persona-based **HTTP call sequences** with example JSON bodies. Use with **curl**, **Postman**, or **Swagger** (`http://localhost:8080/swagger-ui/index.html`). Controllers live under [backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/](backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/).

**Browser-centric QA steps:** [QA_E2E_USAGE_GUIDE.md](./QA_E2E_USAGE_GUIDE.md).

---

## Conventions

| Item | Detail |
|------|--------|
| Base URL | `http://localhost:8080` (or your `VITE_API_BASE_URL` host) |
| JSON responses | Wrapped in `ApiResponse`: `{ "success": true, "data": ..., "message": "..." }` ([ApiResponse.java](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/ApiResponse.java)) |
| Auth header | `Authorization: Bearer <accessToken>` — token from `POST /api/v1/auth/login` → `data.accessToken` (see `AuthResponse` in API / Swagger) |
| Content-Type | `application/json` unless noted (multipart for `POST /api/v1/events`) |

Replace placeholders: `{{accessToken}}`, `{{eventId}}`, `{{ticketUuid}}`, `{{submissionId}}`.

**Login is the same for all platform roles** (`USER`, `ORGANIZER`, `ADMIN`). The JWT encodes the role.

---

## 1. Public — browse catalog (no Bearer)

### 1.1 List published events

```http
GET /api/v1/events?page=1&size=10&sortBy=startTime&dir=asc
```

Optional: `keyword`, `organizerId` (UUID).

### 1.2 Event detail context

Use `id` from the list:

```http
GET /api/v1/events/{{eventId}}
GET /api/v1/events/{{eventId}}/ticket-types
GET /api/v1/events/{{eventId}}/addons
```

### 1.3 Payments (public)

```http
GET /api/v1/payments/config
```

```http
GET /api/v1/payments/checkout-totals?subtotal=50.00&state=CA&country=US
```

When not authenticated, **subtotal** query param is required (or the API returns an error).

---

## 2. Guest purchase (no Bearer)

Sequence matches [eventpro-frontend/src/lib/api.ts](../eventpro-frontend/src/lib/api.ts) (`guestReserve` → `createPaymentIntent` → Stripe.js → `confirmGuestPayment`).

### 2.1 Reserve tickets (optional lock)

`POST /api/v1/payments/guest-reserve`

```json
{
  "items": [
    {
      "eventId": "550e8400-e29b-41d4-a716-446655440000",
      "ticketType": "REGULAR",
      "quantity": 2
    }
  ]
}
```

`ticketType` is a string matching an available type for that event (e.g. `VIP`, `REGULAR`, `EARLY_BIRD` per [TicketType](../backend/services/modules/eventpro-core/src/main/java/com/accessplus/eventpro/shared/enums/TicketType.java)).

Response `data` includes `reservedTicketIds` and `reservedUntil` — pass IDs into confirm when used.

### 2.2 Create Stripe PaymentIntent

`POST /api/v1/payments/create-intent`

```json
{
  "amount": 50.0
}
```

Response `data.clientSecret` — use with **Stripe.js** on the client to collect the card and confirm the intent.

### 2.3 Confirm guest payment and create order

`POST /api/v1/payments/guest/confirm` — **no auth**

```json
{
  "paymentIntentId": "pi_xxx",
  "email": "guest@example.com",
  "firstName": "Guest",
  "lastName": "Buyer",
  "items": [
    {
      "eventId": "550e8400-e29b-41d4-a716-446655440000",
      "ticketType": "REGULAR",
      "quantity": 2
    }
  ],
  "totalAmount": 53.75,
  "reservedTicketIds": ["uuid-of-reserved-ticket-1", "uuid-of-reserved-ticket-2"],
  "donationAmount": 0,
  "howDidYouHear": "Search",
  "receiveTicketViaWhatsApp": false,
  "receiveTicketViaSMS": false,
  "state": "CA",
  "country": "US",
  "taxAmount": 3.75
}
```

Required: `paymentIntentId`, `email`, `items`, `totalAmount` (≥ 0.01). Other fields optional ([GuestConfirmPaymentRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/GuestConfirmPaymentRequest.java)).

The web app may send `ticketType` as a ticket-type key string; align with what `/ticket-types` returns for that event.

---

## 3. Registered user — cart and checkout

Sequence used by [Checkout.tsx](../eventpro-frontend/src/pages/Checkout.tsx) / [api.ts](../eventpro-frontend/src/lib/api.ts): **cart APIs** → **checkout totals** → **create-intent** → Stripe → **`POST /api/v1/payments/confirm`** with Bearer.

The web app **does not** call `POST /api/v1/orders` during card checkout. That endpoint exists ([OrderController](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/OrderController.java)) but **`/api/v1/payments/confirm` creates the order from the cart** after payment.

### 3.1 Sign up (optional)

`POST /api/v1/auth/signup`

```json
{
  "email": "buyer@example.com",
  "password": "Str0ngPass",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "phoneNumber": "+15555550100",
  "role": "USER"
}
```

`role`: `USER` or `ORGANIZER` ([AuthSignupRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/AuthSignupRequest.java)).

### 3.2 Log in

`POST /api/v1/auth/login`

```json
{
  "email": "buyer@example.com",
  "password": "Str0ngPass"
}
```

Save `data.accessToken` as `{{accessToken}}`.

### 3.3 Add to cart

`POST /api/v1/cart/add`  
Headers: `Authorization: Bearer {{accessToken}}`

**Option A — by event + enum type**

```json
{
  "eventIdType": "550e8400-e29b-41d4-a716-446655440000",
  "ticketType": "REGULAR",
  "quantity": 2
}
```

**Option B — by specific ticket UUID** (from inventory)

```json
{
  "id": "660e8400-e29b-41d4-a716-446655440001",
  "quantity": 1
}
```

([AddToCartRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/AddToCartRequest.java))

### 3.4 Read / update / clear cart

```http
GET /api/v1/cart
Authorization: Bearer {{accessToken}}
```

```http
PATCH /api/v1/cart/update/{{ticketUuid}}
Authorization: Bearer {{accessToken}}
Content-Type: application/json

{ "quantity": 2 }
```

([UpdateCartRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/UpdateCartRequest.java))

```http
DELETE /api/v1/cart/delete/{{ticketUuid}}
DELETE /api/v1/cart/clear
Authorization: Bearer {{accessToken}}
```

### 3.5 Checkout totals (optional, with auth)

```http
GET /api/v1/payments/checkout-totals?state=NY&country=US
Authorization: Bearer {{accessToken}}
```

If `subtotal` is omitted, the API may use the current cart total for the logged-in user.

### 3.6 PaymentIntent

`POST /api/v1/payments/create-intent` — auth not required by controller; frontend sends the **same total** (e.g. from checkout-totals) as `amount`.

```json
{
  "amount": 53.75
}
```

### 3.7 Confirm payment (creates order from cart)

`POST /api/v1/payments/confirm`  
Headers: `Authorization: Bearer {{accessToken}}`

```json
{
  "paymentIntentId": "pi_xxx",
  "state": "NY",
  "country": "US"
}
```

`state` / `country` optional ([ConfirmPaymentRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/ConfirmPaymentRequest.java)).

### 3.8 List orders (after purchase)

```http
GET /api/v1/orders?page=1&size=20
Authorization: Bearer {{accessToken}}
```

---

## 4. Organizer or ADMIN — create events and sell

Platform **ADMIN** and **ORGANIZER** can use these routes (`@PreAuthorize` allows both).

### 4.1 Create event (JSON — recommended for API testing)

`POST /api/v1/organizer/events`  
Headers: `Authorization: Bearer {{accessToken}}`

```json
{
  "name": "QA API Concert",
  "description": "Created via API cookbook",
  "startTime": "2026-06-15T19:00:00",
  "endTime": "2026-06-15T22:00:00",
  "marketingEnabled": false,
  "promotionalVideoUrl": null,
  "eventPageTemplate": "DEFAULT",
  "donationsEnabled": false,
  "customDomain": null,
  "reservedSeatingEnabled": false,
  "category": "Music",
  "address": {
    "street": "123 Main St",
    "city": "Austin",
    "state": "TX",
    "zipCode": "78701",
    "country": "US"
  }
}
```

`category` may be a **name** or category UUID ([CreateEventRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/CreateEventRequest.java)). Use seeded names from [V2__seed_categories.sql](../backend/services/modules/eventpro-api/src/main/resources/db/migration/V2__seed_categories.sql).

### 4.2 Alternate create (multipart + images)

`POST /api/v1/events` — `multipart/form-data`: part `request` = JSON string (same shape as create), optional `imageFiles` / `imageFile` ([EventController](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/EventController.java)). Requires Bearer; **ADMIN** or **ORGANIZER**.

### 4.3 Create ticket inventory

`POST /api/v1/organizer/events/{{eventId}}/tickets`  
Headers: `Authorization: Bearer {{accessToken}}`

```json
{
  "ticketType": "REGULAR",
  "price": 25.0,
  "quantity": 100,
  "name": "General Admission"
}
```

([CreateTicketsRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/CreateTicketsRequest.java))

### 4.4 Publish event

`POST /api/v1/events/{{eventId}}/publish`  
Headers: `Authorization: Bearer {{accessToken}}`  
No body. Publishing may require image/address per business rules.

### 4.5 List “my” events

```http
GET /api/v1/organizer/events
Authorization: Bearer {{accessToken}}
```

---

## 5. Admin-only (after admin login)

All require `Authorization: Bearer {{accessToken}}` with platform **ADMIN** JWT.

### 5.1 Create another admin

`POST /api/v1/admin/users`

```json
{
  "email": "newadmin@example.com",
  "password": "Str0ngPass",
  "firstName": "New",
  "lastName": "Admin",
  "phoneNumber": "+15555550101"
}
```

([CreateAdminUserRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/CreateAdminUserRequest.java))

### 5.2 Users and platform stats

```http
GET /api/v1/admin/users?page=1&size=10&sortBy=createdAt&dir=desc
GET /api/v1/admin/stats
```

### 5.3 KYC queue

```http
GET /api/v1/admin/verification-pending?limit=50
POST /api/v1/admin/verification/{{submissionId}}/approve
POST /api/v1/admin/verification/{{submissionId}}/reject
```

Reject body (optional):

```json
{
  "reason": "Document unreadable"
}
```

### 5.4 Events (moderation / visibility)

```http
GET /api/v1/admin/events?page=1&size=10&sortBy=createdAt&dir=desc
PATCH /api/v1/admin/events/{{eventId}}/status
Content-Type: application/json

{ "status": "PUBLISHED" }
```

([UpdateEventStatusRequest](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/dto/UpdateEventStatusRequest.java)) — verify current backend behavior; controller may be partially stubbed.

### 5.5 Other admin reads

```http
GET /api/v1/admin/event-sales
GET /api/v1/admin/revenue?period=30d
```

See [AdminController](../backend/services/modules/eventpro-api/src/main/java/com/accessplus/eventpro/api/controller/AdminController.java) for the full list.

### 5.6 Negative test (API)

Call any `GET /api/v1/admin/...` with a **USER** JWT — expect **403 Forbidden**.

---

## 6. Web client reference

| Flow | Key file | Endpoints used |
|------|----------|----------------|
| Guest checkout | [Checkout.tsx](../eventpro-frontend/src/pages/Checkout.tsx), [api.ts](../eventpro-frontend/src/lib/api.ts) | `guest-reserve` (if guest), `create-intent`, `guest/confirm` |
| Logged-in checkout | Same | `getCart`, `checkout-totals`, `create-intent`, `confirm` |
| Service method also present | [api.ts](../eventpro-frontend/src/lib/api.ts) `createOrder()` | `POST /api/v1/orders` — **not** used by the standard Stripe checkout path above |

---

*DTO field names and paths should match the Java classes linked above; if a call fails validation, check Swagger and the corresponding `*Request.java` file.*

# Redis for Reservations + Keeping the Request Path Fast (No 10s Blocking)

Two topics: **(1) Is Redis better for the “one winner, 99,999 rejected” reservation?** and **(2) How to avoid 50,000 users blocking for 10+ seconds (card, PDF, email).**

---

## 1. Redis vs DB for high-contention reservation

### When Redis is better

| Aspect | DB (FOR UPDATE SKIP LOCKED) | Redis |
|--------|----------------------------|--------|
| **Loser path** | One SELECT that returns 0 rows (~1–5 ms) | One DECR on a counter (~0.1–0.5 ms) |
| **Winner path** | SELECT + UPDATE in one transaction | DECR (if ≥ 0) + one DB write to persist the winner |
| **Scale** | DB connection pool and lock contention under huge RPS | Redis handles very high RPS; DB only for the winners |
| **Multi-instance** | Works (single DB) | Natural fit (shared Redis) |

So **Redis is better when** you want the **fastest possible “sold out”** for the vast majority of requests and are willing to add Redis and a hybrid flow.

### Hybrid pattern (Redis + DB)

1. **Capacity in Redis:** e.g. key `event:{id}:ticket:{type}:available` = integer (remaining count).
2. **Reserve request:**
   - **DECR** the key.
   - If result **&lt; 0:** **INCR** (rollback), return **“sold out”** immediately (no DB).
   - If result **≥ 0:** you “won” a slot → do **one** DB operation: atomic reserve-one (your existing `reserveOneTicketAtomic` or equivalent) to get a real ticket row and set reserved_until.
3. **Expiry:** Either:
   - Redis TTL on a per-reservation key (e.g. `reservation:{ticketId}` TTL 10 min) and a worker that on TTL expiry (or keyspace notification) releases the ticket in DB, or
   - Keep using your **DB `reserved_until` + scheduler** to release; Redis only for the “do we have capacity?” check.

**When to introduce it:** When you need **sub‑millisecond “sold out”** for losers or **very high RPS** (e.g. 10k+ reserve attempts/sec). Until then, **DB with FOR UPDATE SKIP LOCKED is enough** and avoids an extra system.

### Summary

- **Current design (DB only):** One winner, rest get “no ticket” with one cheap SELECT; good for most launches.
- **Redis:** Use when you need the **absolute fastest** rejection path and/or shared capacity across many API instances. Implement as **Redis capacity check + DB atomic reserve-one** for the winner.

---

## 2. Never block the request for 10+ seconds (card, PDF, email)

**Problem:** If “processing card + generating PDF + sending email” runs **inside the HTTP request**, 50,000 users each hold a thread for 10+ seconds and the server runs out of threads and crashes.

**Rule:** The **request path must finish in &lt; ~2–3 seconds**. Everything that can be slow (PDF, email, even “heavy” payment steps if needed) must run **outside** the request, via **queues + workers/Lambdas**.

### What the request should do (checkout confirm)

1. **Validate** payment (e.g. Stripe PaymentIntent already succeeded from client).
2. **Update DB:** order → PAID, mark tickets as sold.
3. **Publish to a queue** (e.g. “order fulfilled” or “send ticket”) so a **worker/Lambda** does the rest.
4. **Return 200** with order id (and maybe “your ticket will be emailed shortly”).

No **synchronous** PDF generation or email sending in this path.

### Per piece of work

| Work | Where it should run | Request does |
|------|---------------------|--------------|
| **Card processing** | Stripe handles the slow part; your server only **confirms** the PaymentIntent (usually 1–3 s). If you ever need “charge later”, do that in a worker after returning 202. | Call Stripe confirm; if success, continue. |
| **PDF generation** | **Worker/Lambda** (triggered by SQS after order PAID). Generate PDF, upload to S3, store URL on order/ticket. Optionally send “your ticket is ready” email with link. | Nothing. Or return “ticket will be ready in a minute” + poll/link. |
| **Sending email** | **Worker/Lambda** (notification-sender). API only **publishes a message** to the notification queue (order id, user email, type). | Publish message to SQS; return. |

### Your current architecture (and what to keep)

- **Order creation** already publishes to **SQS (order queue)**.
- **Payment-processor Lambda** (from payment queue) updates order/tickets and publishes to **notification queue**.
- **Notification-sender Lambda** sends **email** (and SMS, etc.) from the notification queue.

So **email is already async**. The critical checks:

1. **API confirm endpoint** must **not** call the notification service or send email directly; it should only update DB and publish to SQS (or trigger the existing order/payment pipeline).
2. **PDF** must **not** be generated inside the confirm request. Either:
   - **On-demand:** User clicks “Download ticket” later → API or worker generates (or returns from S3 if already generated), or
   - **Async after payment:** Order PAID → publish “fulfil order” message → worker generates PDF, uploads to S3, (optionally) sends email with link.

If “download ticket” today calls the API and the API generates the PDF synchronously, that’s acceptable for **one user at a time**; but for “we just paid, give me my ticket,” the flow should be **message → worker generates PDF → store in S3 → email link** (or “download” page), not 10 s in the request.

### Checklist (avoid thread exhaustion)

- [ ] **Confirm endpoint:** Only Stripe confirm + DB updates + **publish to queue**; then return. No PDF, no email, no long external calls beyond Stripe.
- [ ] **PDF:** Generated in a **worker/Lambda** after order PAID, or on-demand when user downloads (and optionally cached in S3 after first generation).
- [ ] **Email:** Only **publish to notification queue**; notification-sender Lambda sends the email.
- [ ] **Time budget:** Aim for **&lt; 2–3 s** for the confirm request (Stripe + DB + one SQS send). If Stripe is slow, consider “return 202 + process payment in background” and poll for result (advanced).

With this, 50,000 users get a **fast response** and the heavy work is done by **workers/Lambdas**, so server threads are not tied up for 10+ seconds.

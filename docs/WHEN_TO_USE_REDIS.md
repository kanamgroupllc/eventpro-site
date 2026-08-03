# When to Introduce Redis

**Short answer:** You don’t need Redis for the current reservation flow. Add Redis when you need **shared state across instances**, **very high throughput**, or **real-time features** that don’t fit the DB + scheduler model.

---

## Current approach (no Redis)

- **Reservation expiry:** `reserved_until` on `tickets` + a **scheduled job** (e.g. every minute) that releases expired reservations. Works well for a single instance and moderate traffic.
- **Countdown:** Backend returns `reservedUntil` (ISO-8601) from `guest-reserve`; frontend shows a countdown and, when it hits zero, treats the reservation as expired and sends the user back to review.

This is enough for MVP and early scale.

---

## When Redis starts to pay off

Introduce Redis when one or more of these are true:

| Need | Why Redis helps |
|------|------------------|
| **Multiple API instances** | All instances see the same reservation state. You can store reservation keys in Redis with TTL so expiry is automatic and consistent everywhere. |
| **High reservation volume** | Releasing thousands of reservations per minute via a DB job can be heavy. Redis TTL + keys per reservation scales better and avoids polling the DB. |
| **Real-time “ticket released” events** | If you want to push “a ticket was just released” to the browser (e.g. WebSocket or SSE), Redis pub/sub can notify all instances when a key expires or when a release happens. |
| **Session or rate-limiting** | Caching sessions or rate limits in Redis is a common use case and fits the same “shared, fast, TTL” model. |

For "one winner, 99,999 rejected" at very high RPS, a Redis capacity counter (DECR) gives sub-ms "sold out" for losers; see **REDIS_AND_ASYNC_HEAVY_WORK.md**.

## Suggested order

1. **Now:** Keep DB + scheduler + frontend countdown. No Redis.
2. **When you scale to 2+ API instances:** Add Redis for reservation state (e.g. “reservation:guest:{id}” with TTL) and optionally move release logic to Redis TTL or a single worker that consumes Redis events.
3. **When you need live “released” UX:** Add Redis pub/sub (or a similar mechanism) so the frontend can react when a reservation expires or tickets are released.

Until then, the countdown and DB-based reservation expiry are the right level of complexity.

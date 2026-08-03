# RDS PostgreSQL sizing (EventPro)

This guide ties Amazon RDS PostgreSQL sizing to **what EventPro actually stores** (Flyway schema) and gives **three deployment tiers** with **illustrative monthly and yearly cost** (compute + provisioned storage only). Validate numbers in your region and purchase option using [Amazon RDS instance comparison (Vantage)](https://instances.vantage.sh/rds) and the [AWS Pricing Calculator](https://calculator.aws/).

**Defaults in repo today:** [backend/shared-infra/variables.tf](../backend/shared-infra/variables.tf) uses PostgreSQL **16**, **gp3**, **20 GB** initial storage, **100 GB** max autoscaling, default instance **db.t3.micro** (consider **db.t4g.micro** or **db.t4g.small** for better price/performance on Graviton).

---

## Executive summary — recommended tiers

| Tier | Typical scale | Instance (example) | Multi-AZ | Provisioned storage (example) | Role |
|------|----------------|-------------------|----------|-------------------------------|------|
| **MVP** | ~**1,000** registered users; low traffic | **db.t4g.micro** (or **db.t4g.small** for headroom) | No | **20 GB** gp3 | Early product, single-AZ acceptable |
| **Growth** | ~**100k** registered users; rising orders and notifications | **db.t4g.medium** → **db.m7g.large** when CPU or latency bites | Usually no until HA needed | **100 GB** gp3 (autoscale cap higher) | Steady revenue, still cost-sensitive |
| **Production** | **~1M+** users or strict uptime / compliance | **db.m7g.large** or larger (**db.r7g.*** if memory-bound) | **Yes** | **500 GB+** gp3, autoscale cap **1 TB+** | HA, backups, monitoring, read scaling as needed |

**MVP data footprint:** For ~1k users, relational data (users, events, orders, payments, etc.) usually stays **well under ~1 GB** unless you mint **one database row per seat** at very large capacities or retain very large **audit** / **notification** histories. At MVP, **disk size is not the bottleneck**; **connections**, **query patterns**, and **bursts** matter more.

---

## Cost summary (illustrative — US East on-demand)

Assumptions used for the table below (adjust in your calculator):

- **Region:** US East (N. Virginia) — **prices differ by region**.
- **Compute:** **On-Demand**, **730 hours/month**, PostgreSQL on RDS.
- **Hourly rates (indicative, from public comparison tools):** **db.t4g.micro** ~**$0.016**/hr, **db.t4g.medium** ~**$0.064**/hr, **db.m7g.large** ~**$0.169**/hr ([Vantage RDS](https://instances.vantage.sh/rds)).
- **Storage:** **gp3** provisioned capacity ~**$0.115/GB-month** (AWS list-style rate for RDS storage in many regions — **confirm** for your engine/region).
- **Multi-AZ:** RDS **bills two instances** for compute (primary + standby); storage is still **provisioned once** per allocated GB (not doubled on the bill as two separate volumes).
- **Not included:** backup storage beyond free allowances, snapshot export, data transfer out, Enhanced Monitoring, extended Performance Insights retention, Reserved Instances / Savings Plans discounts, taxes.

| Tier | Instance | Multi-AZ | Storage | Est. compute / month | Est. storage / month | **Est. total / month** | **Est. total / year** |
|------|----------|----------|---------|----------------------|------------------------|-------------------------|------------------------|
| **MVP** | db.t4g.micro | No | 20 GB | ~$12 | ~$2 | **~$14** | **~$168** |
| **Growth** | db.t4g.medium | No | 100 GB | ~$47 | ~$12 | **~$59** | **~$708** |
| **Production** | db.m7g.large | Yes | 500 GB | ~$246 | ~$58 | **~$304** | **~$3,650** |

**Yearly column** = monthly estimate × **12** (simple annualization, no prepay discount).

If you use **Reserved Instances** or **Database Savings Plans**, effective yearly cost is typically **lower** than on-demand × 12.

---

## What lives in PostgreSQL (Flyway)

Core tables are defined in [V1__create_base_tables.sql](../backend/services/modules/eventpro-api/src/main/resources/db/migration/V1__create_base_tables.sql). Additional migrations add subscriptions, KYC, payouts, audit, and organizer features.

| Domain | Tables (representative) |
|--------|-------------------------|
| Identity / profile | `users`, `notification_preferences` |
| Locations | `addresses` |
| Catalog / events | `categories`, `events`, `event_addons`, `event_images` (URLs only) |
| Ticketing / commerce | `tickets`, `carts`, `orders`, `order_items`, `payments` |
| Notifications | `notifications`, `user_notifications` |
| Subscriptions (organizer plans) | `subscription_payments` |
| Organizer / enterprise | `organizer_kyc_submissions`, `organizer_team_members`, `organizer_follows`, `api_keys` |
| Finance | `payout_requests` |
| Compliance / ops | `platform_audit_events` (append-only) |

### High-variance tables (capacity surprises)

- **`tickets`:** Row counts swing widely if each row is a **SKU** vs **one row per issued ticket/seat** (schema allows `purchaser_id`, `qr_code` per row).
- **`user_notifications`** and **`platform_audit_events`:** Grow with product usage and admin activity; easy to underestimate.
- **Media:** Large binaries are **not** in Postgres (image fields are **URLs**); bulk bytes live in object storage.

---

## How to avoid running out of space

1. **Estimate rows** using registered users and ratios (organizers %, events per organizer, orders per buyer, line items per order, notifications, audit volume).
2. **Rough effective row size** (heap + hot indexes): often **~0.5–3 KB** for narrow rows; **TEXT**-heavy audit rows can be larger.
3. **Sum tables → add 30–50%** for bloat, TOAST, and future columns.
4. **Set `max_allocated_storage`** well above expected steady state. The Terraform stack already enables **storage autoscaling** with a **maximum** cap ([rds.tf](../backend/shared-infra/rds.tf), [variables.tf](../backend/shared-infra/variables.tf)).
5. **Watch** `FreeStorageSpace`, `DatabaseConnections`, `CPUUtilization`, and read/write latency in CloudWatch.

---

## Growth scenarios (registered users)

Orders and events **do not** scale 1:1 with registered users. Treat these as **order-of-magnitude** guides; plug your own ratios into the method above.

| Registered users | Directional relational data | Instance / storage posture |
|------------------|----------------------------|------------------------------|
| **~1,000 (MVP)** | Usually **sub-gigabyte** | **db.t4g.micro/small**, **20 GB**, autoscale cap **100 GB** |
| **~100,000** | Often **~10–50 GB** depending on commerce + notifications + audit | **db.t4g.medium** or **db.m7g.large**, **50–100 GB** initial, cap **≥ 500 GB** if ticket-per-seat or heavy audit |
| **~1,000,000** | Often **~100–300+ GB** with the same caveats | **db.m7g.large+**, **Multi-AZ** for production, **500 GB–1 TB+**, consider **read replica** or **Aurora PostgreSQL** if read-heavy |
| **~10,000,000** | Often **500 GB–1 TB+** | **Larger M7g/R7g**, **Multi-AZ**, **read scaling**, strict archival/retention for audit and notifications |

---

## When to upgrade (signals)

Upgrade or scale out when **sustained** high **CPU**, **connection** pressure, **P95/P99 query latency**, or **storage growth** trends toward your risk threshold — not merely because user count crossed a milestone.

**Practical additions at scale:** connection pooling (**RDS Proxy**), **read replica** for reporting, **Performance Insights** and **`pg_stat_statements`** (parameter group in [rds.tf](../backend/services/terraform/rds.tf) already loads `pg_stat_statements`).

---

## References

- [Amazon RDS instance comparison (Vantage)](https://instances.vantage.sh/rds) — vCPU, memory, and hourly estimates by region and engine.
- [AWS RDS pricing](https://aws.amazon.com/rds/pricing/) — authoritative list prices and options (Reserved, Savings Plans).
- Terraform: [backend/shared-infra/rds.tf](../backend/shared-infra/rds.tf), [backend/shared-infra/variables.tf](../backend/shared-infra/variables.tf).

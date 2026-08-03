# Production Monitoring, Rate Limiting, and Scaling

This doc covers: **detecting high throughput**, **what to monitor**, **rate limiting (DDoS)**, and **how robust the current architecture is** for scale.

---

## 1. Detecting high throughput

**Throughput** = requests per second (RPS) or per minute that your API handles.

### What you already have

- **Spring Boot Actuator** with `metrics` and **Prometheus** export is enabled (`application.yml`).
- Prometheus scrapes Micrometer metrics: HTTP request count, latency, JVM, etc.

### Key metrics to watch (high throughput signals)

| Metric | What it tells you | Where to see it |
|--------|-------------------|------------------|
| **`http_server_requests_seconds_count`** (by URI, method) | Request rate per endpoint | Prometheus / Grafana |
| **`http_server_requests_seconds_sum` / `_count`** | Latency (avg = sum/count) | Prometheus |
| **`jvm_memory_used_bytes`** | Memory pressure | Actuator `/actuator/metrics/jvm.memory.used` or Prometheus |
| **`hikaricp_connections_active`** | DB connection pool usage | Prometheus (if HikariCP metrics enabled) |
| **`system_cpu_usage`** | CPU load | Actuator / Prometheus |

### Enabling more metrics (recommended for production)

In `application.yml` (or `application-prod.yml`):

```yaml
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
  endpoint:
    health:
      show-details: when-authorized
  metrics:
    export:
      prometheus:
        enabled: true
  # Enable HikariCP and HTTP request metrics in Prometheus
  enable:
    all: false
  tags:
    application: eventpro-api
```

Ensure **Micrometer** registers HTTP and HikariCP. With `spring-boot-starter-actuator` and `prometheus` enabled, `http_server_requests_*` and (if on classpath) `hikaricp_*` are usually auto-exposed.

### Defining “high throughput” for your app

- **Baseline:** Measure normal traffic (e.g. 10–50 RPS per endpoint).
- **Thresholds:** Alert when:
  - RPS for a critical path (e.g. `/api/v1/payments/guest-reserve`, `/api/v1/events`) exceeds **2–3× baseline** for 5+ minutes, or
  - **p99 latency** exceeds a target (e.g. 2s for checkout, 500ms for listing events), or
  - **Error rate** (5xx or 4xx) spikes above a few percent.

Use **Prometheus + Alertmanager** (or your cloud’s alerting) to fire when these thresholds are breached.

---

## 2. What to monitor in production

### Must-have

| Area | What to monitor | Why |
|------|-----------------|-----|
| **Availability** | `/actuator/health` (HTTP 200) | Uptime checks, load balancer health |
| **Latency** | p50, p95, p99 per endpoint (from `http_server_requests_*`) | User experience, SLA |
| **Errors** | 4xx/5xx rate, logs (e.g. ELK, CloudWatch) | Incidents, bugs |
| **Throughput** | RPS per endpoint / total | Capacity planning, “high throughput” detection |
| **Database** | Connection pool usage, slow queries, lock wait | DB is usually the bottleneck |
| **Queues (SQS)** | Message age, depth, DLQ | Order/payment/notification flow |

### Nice-to-have

- **Distributed tracing** (e.g. Sleuth/Zipkin, OpenTelemetry) for request flow across API → DB → SQS.
- **Log aggregation** (structured JSON logs + ELK/Datadog/CloudWatch) with correlation IDs.
- **Business metrics:** orders/min, payments confirmed/min, reservation release rate.

### New Relic deployment variables

The ECS API uses the New Relic Java agent bundled in the service image. Set `NEW_RELIC_LICENSE_KEY` in the deploy environment to enable APM for the API service.

The Java Lambda processors use New Relic’s container layer (`newrelic-lambda-layers-java:21` copied into `/opt` in each Lambda Dockerfile), **`AWS_LAMBDA_EXEC_WRAPPER=/opt/newrelic-java-handler`**, and **`com.newrelic.java.HandlerWrapper::handleStreamsRequest`** as the image `command`, with **`NEW_RELIC_LAMBDA_HANDLER`** pointing at Spring’s `FunctionInvoker::handleRequest`. Terraform sets these when `new_relic_license_key` is non-empty.

#### Required deploy env (real AWS)

Set **both** before deploying Lambda stacks (never one without the other — partial config can drop telemetry with no obvious error):

```bash
export NEW_RELIC_LICENSE_KEY="..."
export NEW_RELIC_ACCOUNT_ID="..."
```

- `NEW_RELIC_ACCOUNT_ID` is the numeric New Relic account ID (same value as `NEW_RELIC_TRUSTED_ACCOUNT_KEY` in Lambda env).
- The license key and account ID **must be from the same New Relic account** (mismatch → silent drop).
- In GitHub Actions, both are passed as Terraform variables via repository secrets.

Terraform also sets **`NEW_RELIC_CLOUD_AWS_ACCOUNT_ID`** from `data.aws_caller_identity` so New Relic can map AWS entities.

#### Preflight (local / CI)

- Run `make newrelic-lambda-preflight` or `scripts/check-newrelic-lambda-prereqs.sh` after sourcing your `.env.remote` (validates paired license + account).
- `scripts/pipeline-deploy.sh` runs this automatically when `--lambdas` is included.

#### After deploy: prove telemetry

1. **Invoke each function** (SQS test messages or a full order flow). Lambdas only emit serverless telemetry when invoked.
2. **CloudWatch Logs**: search the function log stream for `NR_EXT`, `NewRelic`, or extension/agent lines.
3. **New Relic**: run NRQL such as `FROM AwsLambdaInvocation SELECT count(*) SINCE 30 minutes ago FACET aws.lambda.functionName` (exact attributes vary by data type).
4. **AWS config audit**: `make newrelic-lambda-verify-config` (requires `aws` + `jq`; uses `WORKSPACE` / `TF_WORKSPACE`, default `dev`) runs `scripts/verify-newrelic-lambda-telemetry.sh` against `${WORKSPACE}-order-processor`, `-payment-processor`, `-notification-sender`.

#### Troubleshooting (functions not “instrumented” or no data)

| Symptom | What to check |
|--------|----------------|
| No Lambda entities / no invocation data | **Duplicate AWS integrations** in New Relic for the same AWS account (API polling **and** CloudWatch Metric Streams). Unlink one per [New Relic docs](https://docs.newrelic.com/docs/serverless-function-monitoring/aws-lambda-monitoring/troubleshooting/troubleshoot-not-instrumented-lambda-function/). |
| No data, no errors | **License key vs account ID** mismatch (different NR accounts). |
| Partial GitHub secrets | Only `NEW_RELIC_LICENSE_KEY` or only `NEW_RELIC_ACCOUNT_ID` set — deploy will fail preflight. |
| Tag missing | Lambda must have tag **`NR.Apm.Lambda.Mode=true`** when New Relic is enabled (Terraform applies it). |

The Java Lambda entity name in the UI is driven primarily by **Lambda function metadata**, not `NEW_RELIC_APP_NAME` (retained for agent config).

### Health endpoint security

- Keep `/actuator/health` **public** for load balancers.
- Restrict **`/actuator/prometheus`** and **`/actuator/metrics`** in production (e.g. IP allowlist, VPN, or auth) so they are not exposed to the internet.

---

## 3. Rate limiting (DDoS and abuse)

**Yes, you should add rate limiting** for production to:

- Reduce impact of **DDoS** and abuse (e.g. brute force on login, spam on signup/guest-reserve).
- Keep the API fair under load and avoid one client exhausting DB/CPU.

### Options

| Approach | Pros | Cons |
|----------|------|------|
| **In-memory rate limit (per instance)** | Simple, no extra infra; good for single instance or first line of defence | Per-instance only; limits don’t aggregate across instances |
| **Redis-backed rate limit** | Shared across instances; accurate under multiple pods/nodes | Requires Redis; add when you scale horizontally |
| **API Gateway / load balancer** | Offloads rate limiting at the edge (e.g. AWS WAF, Cloudflare, nginx) | Depends on your hosting; may cost extra |

**Recommendation:**  
- **Now:** Add **in-memory rate limiting** on sensitive/public endpoints (login, signup, guest-reserve, create-intent).  
- **When you run 2+ instances:** Move to **Redis-backed** (e.g. Bucket4j with Redis) so limits are global.

### What to limit

- **Public/auth endpoints:** e.g. 30–60 req/min per IP for `/api/v1/auth/login`, `/api/v1/auth/signup`, `/api/v1/payments/guest-reserve`, `/api/v1/payments/create-intent`.
- **Strictest on:** login (brute force) and payment intent creation (abuse/card testing).

**Implemented:** A **per-IP, in-memory rate limit** is applied to POST `/api/v1/auth/login`, `/api/v1/auth/signup`, `/api/v1/auth/send-reset-email`, `/api/v1/payments/guest-reserve`, and `/api/v1/payments/create-intent`. Configure via `eventpro.rate-limit.*` (see `application.yml`). Disable for local with `EVENTPRO_RATE_LIMIT_ENABLED=false` if needed.

---

## 4. Is the current architecture robust enough to scale?

### What’s already solid

- **Stateless API:** No server-side session; JWT in header. You can run **multiple instances** behind a load balancer.
- **DB + Flyway:** Single source of truth; migrations are versioned.
- **Async processing:** Order/payment/notifications via **SQS + Lambdas** so the API doesn’t block on email or heavy work.
- **Reservation expiry:** DB + scheduler (or later Redis) is a scalable pattern for ticket locks.

### What to add or tune as you grow

| Concern | Now | When scaling |
|---------|-----|--------------|
| **Rate limiting** | Add in-memory per IP on public endpoints | Move to Redis when multi-instance |
| **DB connections** | Default HikariCP pool | Tune pool size (e.g. `maxPoolSize`) and monitor `hikaricp_connections_active` |
| **Caching** | None | Cache read-heavy, rarely changing data (e.g. event list, categories) if DB becomes hot |
| **Reservation state** | DB + scheduler | Redis for reservation TTL when you have many instances or very high reservation churn |
| **Secrets** | Env / Secrets Manager | Keep using Secrets Manager (or equivalent) in prod |
| **Horizontal scaling** | One instance | Add more API instances behind a load balancer; ensure health checks and metrics are in place |

### Scaling checklist

- [ ] **Monitoring:** Prometheus (or equivalent) scraping `/actuator/prometheus`; dashboards for RPS, latency, errors, DB pool.
- [ ] **Alerting:** Alerts on high error rate, high latency, health down, and (optional) high throughput.
- [ ] **Rate limiting:** In-memory (or Redis) on auth and payment-related public endpoints.
- [ ] **Health:** Load balancer health check → `/actuator/health`.
- [ ] **Restrict actuator:** Do not expose `/actuator/prometheus` and `/actuator/metrics` publicly without auth or allowlist.
- [ ] **DB:** Connection pool tuned; consider read replicas if read traffic grows.
- [ ] **Multi-instance:** When you run 2+ API instances, plan Redis for rate limiting and (if needed) reservation state.

**Summary:** The architecture is **robust enough to scale** for typical event ticketing (hundreds to low thousands of RPS) if you add **monitoring, alerting, and rate limiting**. Add Redis and caching when you need shared state and higher throughput.

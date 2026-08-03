# Actuator / Backend Not Loading – Troubleshooting

If **http://localhost:8080/actuator/health** does not load (connection refused, timeout, or no response), the backend is not running or not listening on port 8080. Follow these steps.

## 1. Check if the backend is running

```bash
docker compose ps
```

- If `backend` is not listed or status is not `Up`, the backend container is not running.

## 2. Check backend logs for the real error

```bash
docker compose logs backend
```

Look for:

- **JWT keys**:  
  `JWT_PUBLIC_KEY is invalid or missing` or `JWT_PRIVATE_KEY is invalid or missing`  
  → The app will not start without valid RSA keys.

- **Database**:  
  Connection refused to `postgres:5432` or similar  
  → Ensure `postgres` is healthy: `docker compose ps` and wait for `postgres` to be healthy before starting the backend.

- **Other**:  
  Any `Exception` or `Error` in the last 50–100 lines usually points to the cause.

## 3. Fix missing or invalid JWT keys (most common)

The backend **requires** `JWT_PUBLIC_KEY` and `JWT_PRIVATE_KEY` in the environment (e.g. from a `.env` file in the project root). If they are missing or invalid, Spring Boot fails at startup and the actuator never comes up.

1. Generate keys and update `.env`:

   ```bash
   make jwt-keys
   ```

2. Ensure `.env` exists in the **project root** (same directory as `docker-compose.yml`) and contains:

   ```bash
   JWT_PUBLIC_KEY=<base64-public-key>
   JWT_PRIVATE_KEY=<base64-private-key>
   ```

3. Restart the backend so it picks up the new env:

   ```bash
   docker compose up -d backend
   # or
   make local-restart
   ```

## 4. Restart the backend cleanly

After fixing env or config:

```bash
docker compose stop backend && docker compose up -d backend
```

Or full stack:

```bash
make local-restart
```

Then wait 30–60 seconds for Spring Boot to start and check:

```bash
curl -s http://localhost:8080/actuator/health
```

You should get a JSON response with `"status":"UP"` when the backend and actuator are working.

## `EOFException: Unexpected end of ZLIB input stream` (ZipFile)

If you see:

```text
Caused by: java.io.EOFException: Unexpected end of ZLIB input stream
    at java.base/java.util.zip.ZipFile$ZipFileInflaterInputStream.fill(ZipFile.java:461)
```

this usually means **a JAR (or ZIP) on the classpath is corrupted or truncated** (e.g. incomplete copy, bad Gradle cache, or Docker build). It is not caused by the image proxy or S3.

**What to do:**

1. **Clean rebuild and restart**
   ```bash
   cd backend/services && ./gradlew clean bootJar
   docker compose build backend --no-cache
   docker compose up -d backend
   ```
2. If you run without Docker, delete `~/.gradle/caches` for the project or run from a fresh clone.
3. If it only happens when hitting the image proxy URL, ensure the backend is not compressing image responses (compression is restricted to text/JSON in `application.yml`).

After a clean build, the error should go away unless a dependency JAR is actually corrupted (then try updating or excluding that dependency).

## `BeanDefinitionStoreException: Failed to read candidate component class` (eventpro-event JAR)

If you see:

```text
org.springframework.beans.factory.BeanDefinitionStoreException: Failed to read candidate component class: URL [jar:file:.../eventpro-event-1.0.0.jar!/com/accessplus/eventpro/event/event/service/impl/EventServiceImpl.class]
```

the **eventpro-event (or another module) JAR on the classpath is corrupted or incomplete**. This often happens when using `bootRun` with a mounted backend and a bad or partial Gradle build.

**What to do (local dev with Docker + mounted backend):**

1. **Clean build on the host, then restart the backend**
   ```bash
   cd backend/services && ./gradlew clean :eventpro-api:bootJar --no-daemon
   docker compose restart backend
   ```
   Wait for the backend to come up (30–60 s), then check `http://localhost:8080/actuator/health`.

2. **If it still fails, clear the Gradle cache volume and rebuild**
   ```bash
   docker compose stop backend
   docker volume rm eventpro-site_gradle_cache 2>/dev/null || true
   cd backend/services && ./gradlew clean :eventpro-api:bootJar --no-daemon
   docker compose up -d backend
   ```

3. **If you use `make`:** `make api-clean` then `make api-build`, then `docker compose restart backend`.

After a clean build, the module JARs under `backend/services/modules/*/build/libs/` are recreated and the backend should start.

## Image proxy returns 403 (Forbidden)

`GET /api/v1/images/proxy?url=...` returns **403 Forbidden** when S3/LocalStack denies read access to the object (e.g. object ACL or bucket policy). In local dev, this often happens for **images uploaded before we set PUBLIC_READ** on uploads.

**What to do:** Re-upload the event image so it gets the correct ACL: edit the event in the organizer UI → change or re-select the image → save. New uploads set PUBLIC_READ so the proxy (and direct URL) can read them.

## Image proxy returns 404 (Not Found)

`GET /api/v1/images/proxy?url=...` returns **404 Not Found** when the object does not exist in S3/LocalStack at the extracted key.

**What to do:**

1. **Check backend logs** – Look for `S3 object not found: events/.../filename.jpg` or `Image proxy failed for url=...`.

2. **Verify the object exists in LocalStack** (local dev):
   ```bash
   aws --endpoint-url=http://localhost:4566 s3 ls s3://eventpro-images-local/events/ --recursive
   ```
   If the object is missing, re-upload the event image via the organizer UI (edit event → change image → save).

3. **Confirm bucket name** – Backend uses `S3_BUCKET_NAME` (default `eventpro-images-local`). The proxy URL must refer to the same bucket.

4. **Enable debug logging** (optional) – In `application.yml` set `logging.level.com.accessplus.eventpro.event.service.impl: DEBUG` to see the exact `bucket` and `key` used.

## Summary

| Symptom | Likely cause | Action |
|--------|----------------|--------|
| Connection refused / actuator not loading | Backend not running or failed to start | `docker compose logs backend` and fix the reported error |
| `JWT_PUBLIC_KEY` / `JWT_PRIVATE_KEY` invalid or missing | Missing or bad keys in `.env` | `make jwt-keys`, add to `.env`, restart backend |
| DB connection errors | Postgres not ready or not reachable | Ensure `postgres` is healthy, then restart backend |
| `EOFException` / ZLIB / ZipFile | Corrupted or truncated JAR on classpath | Clean build, rebuild image: `./gradlew clean bootJar`, `docker compose build backend --no-cache` |
| `BeanDefinitionStoreException: Failed to read candidate component class` | Corrupted/incomplete module JAR (e.g. eventpro-event) | `cd backend/services && ./gradlew clean :eventpro-api:bootJar` then `docker compose restart backend` |
| Image proxy 403 | S3 access denied (e.g. old upload without PUBLIC_READ) | Re-upload the event image in organizer UI (edit event → change image → save) |
| Image proxy 404 | Object not in S3/LocalStack at that key | Check logs; list bucket with `aws --endpoint-url=http://localhost:4566 s3 ls s3://eventpro-images-local/events/ --recursive`; re-upload image if missing |
| **S3: The specified bucket does not exist (404)** | The bucket in `S3_BUCKET_NAME` has not been created | See [S3 bucket does not exist](#s3-bucket-does-not-exist) below |

Once the backend starts successfully, **http://localhost:8080/actuator/health** will respond; security already allows unauthenticated access to this endpoint.

### S3 bucket does not exist

The backend uses `S3_BUCKET_NAME` (default `eventpro-images-local`) for event images and QR codes. That bucket must exist in the same AWS (or LocalStack) environment the app is using.

- **LocalStack (Docker / local dev)**  
  With LocalStack running (e.g. `docker compose up -d localstack`), create the bucket:

  ```bash
  # Use the same name as in your .env (default: eventpro-images-local)
  aws --endpoint-url=http://localhost:4566 s3 mb s3://eventpro-images-local
  ```

  If the backend runs inside Docker and talks to LocalStack as `http://localstack:4566`, run the same command from a container that can reach LocalStack, or temporarily set `AWS_ENDPOINT_URL=http://localhost:4566` and run the above from your host (with LocalStack port 4566 published).

- **Real AWS**  
  Create the bucket in your AWS account (names must be globally unique), then set `S3_BUCKET_NAME` to that name:

  ```bash
  aws s3 mb s3://your-unique-bucket-name --region us-east-1
  ```

  In `.env` (or your deployment config): `S3_BUCKET_NAME=your-unique-bucket-name`.

If you use Terraform for local or deployed infra (e.g. `make local-infra` or `backend/shared-infra`), the images bucket is usually created for you and `S3_BUCKET_NAME` is set from shared infrastructure outputs.

---

## Login returns `net::ERR_CONNECTION_RESET`

If the browser shows **ERR_CONNECTION_RESET** when calling `POST /api/v1/auth/login`, the server is closing the connection before sending a response. Common causes:

1. **Backend not running or crashing** – Check `docker compose logs backend` and fix any startup or runtime errors (e.g. JWT keys, DB).
2. **Backend only listening on localhost inside Docker** – The API is configured to bind to `0.0.0.0` so the host can reach it via port 8080. If you overrode `server.address`, remove it or set it to `0.0.0.0`.
3. **Backend crashes on the login request** – Reproduce the login, then run `docker compose logs backend --tail 100` and look for an exception (e.g. in `AuthService`, `JwtService`, or a filter).

After fixing the backend, restart it and try login again. The frontend will show *"Cannot reach the server..."* for any network/connection error (including connection reset).

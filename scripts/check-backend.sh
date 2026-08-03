#!/usr/bin/env sh
# Wait for EventPro API to respond on localhost:8080 (Docker or host bootRun).
# Usage: ./scripts/check-backend.sh   OR   bash scripts/check-backend.sh

set -e
URL="${BACKEND_HEALTH_URL:-http://127.0.0.1:8080/actuator/health}"
MAX_ATTEMPTS="${CHECK_BACKEND_ATTEMPTS:-40}"
SLEEP_SEC="${CHECK_BACKEND_SLEEP:-2}"

echo "Checking ${URL} (up to $((MAX_ATTEMPTS * SLEEP_SEC))s)..."
i=1
while [ "$i" -le "$MAX_ATTEMPTS" ]; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    echo "OK — backend is up."
    curl -fsS "$URL" | head -c 500 || true
    echo ""
    exit 0
  fi
  printf "  attempt %s/%s...\n" "$i" "$MAX_ATTEMPTS"
  i=$((i + 1))
  sleep "$SLEEP_SEC"
done

echo "FAIL — backend did not become healthy. Last log lines:"
echo "  docker compose logs backend --tail 80"
exit 1

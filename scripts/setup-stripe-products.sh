#!/usr/bin/env bash
# Create (or reuse) KanamEvents Stripe Products + Prices for subscriptions.
# Idempotent via lookup_key on each Price.
#
# Usage:
#   STRIPE_SECRET_KEY=sk_test_... ./scripts/setup-stripe-products.sh
#   ./scripts/setup-stripe-products.sh --write-env   # also upsert price IDs into root .env
#
# Requires: curl, python3 (for JSON parsing)
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
WRITE_ENV=false

for arg in "$@"; do
  case "$arg" in
    --write-env) WRITE_ENV=true ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
  esac
done

if [[ -z "${STRIPE_SECRET_KEY:-}" && -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -a
  # shellcheck disable=SC1091
  source "$ENV_FILE"
  set +a
fi

if [[ -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "ERROR: STRIPE_SECRET_KEY is required (env or root .env)." >&2
  exit 1
fi

if [[ "$STRIPE_SECRET_KEY" == sk_test_local || "$STRIPE_SECRET_KEY" == sk_live_local ]]; then
  echo "ERROR: placeholder Stripe key detected. Use a real sk_test_/sk_live_ key." >&2
  exit 1
fi

API="https://api.stripe.com/v1"
AUTH=(-u "${STRIPE_SECRET_KEY}:")

stripe_post() {
  local path="$1"
  shift
  curl -sS "${AUTH[@]}" -X POST "${API}${path}" "$@"
}

stripe_get() {
  local path="$1"
  shift
  curl -sS "${AUTH[@]}" "${API}${path}" "$@"
}

json_get() {
  python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get(sys.argv[1],"") or "")' "$1"
}

# Find active price by lookup_key; print price id or empty.
find_price_by_lookup() {
  local lookup="$1"
  stripe_get "/prices?lookup_keys[]=${lookup}&active=true&limit=1" \
    | python3 -c 'import json,sys; d=json.load(sys.stdin); data=d.get("data") or []; print(data[0]["id"] if data else "")'
}

# Find product by metadata kanamevents_tier=...; print product id or empty.
find_product_by_tier() {
  local tier="$1"
  stripe_get "/products?active=true&limit=100" \
    | python3 -c '
import json,sys
tier=sys.argv[1]
d=json.load(sys.stdin)
for p in d.get("data") or []:
    md=p.get("metadata") or {}
    if md.get("kanamevents_tier")==tier:
        print(p["id"]); break
' "$tier"
}

ensure_product() {
  local tier="$1"
  local name="$2"
  local desc="$3"
  local existing
  existing="$(find_product_by_tier "$tier")"
  if [[ -n "$existing" ]]; then
    echo "Product exists ($tier): $existing" >&2
    printf '%s' "$existing"
    return
  fi
  local resp
  resp="$(stripe_post /products \
    -d "name=${name}" \
    -d "description=${desc}" \
    -d "metadata[kanamevents_tier]=${tier}" \
    -d "metadata[app]=KanamEvents")"
  local id
  id="$(printf '%s' "$resp" | json_get id)"
  if [[ -z "$id" ]]; then
    echo "Failed to create product $name:" >&2
    echo "$resp" >&2
    exit 1
  fi
  echo "Created product ($tier): $id" >&2
  printf '%s' "$id"
}

ensure_recurring_price() {
  local product_id="$1"
  local lookup="$2"
  local unit_amount_cents="$3"
  local interval="$4" # month|year
  local nickname="$5"

  local existing
  existing="$(find_price_by_lookup "$lookup")"
  if [[ -n "$existing" ]]; then
    echo "Price exists ($lookup): $existing" >&2
    printf '%s' "$existing"
    return
  fi

  local resp
  resp="$(stripe_post /prices \
    -d "product=${product_id}" \
    -d "currency=usd" \
    -d "unit_amount=${unit_amount_cents}" \
    -d "recurring[interval]=${interval}" \
    -d "lookup_key=${lookup}" \
    -d "nickname=${nickname}" \
    -d "metadata[kanamevents_lookup]=${lookup}" \
    -d "metadata[app]=KanamEvents")"
  local id
  id="$(printf '%s' "$resp" | json_get id)"
  if [[ -z "$id" ]]; then
    echo "Failed to create price $lookup:" >&2
    echo "$resp" >&2
    exit 1
  fi
  echo "Created price ($lookup): $id" >&2
  printf '%s' "$id"
}

upsert_env() {
  local key="$1"
  local value="$2"
  local file="$3"
  touch "$file"
  if grep -q "^${key}=" "$file" 2>/dev/null; then
    # portable in-place replace
    python3 - "$file" "$key" "$value" <<'PY'
import sys
path, key, value = sys.argv[1], sys.argv[2], sys.argv[3]
lines = open(path).read().splitlines()
out = []
found = False
for line in lines:
    if line.startswith(key + "="):
        out.append(f"{key}={value}")
        found = True
    else:
        out.append(line)
if not found:
    out.append(f"{key}={value}")
open(path, "w").write("\n".join(out) + "\n")
PY
  else
    printf '\n%s=%s\n' "$key" "$value" >> "$file"
  fi
}

echo "==> KanamEvents Stripe product/price setup"
echo "    (Enterprise is annual-only — no monthly Enterprise price)"

PRO_PRODUCT="$(ensure_product PRO "KanamEvents Pro" "Pro plan for growing organizers")"
ENT_PRODUCT="$(ensure_product ENTERPRISE "KanamEvents Enterprise" "Enterprise white-label annual plan")"

# Pro: $99/mo, $79/mo billed annually = $948/year
PRO_MONTHLY="$(ensure_recurring_price "$PRO_PRODUCT" "kanamevents_pro_monthly" 9900 month "Pro monthly")"
PRO_YEARLY="$(ensure_recurring_price "$PRO_PRODUCT" "kanamevents_pro_yearly" 94800 year "Pro yearly")"

# Enterprise: $3000/year only
ENT_YEARLY="$(ensure_recurring_price "$ENT_PRODUCT" "kanamevents_enterprise_yearly" 300000 year "Enterprise yearly")"

echo ""
echo "==> Add these to your .env (and GitHub secrets for deploy):"
cat <<EOF
STRIPE_PRICE_PRO_MONTHLY=${PRO_MONTHLY}
STRIPE_PRICE_PRO_YEARLY=${PRO_YEARLY}
STRIPE_PRICE_ENTERPRISE_YEARLY=${ENT_YEARLY}
# Enterprise monthly is not used (annual-only). Leave unset or blank:
# STRIPE_PRICE_ENTERPRISE_MONTHLY=
EOF

if [[ "$WRITE_ENV" == true ]]; then
  upsert_env STRIPE_PRICE_PRO_MONTHLY "$PRO_MONTHLY" "$ENV_FILE"
  upsert_env STRIPE_PRICE_PRO_YEARLY "$PRO_YEARLY" "$ENV_FILE"
  upsert_env STRIPE_PRICE_ENTERPRISE_YEARLY "$ENT_YEARLY" "$ENV_FILE"
  # Clear monthly enterprise if present so it cannot be used accidentally
  if grep -q '^STRIPE_PRICE_ENTERPRISE_MONTHLY=' "$ENV_FILE" 2>/dev/null; then
    upsert_env STRIPE_PRICE_ENTERPRISE_MONTHLY "" "$ENV_FILE"
  fi
  echo ""
  echo "==> Updated ${ENV_FILE} (price IDs only; secret key untouched)."
fi

echo ""
echo "Done. Recreate backend so it picks up new price IDs:"
echo "  docker compose up -d --force-recreate backend"

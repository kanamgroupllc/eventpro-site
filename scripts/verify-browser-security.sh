#!/usr/bin/env bash
# Non-destructive browser CSRF/CORS contract verification for AWS or LocalStack.

set -euo pipefail

API_URL=""
APP_ORIGIN=""
CSRF_ENABLED="true"
INSECURE_TLS=false
VERIFY_FRONTEND=false
SMOKE_EMAIL="${CSRF_SMOKE_EMAIL:-}"
SMOKE_PASSWORD="${CSRF_SMOKE_PASSWORD:-}"

usage() {
  cat <<'USAGE'
Usage: scripts/verify-browser-security.sh --api-url URL --app-origin ORIGIN [options]

Options:
  --csrf-enabled true|false  Expected enforcement state (default: true)
  --insecure                Allow the LocalStack development certificate
  --verify-frontend         Verify the current frontend asset embeds this API URL
  -h, --help                Show this help

Set both CSRF_SMOKE_EMAIL and CSRF_SMOKE_PASSWORD to additionally verify a
successful login, token rotation, and authenticated API access. Secrets and
tokens are never printed.
USAGE
}

fail() {
  printf 'Browser security verification failed: %s\n' "$*" >&2
  exit 1
}

while [ $# -gt 0 ]; do
  case "$1" in
    --api-url)
      [ $# -ge 2 ] || fail "missing value for --api-url"
      API_URL="${2%/}"
      shift 2
      ;;
    --app-origin)
      [ $# -ge 2 ] || fail "missing value for --app-origin"
      APP_ORIGIN="${2%/}"
      shift 2
      ;;
    --csrf-enabled)
      [ $# -ge 2 ] || fail "missing value for --csrf-enabled"
      CSRF_ENABLED="$2"
      shift 2
      ;;
    --insecure)
      INSECURE_TLS=true
      shift
      ;;
    --verify-frontend)
      VERIFY_FRONTEND=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *) fail "unknown option: $1" ;;
  esac
done

[ -n "$API_URL" ] || fail "--api-url is required"
[ -n "$APP_ORIGIN" ] || fail "--app-origin is required"
case "$CSRF_ENABLED" in
  true|false) ;;
  *) fail "--csrf-enabled must be 'true' or 'false'" ;;
esac
if { [ -n "$SMOKE_EMAIL" ] && [ -z "$SMOKE_PASSWORD" ]; } || \
   { [ -z "$SMOKE_EMAIL" ] && [ -n "$SMOKE_PASSWORD" ]; }; then
  fail "CSRF_SMOKE_EMAIL and CSRF_SMOKE_PASSWORD must be set together"
fi

for command in awk curl grep jq mktemp; do
  command -v "$command" >/dev/null 2>&1 || fail "$command is required"
done

HEADERS_FILE="$(mktemp)"
BODY_FILE="$(mktemp)"
COOKIE_JAR="$(mktemp)"
LOGIN_HEADERS_FILE="$(mktemp)"
LOGIN_BODY_FILE="$(mktemp)"
FRONTEND_BODY_FILE="$(mktemp)"
cleanup() {
  rm -f "$HEADERS_FILE" "$BODY_FILE" "$COOKIE_JAR" "$LOGIN_HEADERS_FILE" "$LOGIN_BODY_FILE" "$FRONTEND_BODY_FILE"
}
trap cleanup EXIT

CURL_ARGS=(-sS --http1.1 --max-time 30)
if [ "$INSECURE_TLS" = true ]; then
  CURL_ARGS+=(-k)
fi

header_value() {
  local file="$1" header_name="$2"
  awk -v wanted="$header_name" '
    BEGIN { wanted = tolower(wanted) }
    {
      line = $0
      sub(/\r$/, "", line)
      separator = index(line, ":")
      if (separator > 0 && tolower(substr(line, 1, separator - 1)) == wanted) {
        value = substr(line, separator + 1)
        sub(/^[[:space:]]+/, "", value)
        found = value
      }
    }
    END { if (found != "") print found }
  ' "$file"
}

assert_header_equals() {
  local file="$1" header_name="$2" expected="$3" actual
  actual="$(header_value "$file" "$header_name")"
  [ "$actual" = "$expected" ] || fail "$header_name was not '$expected'"
}

assert_header_contains() {
  local file="$1" header_name="$2" expected="$3" value
  value="$(header_value "$file" "$header_name")"
  [ -n "$value" ] || fail "$header_name was absent"
  awk -v value="$value" -v expected="$expected" '
    BEGIN {
      if (index(tolower(value), tolower(expected)) > 0) exit 0
      exit 1
    }
  ' || fail "$header_name did not contain '$expected'"
}

assert_header_token() {
  local file="$1" header_name="$2" expected="$3" value
  value="$(header_value "$file" "$header_name")"
  [ -n "$value" ] || fail "$header_name was absent"
  awk -v value="$value" -v expected="$expected" '
    BEGIN {
      expected = tolower(expected)
      count = split(value, parts, ",")
      for (i = 1; i <= count; i++) {
        gsub(/^[[:space:]]+|[[:space:]]+$/, "", parts[i])
        if (tolower(parts[i]) == expected) exit 0
      }
      exit 1
    }
  ' || fail "$header_name did not contain '$expected'"
}

assert_no_header() {
  local file="$1" header_name="$2"
  [ -z "$(header_value "$file" "$header_name")" ] || fail "$header_name was unexpectedly present"
}

request() {
  curl "${CURL_ARGS[@]}" -D "$HEADERS_FILE" -o "$BODY_FILE" -w '%{http_code}' "$@"
}

verify_frontend_asset() {
  local status asset_path asset_url
  status="$(curl "${CURL_ARGS[@]}" -H 'Cache-Control: no-cache' -D "$HEADERS_FILE" -o "$FRONTEND_BODY_FILE" -w '%{http_code}' "$APP_ORIGIN/")"
  [ "$status" = 200 ] || fail "frontend entry point returned HTTP $status"
  assert_header_contains "$HEADERS_FILE" 'Cache-Control' 'no-cache'
  grep -q '<div id="root"' "$FRONTEND_BODY_FILE" || fail "frontend entry point did not contain the application root"
  asset_path="$(grep -Eo 'src="[^"]+\.js"' "$FRONTEND_BODY_FILE" | head -1 | cut -d'"' -f2)"
  [ -n "$asset_path" ] || fail "frontend entry point did not reference a JavaScript asset"
  case "$asset_path" in
    https://*) asset_url="$asset_path" ;;
    /*) asset_url="${APP_ORIGIN}${asset_path}" ;;
    *) asset_url="${APP_ORIGIN}/${asset_path}" ;;
  esac
  status="$(curl "${CURL_ARGS[@]}" -H 'Cache-Control: no-cache' -o "$FRONTEND_BODY_FILE" -w '%{http_code}' "$asset_url")"
  [ "$status" = 200 ] || fail "current frontend JavaScript asset returned HTTP $status"
  grep -Fq "$API_URL" "$FRONTEND_BODY_FILE" || fail "current frontend asset does not embed the expected API URL"
  printf 'Frontend asset/API URL verification passed for %s\n' "$APP_ORIGIN"
}

if [ "$VERIFY_FRONTEND" = true ]; then
  verify_frontend_asset
fi

printf 'Verifying browser CORS contract for %s\n' "$API_URL"

status="$(request -X OPTIONS \
  -H "Origin: $APP_ORIGIN" \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: X-Correlation-Id' \
  "$API_URL/api/v1/events")"
case "$status" in 200|204) ;; *) fail "safe-method preflight returned HTTP $status" ;; esac
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Origin' "$APP_ORIGIN"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Credentials' 'true'
assert_header_token "$HEADERS_FILE" 'Access-Control-Allow-Headers' 'X-Correlation-Id'

status="$(request -X OPTIONS \
  -H "Origin: $APP_ORIGIN" \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: Authorization, Content-Type, X-Correlation-Id, X-XSRF-TOKEN' \
  "$API_URL/api/v1/auth/login")"
case "$status" in 200|204) ;; *) fail "unsafe-method preflight returned HTTP $status" ;; esac
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Origin' "$APP_ORIGIN"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Credentials' 'true'
for method in GET POST PUT PATCH DELETE; do
  assert_header_token "$HEADERS_FILE" 'Access-Control-Allow-Methods' "$method"
done
for header in Authorization Content-Type X-Correlation-Id X-XSRF-TOKEN; do
  assert_header_token "$HEADERS_FILE" 'Access-Control-Allow-Headers' "$header"
done

status="$(request -X OPTIONS \
  -H 'Origin: https://attacker.invalid' \
  -H 'Access-Control-Request-Method: POST' \
  -H 'Access-Control-Request-Headers: X-XSRF-TOKEN' \
  "$API_URL/api/v1/auth/login")"
assert_no_header "$HEADERS_FILE" 'Access-Control-Allow-Origin'

status="$(curl "${CURL_ARGS[@]}" -D "$HEADERS_FILE" -o "$BODY_FILE" -w '%{http_code}' \
  -c "$COOKIE_JAR" -H "Origin: $APP_ORIGIN" "$API_URL/api/v1/csrf")"
[ "$status" = 200 ] || fail "CSRF bootstrap returned HTTP $status"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Origin' "$APP_ORIGIN"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Credentials' 'true'
assert_header_token "$HEADERS_FILE" 'Access-Control-Expose-Headers' 'X-XSRF-TOKEN'
assert_header_token "$HEADERS_FILE" 'Access-Control-Expose-Headers' 'X-Correlation-Id'

csrf_header="$(jq -er '.headerName' "$BODY_FILE")" || fail "CSRF response omitted headerName"
csrf_token="$(jq -er '.token' "$BODY_FILE")" || fail "CSRF response omitted token"
[ "$csrf_header" = 'X-XSRF-TOKEN' ] || fail "CSRF endpoint returned an unexpected header name"
set_cookie="$(header_value "$HEADERS_FILE" 'Set-Cookie')"
[ -n "$set_cookie" ] || fail "CSRF bootstrap omitted Set-Cookie"
grep -Eqi '(^|[[:space:];])XSRF-TOKEN=' <<<"$set_cookie" || fail "CSRF cookie name was incorrect"
grep -Eqi '(^|;[[:space:]]*)Path=/($|;)' <<<"$set_cookie" || fail "CSRF cookie path was not /"
grep -Eqi '(^|;[[:space:]]*)Secure($|;)' <<<"$set_cookie" || fail "CSRF cookie was not Secure"
grep -Eqi '(^|;[[:space:]]*)HttpOnly($|;)' <<<"$set_cookie" || fail "CSRF cookie was not HttpOnly"
grep -Eqi '(^|;[[:space:]]*)SameSite=Strict($|;)' <<<"$set_cookie" || fail "CSRF cookie was not SameSite=Strict"
if grep -Eqi '(^|;[[:space:]]*)Domain=' <<<"$set_cookie"; then
  fail "CSRF cookie must remain host-only"
fi

if [ "$CSRF_ENABLED" = false ]; then
  printf 'CSRF bootstrap and CORS checks passed; enforcement checks skipped as requested.\n'
  exit 0
fi

status="$(request -X POST -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$API_URL/api/v1/auth/login")"
[ "$status" = 403 ] || fail "missing CSRF token returned HTTP $status instead of 403"
[ "$(jq -r '.code // empty' "$BODY_FILE")" = 'CSRF_TOKEN_MISSING' ] || fail "missing-token error code was incorrect"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Origin' "$APP_ORIGIN"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Credentials' 'true'

status="$(request -X POST -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  -H "$csrf_header: deliberately-invalid" -b "$COOKIE_JAR" --data '{}' \
  "$API_URL/api/v1/auth/login")"
[ "$status" = 403 ] || fail "invalid CSRF token returned HTTP $status instead of 403"
[ "$(jq -r '.code // empty' "$BODY_FILE")" = 'CSRF_TOKEN_INVALID' ] || fail "invalid-token error code was incorrect"
assert_header_equals "$HEADERS_FILE" 'Access-Control-Allow-Origin' "$APP_ORIGIN"

status="$(request -X POST -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  -H "$csrf_header: $csrf_token" -b "$COOKIE_JAR" --data '{}' \
  "$API_URL/api/v1/auth/login")"
if [ "$status" = 403 ] && jq -e '.code == "CSRF_TOKEN_MISSING" or .code == "CSRF_TOKEN_INVALID"' "$BODY_FILE" >/dev/null 2>&1; then
  fail "matching CSRF token was rejected"
fi

if [ -n "$SMOKE_EMAIL" ]; then
  login_payload="$(jq -nc --arg email "$SMOKE_EMAIL" --arg password "$SMOKE_PASSWORD" \
    '{email:$email,password:$password}')"
  status="$(curl "${CURL_ARGS[@]}" -D "$LOGIN_HEADERS_FILE" -o "$LOGIN_BODY_FILE" -w '%{http_code}' \
    -X POST -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
    -H "$csrf_header: $csrf_token" -b "$COOKIE_JAR" -c "$COOKIE_JAR" \
    --data "$login_payload" "$API_URL/api/v1/auth/login")"
  [ "$status" = 200 ] || fail "smoke-account login returned HTTP $status"
  jq -e '.success == true and (.data.accessToken | length > 20)' "$LOGIN_BODY_FILE" >/dev/null || \
    fail "smoke-account login did not return a JWT"
  rotated_token="$(header_value "$LOGIN_HEADERS_FILE" 'X-XSRF-TOKEN')"
  [ -n "$rotated_token" ] || fail "successful login omitted the rotated CSRF response header"
  [ "$rotated_token" != "$csrf_token" ] || fail "successful login did not rotate the CSRF token"
  assert_header_token "$LOGIN_HEADERS_FILE" 'Access-Control-Expose-Headers' 'X-XSRF-TOKEN'

  jwt="$(jq -er '.data.accessToken' "$LOGIN_BODY_FILE")" || fail "could not read smoke JWT"
  status="$(request -H "Origin: $APP_ORIGIN" -H 'X-Correlation-Id: csrf-smoke-verification' \
    -H "Authorization: Bearer $jwt" -b "$COOKIE_JAR" "$API_URL/api/v1/users/me")"
  [ "$status" = 200 ] || fail "authenticated smoke request returned HTTP $status"

  status="$(request -X POST -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
    -H "$csrf_header: $rotated_token" -b "$COOKIE_JAR" --data '{}' \
    "$API_URL/api/v1/auth/login")"
  if [ "$status" = 403 ] && jq -e '.code == "CSRF_TOKEN_MISSING" or .code == "CSRF_TOKEN_INVALID"' "$BODY_FILE" >/dev/null 2>&1; then
    fail "rotated CSRF token was rejected"
  fi
fi

printf 'Browser CSRF/CORS verification passed for %s\n' "$APP_ORIGIN"

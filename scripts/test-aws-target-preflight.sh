#!/usr/bin/env bash
# shellcheck disable=SC2016

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

printf '%s\n' \
  '#!/usr/bin/env bash' \
  'set -euo pipefail' \
  '[ -z "${AWS_ENDPOINT_URL:-}" ] || { echo "endpoint leak" >&2; exit 90; }' \
  '[ -z "${LOCALSTACK_RUNTIME_ENDPOINT:-}" ] || { echo "runtime endpoint leak" >&2; exit 91; }' \
  'printf "%s\n" "${STUB_ACCOUNT:?}"' \
  > "$TMP_DIR/aws"
chmod +x "$TMP_DIR/aws"

printf '%s\n' \
  'AWS_ACCOUNT_ID=123456789012' \
  'AWS_REGION=us-east-1' \
  > "$TMP_DIR/aws.env"

PATH="$TMP_DIR:$PATH" \
  STUB_ACCOUNT=123456789012 \
  AWS_ENDPOINT_URL=http://localhost:4566 \
  LOCALSTACK_RUNTIME_ENDPOINT=http://localhost.localstack.cloud:4566 \
  "$ROOT_DIR/scripts/pipeline-deploy.sh" --env-file "$TMP_DIR/aws.env" --preflight-only >/dev/null

if PATH="$TMP_DIR:$PATH" \
  STUB_ACCOUNT=000000000000 \
  AWS_ENDPOINT_URL=http://localhost:4566 \
  "$ROOT_DIR/scripts/pipeline-deploy.sh" --env-file "$TMP_DIR/aws.env" --preflight-only >/dev/null 2>&1; then
  echo "Expected LocalStack account identity to be rejected" >&2
  exit 1
fi

echo "AWS target preflight tests passed."

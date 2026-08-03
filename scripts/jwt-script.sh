#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

GENERATE_IF_MISSING="false"

usage() {
  cat <<EOF
Usage: $(basename "$0") [--generate-if-missing] [private_key_file] [public_key_file] [env_file]

Options:
  --generate-if-missing   Generate JWT PEM files only if missing
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --generate-if-missing)
      GENERATE_IF_MISSING="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    --)
      shift
      break
      ;;
    -*)
      echo "Error: unknown option '$1'" >&2
      usage >&2
      exit 1
      ;;
    *)
      break
      ;;
  esac
done

PRIVATE_KEY_FILE="${1:-${ROOT_DIR}/jwt-private.pem}"
PUBLIC_KEY_FILE="${2:-${ROOT_DIR}/jwt-public.pem}"
ENV_FILE="${3:-${ROOT_DIR}/.env}"
JWT_ISSUER_VALUE="${JWT_ISSUER_VALUE:-eventpro}"

if ! command -v openssl >/dev/null 2>&1; then
  echo "Error: openssl is required but not installed." >&2
  exit 1
fi

if [ ! -f "${PRIVATE_KEY_FILE}" ]; then
  if [ "${GENERATE_IF_MISSING}" = "true" ]; then
    echo "Private key not found. Generating ${PRIVATE_KEY_FILE}..."
    openssl genpkey -algorithm RSA -out "${PRIVATE_KEY_FILE}" -pkeyopt rsa_keygen_bits:2048 >/dev/null 2>&1
  else
    echo "Error: private key not found at ${PRIVATE_KEY_FILE}" >&2
    echo "Run with --generate-if-missing to create it." >&2
    exit 1
  fi
fi

touch "${ENV_FILE}"

upsert_env_var() {
  local key="$1"
  local value="$2"
  local env_file="$3"
  local tmp_file

  tmp_file="$(mktemp)"
  awk -v key="${key}" -v value="${value}" '
    BEGIN { found = 0 }
    $0 ~ "^" key "=" {
      print key "=" value
      found = 1
      next
    }
    { print }
    END {
      if (!found) {
        print key "=" value
      }
    }
  ' "${env_file}" > "${tmp_file}"
  mv "${tmp_file}" "${env_file}"
}

if [ ! -f "${PUBLIC_KEY_FILE}" ]; then
  if [ "${GENERATE_IF_MISSING}" = "true" ]; then
    echo "Public key not found. Generating ${PUBLIC_KEY_FILE}..."
    openssl rsa -in "${PRIVATE_KEY_FILE}" -pubout -out "${PUBLIC_KEY_FILE}" >/dev/null 2>&1
  else
    echo "Error: public key not found at ${PUBLIC_KEY_FILE}" >&2
    echo "Run with --generate-if-missing to create it." >&2
    exit 1
  fi
fi

echo "Encoding JWT keys for .env..."
JWT_PRIVATE_KEY="$(openssl pkcs8 -topk8 -inform PEM -outform DER -in "${PRIVATE_KEY_FILE}" -nocrypt | base64 | tr -d '\n')"
JWT_PUBLIC_KEY="$(openssl rsa -in "${PRIVATE_KEY_FILE}" -pubout -outform DER 2>/dev/null | base64 | tr -d '\n')"

upsert_env_var "JWT_PRIVATE_KEY" "${JWT_PRIVATE_KEY}" "${ENV_FILE}"
upsert_env_var "JWT_PUBLIC_KEY" "${JWT_PUBLIC_KEY}" "${ENV_FILE}"
upsert_env_var "JWT_ISSUER" "${JWT_ISSUER_VALUE}" "${ENV_FILE}"

echo "Done."
echo "Private key: ${PRIVATE_KEY_FILE}"
echo "Public key:  ${PUBLIC_KEY_FILE}"
echo "Updated env: ${ENV_FILE}"

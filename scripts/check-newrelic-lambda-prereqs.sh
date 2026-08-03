#!/usr/bin/env bash
# Validate New Relic env for Java Lambda deploys: license key and account ID must
# both be set or both empty. Partial config causes silent telemetry drops (NR docs).
#
# Usage:
#   scripts/check-newrelic-lambda-prereqs.sh
#     Uses NEW_RELIC_LICENSE_KEY and NEW_RELIC_ACCOUNT_ID (or NEW_RELIC_TRUSTED_ACCOUNT_KEY).
#   scripts/check-newrelic-lambda-prereqs.sh --from-terraform-vars 'k=v,k2=v2'
#     Parses new_relic_license_key and new_relic_account_id from a comma-separated list
#     (GitHub Actions "variables" input format).

set -euo pipefail

die() {
  echo "check-newrelic-lambda-prereqs: $*" >&2
  exit 1
}

license="${NEW_RELIC_LICENSE_KEY:-}"
account="${NEW_RELIC_ACCOUNT_ID:-${NEW_RELIC_TRUSTED_ACCOUNT_KEY:-}}"

if [ -z "${license}" ] && [ -n "${NEWRELIC_LICENSE_KEY:-}" ]; then
  license="${NEWRELIC_LICENSE_KEY}"
fi

parse_tf_vars_csv() {
  local csv="$1"
  local pair key val
  while IFS= read -r pair; do
    [ -z "${pair}" ] && continue
    key="${pair%%=*}"
    val="${pair#*=}"
    if [ "${key}" = "${pair}" ]; then
      continue
    fi
    case "${key}" in
      new_relic_license_key) license="${val}" ;;
      new_relic_account_id) account="${val}" ;;
    esac
  done < <(printf '%s' "${csv}" | tr ',' '\n')
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    --from-terraform-vars)
      [ -n "${2:-}" ] || die "--from-terraform-vars requires a value"
      parse_tf_vars_csv "$2"
      shift 2
      ;;
    -h | --help)
      sed -n '1,20p' "$0"
      exit 0
      ;;
    *)
      die "unknown argument: $1"
      ;;
  esac
done

# Trim accidental whitespace / newlines (GitHub Actions inputs)
license="${license//$'\r'/}"
license="${license//$'\n'/}"
license="${license//[[:space:]]/}"
account="${account//$'\r'/}"
account="${account//$'\n'/}"
account="${account//[[:space:]]/}"

has_license=0
has_account=0
[ -n "${license}" ] && has_license=1
[ -n "${account}" ] && has_account=1

if ((has_license && !has_account)); then
  die "NEW_RELIC_LICENSE_KEY is set but NEW_RELIC_ACCOUNT_ID is empty. Set both from the same New Relic account or unset both to disable Lambda APM."
fi

if ((has_account && !has_license)); then
  die "NEW_RELIC_ACCOUNT_ID is set but NEW_RELIC_LICENSE_KEY is empty. Partial New Relic config breaks Lambda telemetry; set both or unset both."
fi

if ((has_license && has_account)); then
  if ! [[ "${account}" =~ ^[0-9]+$ ]]; then
    die "NEW_RELIC_ACCOUNT_ID must be numeric (your New Relic account ID)."
  fi
  echo "check-newrelic-lambda-prereqs: OK (New Relic Lambda APM enabled, account_id=${account})"
else
  echo "check-newrelic-lambda-prereqs: OK (New Relic Lambda APM disabled — no license/account in env)"
fi

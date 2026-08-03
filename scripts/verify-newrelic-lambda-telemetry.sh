#!/usr/bin/env bash
# Post-deploy checks: confirm AWS Lambda image command, required env keys, and NR tag
# for EventPro Java Lambdas. Does not print secret values.
#
# Usage:
#   AWS_REGION=us-east-1 WORKSPACE=dev ./scripts/verify-newrelic-lambda-telemetry.sh
#
# Requires: aws CLI, jq (optional but recommended for JSON parsing)

set -euo pipefail

die() {
  echo "verify-newrelic-lambda-telemetry: $*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

WORKSPACE="${WORKSPACE:-${TF_WORKSPACE:-dev}}"
AWS_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-east-1}}"
export AWS_REGION

require_cmd aws
if command -v jq >/dev/null 2>&1; then
  HAVE_JQ=1
else
  HAVE_JQ=0
  echo "verify-newrelic-lambda-telemetry: warning: jq not found; using minimal checks" >&2
fi

EXPECTED_CMD='["com.newrelic.java.HandlerWrapper::handleStreamsRequest"]'
EXPECTED_HANDLER="org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest"

check_one() {
  local fn="$1"
  local cfg fn_doc tags cmd env_json nr_mode lic vpc_subnets state last_update image_uri err_file

  echo "--- ${fn} ---"

  err_file="$(mktemp)"
  if ! cfg="$(aws lambda get-function-configuration --function-name "${fn}" --output json 2>"${err_file}")"; then
    echo "  ERROR: could not read Lambda configuration (wrong region/workspace or function missing?)" >&2
    sed 's/^/  AWS: /' "${err_file}" >&2
    rm -f "${err_file}"
    return 1
  fi
  rm -f "${err_file}"

  if ((HAVE_JQ)); then
    fn_doc="$(aws lambda get-function --function-name "${fn}" --output json)"
    env_json="$(echo "${cfg}" | jq '.Environment.Variables // {}')"
    lic="$(echo "${env_json}" | jq -r '.NEW_RELIC_LICENSE_KEY // empty')"
    state="$(echo "${cfg}" | jq -r '.State // empty')"
    last_update="$(echo "${cfg}" | jq -r '.LastUpdateStatus // empty')"
    image_uri="$(echo "${fn_doc}" | jq -r '.Code.ImageUri // empty')"
    vpc_subnets="$(echo "${cfg}" | jq -r '(.VpcConfig.SubnetIds // []) | join(",")')"

    echo "  State: ${state:-"(unknown)"}"
    echo "  LastUpdateStatus: ${last_update:-"(unknown)"}"
    echo "  ImageUri: ${image_uri:-"(unknown)"}"
    if [ -n "${vpc_subnets}" ]; then
      echo "  VPC: attached (${vpc_subnets})"
      echo "  WARN: VPC-attached Lambdas need NAT or equivalent outbound egress for New Relic telemetry, SQS, and Secrets Manager." >&2
    else
      echo "  VPC: not attached"
    fi

    cmd="$(echo "${cfg}" | jq -c '.ImageConfigResponse.ImageConfig.Command // empty')"
    if [ -z "${lic}" ]; then
      echo "  New Relic: disabled (no NEW_RELIC_LICENSE_KEY on function)"
      if [ "${cmd}" != "null" ] && [ -n "${cmd}" ]; then
        echo "  ImageConfig.Command: ${cmd}"
      else
        echo "  ImageConfig.Command: (empty — Dockerfile CMD)"
      fi
      return 0
    fi

    if [ "${cmd}" = "null" ] || [ -z "${cmd}" ]; then
      echo "  ImageConfig.Command: (empty — using Dockerfile CMD)"
      echo "  WARN: with New Relic enabled, image command should be ${EXPECTED_CMD}" >&2
    else
      echo "  ImageConfig.Command: ${cmd}"
      if [ "${cmd}" != "${EXPECTED_CMD}" ]; then
        echo "  WARN: expected New Relic wrapper: ${EXPECTED_CMD}" >&2
      fi
    fi

    for key in AWS_LAMBDA_EXEC_WRAPPER NEW_RELIC_LAMBDA_HANDLER NEW_RELIC_LICENSE_KEY \
      NEW_RELIC_ACCOUNT_ID NEW_RELIC_TRUSTED_ACCOUNT_KEY NEW_RELIC_APM_LAMBDA_MODE; do
      val="$(echo "${env_json}" | jq -r --arg k "$key" '.[$k] // empty')"
      if [ -z "${val}" ]; then
        echo "  ${key}: (missing)"
      elif [ "${key}" = "NEW_RELIC_LICENSE_KEY" ]; then
        echo "  ${key}: (set, redacted)"
      else
        echo "  ${key}: ${val}"
      fi
    done

    lh="$(echo "${env_json}" | jq -r '.NEW_RELIC_LAMBDA_HANDLER // empty')"
    if [ -n "${lh}" ] && [ "${lh}" != "${EXPECTED_HANDLER}" ]; then
      echo "  WARN: NEW_RELIC_LAMBDA_HANDLER should be ${EXPECTED_HANDLER}" >&2
    fi

    tags="$(aws lambda list-tags --resource "$(echo "${cfg}" | jq -r '.FunctionArn')" --output json)"
    nr_mode="$(echo "${tags}" | jq -r '.Tags["NR.Apm.Lambda.Mode"] // empty')"
    echo "  Tag NR.Apm.Lambda.Mode: ${nr_mode:-"(missing)"}"
    if [ "${nr_mode}" != "true" ]; then
      echo "  WARN: tag NR.Apm.Lambda.Mode should be true when New Relic is enabled" >&2
    fi
  else
    echo "${cfg}" | head -c 400
    echo "..."
  fi
}

failed=0
for suffix in order-processor payment-processor notification-sender; do
  check_one "${WORKSPACE}-${suffix}" || failed=1
done

echo ""
echo "Telemetry smoke (manual):"
echo "  1. Publish a test message to each SQS queue so every Lambda invokes at least once."
echo "  2. CloudWatch Logs: search log streams for 'NR_EXT', 'NewRelic', or 'newrelic'."
echo "  3. New Relic NRQL (after traffic):"
echo "       FROM AwsLambdaInvocation SELECT count(*) SINCE 30 minutes ago FACET aws.lambda.eventSource"
echo "     Or list functions: Infrastructure > AWS > Lambda functions (ensure single AWS account link per NR account)."
echo ""

exit "${failed}"

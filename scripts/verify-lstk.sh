#!/usr/bin/env bash
# Fail-fast end-to-end verification for the complete LocalStack Pro deployment.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env.lstk"
WORKSPACE_NAME="${WORKSPACE:-lstk}"
LOCALSTACK_ENDPOINT="http://localhost:4566"

while [ $# -gt 0 ]; do
  case "$1" in
    --env-file)
      [ $# -ge 2 ] || { echo "Missing value for --env-file" >&2; exit 1; }
      ENV_FILE="$2"
      shift 2
      ;;
    --workspace)
      [ $# -ge 2 ] || { echo "Missing value for --workspace" >&2; exit 1; }
      WORKSPACE_NAME="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: scripts/verify-lstk.sh [--env-file FILE] [--workspace NAME]"
      exit 0
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
done

[ -f "$ENV_FILE" ] || { echo "Missing LocalStack env file: $ENV_FILE" >&2; exit 1; }
set -a
# shellcheck disable=SC1090
. "$ENV_FILE"
set +a

unset AWS_PROFILE AWS_SESSION_TOKEN AWS_SECURITY_TOKEN
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_ACCOUNT_ID=000000000000
export AWS_REGION=us-east-1
export AWS_DEFAULT_REGION=us-east-1
export AWS_EC2_METADATA_DISABLED=true
export AWS_ENDPOINT_URL="$LOCALSTACK_ENDPOINT"

API_URL="https://${WORKSPACE_NAME}-api.localhost.localstack.cloud"
APP_URL="https://${WORKSPACE_NAME}-app.localhost.localstack.cloud"
CLUSTER_NAME="${WORKSPACE_NAME}-cluster"
SERVICE_NAME="${WORKSPACE_NAME}-eventpro-api"
SMOKE_FILE="$(mktemp)"
SMOKE_DOWNLOAD="$(mktemp)"
LAMBDA_OUTPUT="$(mktemp)"
SMOKE_KEY="events/lstk-smoke-$(date +%s).txt"
SMOKE_BUCKET=""

cleanup() {
  if [ -n "$SMOKE_BUCKET" ]; then
    aws_lstk s3api delete-object --bucket "$SMOKE_BUCKET" --key "$SMOKE_KEY" >/dev/null 2>&1 || true
  fi
  rm -f "$SMOKE_FILE" "$SMOKE_DOWNLOAD" "$LAMBDA_OUTPUT"
}
trap cleanup EXIT

log() { printf '\n==> %s\n' "$*"; }
fail() { printf 'Verification failed: %s\n' "$*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "$1 is required"; }
aws_lstk() { aws --endpoint-url="$LOCALSTACK_ENDPOINT" "$@"; }
tf_output() { terraform -chdir="$ROOT_DIR/$1" output -raw "$2"; }

retry() {
  local description="$1" attempts="$2" delay="$3"
  shift 3
  local _
  for _ in $(seq 1 "$attempts"); do
    if "$@"; then return 0; fi
    sleep "$delay"
  done
  fail "$description did not become ready after $((attempts * delay)) seconds"
}

api_health_up() {
  curl -ksS --http1.1 --max-time 20 "$API_URL/actuator/health" | jq -e '.status == "UP"' >/dev/null
}

ecs_stable() {
  local status desired running
  read -r status desired running < <(aws_lstk ecs describe-services \
    --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" \
    --query 'services[0].[status,desiredCount,runningCount]' --output text 2>/dev/null || true)
  [ "$status" = "ACTIVE" ] && [ -n "$desired" ] && [ "$desired" -gt 0 ] && [ "$running" -eq "$desired" ]
}

targets_healthy() {
  local target_group_arn states
  target_group_arn="$(aws_lstk elbv2 describe-target-groups --names "${WORKSPACE_NAME}-api-primary" \
    --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null || true)"
  [ -n "$target_group_arn" ] && [ "$target_group_arn" != "None" ] || return 1
  states="$(aws_lstk elbv2 describe-target-health --target-group-arn "$target_group_arn" \
    --query 'TargetHealthDescriptions[].TargetHealth.State' --output text 2>/dev/null || true)"
  [ -n "$states" ] && ! grep -Eq '(^|[[:space:]])(unhealthy|initial|draining|unused|unavailable)([[:space:]]|$)' <<<"$states"
}

cloudfront_ready() {
  curl -ksS --http1.1 --max-time 20 "$APP_URL/" -o "$SMOKE_FILE" && grep -q '<div id="root"' "$SMOKE_FILE"
}

notification_processed() {
  local message_id="$1"
  aws_lstk logs filter-log-events \
    --log-group-name "/aws/lambda/${WORKSPACE_NAME}-notification-sender" \
    --filter-pattern "$message_id" \
    --query 'length(events)' --output text 2>/dev/null | grep -Eq '^[1-9][0-9]*$'
}

for command in aws curl docker jq terraform uuidgen; do require_cmd "$command"; done

log "LocalStack Pro health and identity"
account_id="$(aws_lstk sts get-caller-identity --query Account --output text)"
[ "$account_id" = "000000000000" ] || fail "unexpected LocalStack account: $account_id"
health_json="$(curl -fsS "$LOCALSTACK_ENDPOINT/_localstack/health")"
jq -e '([.services.s3, .services.ecs, .services.lambda] | all(. == "available" or . == "running"))' \
  <<<"$health_json" >/dev/null || fail "required LocalStack services are not available"
info_json="$(curl -fsS "$LOCALSTACK_ENDPOINT/_localstack/info" 2>/dev/null || printf '{}')"
edition="$(jq -r '.edition // empty' <<<"$info_json")"
edition_lower="$(printf '%s' "$edition" | tr '[:upper:]' '[:lower:]')"
[ -z "$edition" ] || [ "$edition_lower" = "pro" ] || fail "LocalStack Pro is not active (edition=$edition)"
license_active="$(jq -r '.is_license_activated // .license.activated // empty' <<<"$info_json")"
[ "$license_active" != "false" ] || fail "LocalStack Pro license is not activated"

log "Terraform outputs and Local ECR images"
terraform -chdir="$ROOT_DIR/backend/shared-infra" workspace show | grep -qx "$WORKSPACE_NAME" || fail "shared workspace mismatch"
repositories_json="$(terraform -chdir="$ROOT_DIR/backend/shared-infra" output -json local_ecr_repository_urls)"
for repository in eventpro-api eventpro-order-processor eventpro-payment-processor eventpro-notification-sender; do
  jq -e --arg repository "$repository" '.[$repository] | length > 0' <<<"$repositories_json" >/dev/null || fail "missing ECR output: $repository"
  # list-images avoids LocalStack's DescribeImages timestamp sorting path, which
  # can fail after persisted and newly pushed images have mixed timestamp forms.
  aws_lstk ecr list-images --repository-name "$repository" --query 'length(imageIds)' --output text | grep -Eq '^[1-9][0-9]*$' || \
    fail "no ECR image found for $repository"
done

log "ECS service and load balancer targets"
retry "ECS service" 60 5 ecs_stable
retry "ALB targets" 60 5 targets_healthy

log "API, database, and SQS health"
retry "API health" 90 5 api_health_up
events_json="$(curl -ksS --http1.1 --max-time 20 "$API_URL/api/v1/events?page=0&size=1")"
jq -e '.success == true' <<<"$events_json" >/dev/null || fail "database-backed events request failed"
health_json="$(curl -ksS --http1.1 --max-time 20 "$API_URL/actuator/health")"
jq -e '.status == "UP"' <<<"$health_json" >/dev/null || fail "API health is not UP"
if jq -e '.components.sqs' <<<"$health_json" >/dev/null 2>&1; then
  jq -e '.components.sqs.status == "UP"' <<<"$health_json" >/dev/null || fail "API SQS health is not UP"
fi

log "S3 internal access, API proxy, and CORS"
SMOKE_BUCKET="$(tf_output backend/shared-infra s3_images_bucket_id)"
printf 'eventpro-localstack-smoke\n' > "$SMOKE_FILE"
aws_lstk s3api put-object --bucket "$SMOKE_BUCKET" --key "$SMOKE_KEY" --body "$SMOKE_FILE" --content-type text/plain >/dev/null
aws_lstk s3api get-object --bucket "$SMOKE_BUCKET" --key "$SMOKE_KEY" "$SMOKE_DOWNLOAD" >/dev/null
downloaded="$(cat "$SMOKE_DOWNLOAD")"
[ "$downloaded" = "eventpro-localstack-smoke" ] || fail "S3 round trip returned unexpected content"
proxied="$(curl -ksS --http1.1 --max-time 20 "$API_URL/api/v1/images/proxy?key=$SMOKE_KEY")"
[ "$proxied" = "eventpro-localstack-smoke" ] || fail "API could not proxy an S3 object"
if ! s3_cors="$(aws_lstk s3api get-bucket-cors --bucket "$SMOKE_BUCKET" --output json 2>/dev/null)"; then
  fail "could not read S3 CORS configuration for $SMOKE_BUCKET"
fi
jq -e . <<<"$s3_cors" >/dev/null 2>&1 || fail "S3 CORS response was not valid JSON"
jq -e --arg origin "$APP_URL" '.CORSRules[].AllowedOrigins[] | select(. == $origin)' <<<"$s3_cors" >/dev/null || fail "frontend origin is absent from S3 CORS"

log "CloudFront index, assets, and SPA fallback"
retry "CloudFront frontend" 60 5 cloudfront_ready
assets=()
while IFS= read -r asset; do
  assets+=("$asset")
done < <(grep -oE '/assets/[^" ]+\.(js|css)' "$SMOKE_FILE" | sort -u)
[ "${#assets[@]}" -ge 2 ] || fail "frontend index did not reference JavaScript and CSS assets"
for asset in "${assets[@]}"; do
  curl -ksSf --http1.1 --max-time 20 "$APP_URL$asset" >/dev/null || fail "CloudFront asset failed: $asset"
done
curl -ksSf --http1.1 --max-time 20 "$APP_URL/events/localstack-smoke-route" | grep -q '<div id="root"' || fail "CloudFront SPA fallback failed"

log "Lambda state, event mappings, cold starts, and disabled New Relic"
for lambda in order-processor payment-processor notification-sender; do
  function_name="${WORKSPACE_NAME}-${lambda}"
  state="$(aws_lstk lambda get-function-configuration --function-name "$function_name" --query State --output text)"
  [ "$state" = "Active" ] || fail "$function_name is not Active (state=$state)"
  mapping_state="$(aws_lstk lambda list-event-source-mappings --function-name "$function_name" --query 'EventSourceMappings[0].State' --output text)"
  if [ "$lambda" = "notification-sender" ]; then
    [ "$mapping_state" = "Enabled" ] || fail "$function_name event mapping is not Enabled"
  else
    [ "$mapping_state" = "Disabled" ] || fail "$function_name legacy event mapping must remain Disabled to prevent duplicate fulfillment"
  fi
  function_error="$(aws_lstk lambda invoke --function-name "$function_name" \
    --cli-binary-format raw-in-base64-out --payload '{"Records":[]}' "$LAMBDA_OUTPUT" \
    --query FunctionError --output text)"
  [ "$function_error" = "None" ] || [ -z "$function_error" ] || fail "$function_name cold-start invocation failed: $function_error"
  env_json="$(aws_lstk lambda get-function-configuration --function-name "$function_name" --query 'Environment.Variables' --output json)"
  jq -e 'to_entries | all(.key | startswith("NEW_RELIC_") | not)' <<<"$env_json" >/dev/null || fail "$function_name has active New Relic environment variables"
done

task_definition="$(aws_lstk ecs describe-services --cluster "$CLUSTER_NAME" --services "$SERVICE_NAME" --query 'services[0].taskDefinition' --output text)"
task_env="$(aws_lstk ecs describe-task-definition --task-definition "$task_definition" --query 'taskDefinition.containerDefinitions[0].environment' --output json)"
jq -e 'any(.name == "NEW_RELIC_AGENT_ENABLED" and .value == "false") and all(.name != "NEW_RELIC_LICENSE_KEY")' \
  <<<"$task_env" >/dev/null || fail "ECS New Relic configuration is not disabled"

log "Harmless IN_APP notification through SQS"
notification_queue="$(tf_output backend/shared-infra notification_queue_url)"
notification_id="$(uuidgen | tr '[:upper:]' '[:lower:]')"
notification_body="$(jq -nc --arg id "$notification_id" '{messageId:$id,messageType:"SYSTEM_ANNOUNCEMENT",timestamp:"2026-08-01T00:00:00",source:"lstk-verifier",payload:{userId:$id,deliveryTypes:["IN_APP"],templateData:{message:"LocalStack verification"}}}')"
aws_lstk sqs send-message --queue-url "$notification_queue" --message-body "$notification_body" >/dev/null
retry "notification Lambda processing" 30 4 notification_processed "$notification_id"

log "LocalStack Pro deployment verification passed"
printf 'Frontend: %s\nAPI: %s\n' "$APP_URL" "$API_URL"

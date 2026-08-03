#!/usr/bin/env bash
# Complete LocalStack Pro deployment for the production-shaped Terraform stacks.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE=".env.lstk"
COMPOSE_FILE="docker-compose.lstk.yml"
WORKSPACE_ARG=""
ACTION="plan"
ONLY="all"
START_LOCALSTACK=false
START_ONLY=false
INIT_ONLY=false
VERIFY_ONLY=false
VERIFY_AFTER=false
PRINT_ENDPOINTS_ONLY=false
BOOTSTRAP_STATE_ONLY=false
BOOTSTRAP_ROUTE53_ONLY=false
BUILD_IMAGES=true
FRONTEND_SYNC=true
FRONTEND_INVALIDATE=true

# Preserve explicitly supplied test credentials across the LocalStack env-file
# load. This lets callers source a protected env file without copying secrets
# into .env.lstk.
INHERITED_STRIPE_SECRET_KEY="${STRIPE_SECRET_KEY:-}"
INHERITED_STRIPE_PUBLISHABLE_KEY="${STRIPE_PUBLISHABLE_KEY:-}"
INHERITED_STRIPE_WEBHOOK_SECRET="${STRIPE_WEBHOOK_SECRET:-}"

STATE_BUCKET="eventpro-site-state"
AWS_REGION_LOCAL="us-east-1"
LOCALSTACK_ENDPOINT="http://localhost:4566"
LOCALSTACK_RUNTIME_ENDPOINT="http://localhost.localstack.cloud:4566"
IMAGE_TAG="${IMAGE_TAG:-}"
LOCAL_ECR_REGISTRY=""
LOCAL_ECR_REPOSITORIES_JSON=""
RUNTIME_TFVARS_FILE=""
RUNTIME_TFVARS_FILES=()

cleanup_runtime_tfvars() {
  local file
  for file in "${RUNTIME_TFVARS_FILES[@]:-}"; do
    [ -n "$file" ] && rm -f "$file"
  done
  return 0
}

trap cleanup_runtime_tfvars EXIT

usage() {
  cat <<'EOF'
Usage: scripts/lstk-deploy.sh [options]

Modes:
  --init                     Create missing local config/JWT keys and bootstrap LocalStack
  --plan                     Run Terraform plan (default; never builds or pushes images)
  --apply                    Apply the selected stacks
  --destroy                  Destroy existing selected Terraform workspaces
  --verify                   Run end-to-end LocalStack verification only

Options:
  --only TARGET              all|shared-infra|services|frontend|lambdas|order-processor|payment-processor|notification-sender
  --env-file FILE            LocalStack env file (default: .env.lstk)
  --compose-file FILE        Compose file (default: docker-compose.lstk.yml)
  --workspace NAME           Terraform workspace (default: WORKSPACE env or lstk)
  --start                    Start LocalStack before the requested action
  --start-only               Start LocalStack and exit
  --verify-after             Verify automatically after a successful apply
  --bootstrap-state          Create the emulated state bucket and exit
  --bootstrap-route53        Create the emulated hosted zone and exit
  --print-endpoints          Print application endpoints and exit
  --skip-build-images        Apply Terraform without rebuilding images
  --no-frontend-sync         Skip frontend S3 sync after apply
  --no-frontend-invalidate   Skip CloudFront invalidation after apply
  -h, --help                 Show this help
EOF
}

log() { printf '%s\n' "$*"; }
warn() { printf 'Warning: %s\n' "$*" >&2; }
die() { printf 'Error: %s\n' "$*" >&2; exit 1; }
require_cmd() { command -v "$1" >/dev/null 2>&1 || die "$1 is required"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --init) INIT_ONLY=true; shift ;;
    --plan) ACTION="plan"; shift ;;
    --apply) ACTION="apply"; shift ;;
    --destroy) ACTION="destroy"; shift ;;
    --verify) VERIFY_ONLY=true; shift ;;
    --only) [ $# -ge 2 ] || die "Missing value for --only"; ONLY="$2"; shift 2 ;;
    --env-file) [ $# -ge 2 ] || die "Missing value for --env-file"; ENV_FILE="$2"; shift 2 ;;
    --compose-file) [ $# -ge 2 ] || die "Missing value for --compose-file"; COMPOSE_FILE="$2"; shift 2 ;;
    --workspace) [ $# -ge 2 ] || die "Missing value for --workspace"; WORKSPACE_ARG="$2"; shift 2 ;;
    --start) START_LOCALSTACK=true; shift ;;
    --start-only) START_LOCALSTACK=true; START_ONLY=true; shift ;;
    --verify-after) VERIFY_AFTER=true; shift ;;
    --bootstrap-state) BOOTSTRAP_STATE_ONLY=true; shift ;;
    --bootstrap-route53) BOOTSTRAP_ROUTE53_ONLY=true; shift ;;
    --print-endpoints) PRINT_ENDPOINTS_ONLY=true; shift ;;
    --skip-build-images) BUILD_IMAGES=false; shift ;;
    --no-frontend-sync) FRONTEND_SYNC=false; shift ;;
    --no-frontend-invalidate) FRONTEND_INVALIDATE=false; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "Unknown option: $1" ;;
  esac
done

case "$ONLY" in
  all|shared-infra|services|frontend|lambdas|order-processor|payment-processor|notification-sender) ;;
  *) die "Unsupported --only target: $ONLY" ;;
esac

absolute_from_root() {
  case "$1" in
    /*) printf '%s' "$1" ;;
    *) printf '%s/%s' "$ROOT_DIR" "$1" ;;
  esac
}

ENV_FILE_PATH="$(absolute_from_root "$ENV_FILE")"
COMPOSE_FILE_PATH="$(absolute_from_root "$COMPOSE_FILE")"

initialize_local_config() {
  local example_file="$ROOT_DIR/.env.lstk.example"
  if [ ! -f "$ENV_FILE_PATH" ]; then
    [ -f "$example_file" ] || die "Missing template: $example_file"
    cp "$example_file" "$ENV_FILE_PATH"
    log "Created $ENV_FILE_PATH from the sanitized example."
  fi

  local exported_token="${LOCALSTACK_AUTH_TOKEN:-}"
  set -a
  # shellcheck disable=SC1090
  . "$ENV_FILE_PATH"
  set +a
  if [ -n "$exported_token" ]; then
    export LOCALSTACK_AUTH_TOKEN="$exported_token"
  fi

  if [ -z "${JWT_PUBLIC_KEY:-}" ] || [ -z "${JWT_PRIVATE_KEY:-}" ]; then
    "$ROOT_DIR/scripts/jwt-script.sh" --generate-if-missing \
      "$ROOT_DIR/jwt-lstk-private.pem" \
      "$ROOT_DIR/jwt-lstk-public.pem" \
      "$ENV_FILE_PATH"
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE_PATH"
    set +a
    if [ -n "$exported_token" ]; then
      export LOCALSTACK_AUTH_TOKEN="$exported_token"
    fi
  fi
}

if [ "$INIT_ONLY" = true ]; then
  initialize_local_config
fi

[ -f "$ENV_FILE_PATH" ] || die "$ENV_FILE_PATH is missing; run 'make lstk-init' first"
[ -f "$COMPOSE_FILE_PATH" ] || die "$COMPOSE_FILE_PATH is required"

SHELL_LOCALSTACK_AUTH_TOKEN="${LOCALSTACK_AUTH_TOKEN:-}"
set -a
# shellcheck disable=SC1090
. "$ENV_FILE_PATH"
set +a
if [ -n "$SHELL_LOCALSTACK_AUTH_TOKEN" ]; then
  export LOCALSTACK_AUTH_TOKEN="$SHELL_LOCALSTACK_AUTH_TOKEN"
fi
if [ -n "$INHERITED_STRIPE_SECRET_KEY" ]; then
  export STRIPE_SECRET_KEY="$INHERITED_STRIPE_SECRET_KEY"
fi
if [ -n "$INHERITED_STRIPE_PUBLISHABLE_KEY" ]; then
  export STRIPE_PUBLISHABLE_KEY="$INHERITED_STRIPE_PUBLISHABLE_KEY"
fi
if [ -n "$INHERITED_STRIPE_WEBHOOK_SECRET" ]; then
  export STRIPE_WEBHOOK_SECRET="$INHERITED_STRIPE_WEBHOOK_SECRET"
fi

validate_localstack_stripe() {
  case "${STRIPE_SECRET_KEY:-}" in
    sk_live_*) die "LocalStack refuses live-mode Stripe secret keys" ;;
    sk_test_local|"") die "A usable sk_test_* STRIPE_SECRET_KEY is required for this LocalStack apply" ;;
    sk_test_*) ;;
    *) die "LocalStack STRIPE_SECRET_KEY must use Stripe test mode (sk_test_*)" ;;
  esac
  case "${STRIPE_PUBLISHABLE_KEY:-}" in
    pk_live_*) die "LocalStack refuses live-mode Stripe publishable keys" ;;
    pk_test_local|"") die "A usable pk_test_* STRIPE_PUBLISHABLE_KEY is required for this LocalStack apply" ;;
    pk_test_*) ;;
    *) die "LocalStack STRIPE_PUBLISHABLE_KEY must use Stripe test mode (pk_test_*)" ;;
  esac
  case "${STRIPE_WEBHOOK_SECRET:-}" in
    whsec_test_local|""|*REPLACE_ME*)
      warn "Stripe webhook signing is not configured; direct test payments work, but forwarded Stripe webhook delivery will remain unavailable"
      export STRIPE_WEBHOOK_SECRET="whsec_test_local"
      ;;
    whsec_*) ;;
    *)
      warn "Ignoring an invalid Stripe webhook signing value for LocalStack"
      export STRIPE_WEBHOOK_SECRET="whsec_test_local"
      ;;
  esac
}

case "$ONLY:$ACTION" in
  all:apply|services:apply|frontend:apply|payment-processor:apply) validate_localstack_stripe ;;
esac

WORKSPACE_NAME="${WORKSPACE_ARG:-${WORKSPACE:-lstk}}"
[ "$WORKSPACE_NAME" = "lstk" ] || warn "Complete LocalStack deployments normally use workspace 'lstk' (received '$WORKSPACE_NAME')."
DOMAIN_NAME="localhost.localstack.cloud"
STATE_BUCKET="${TF_STATE_BUCKET:-$STATE_BUCKET}"
IMAGE_TAG="${IMAGE_TAG:-lstk-$(date -u +%Y%m%d%H%M%S)-$(git -C "$ROOT_DIR" rev-parse --short=12 HEAD 2>/dev/null || printf 'nogit')}"

# Never inherit real AWS identity or live third-party integration values.
unset AWS_PROFILE AWS_SESSION_TOKEN AWS_SECURITY_TOKEN
export AWS_ACCESS_KEY_ID="test"
export AWS_SECRET_ACCESS_KEY="test"
export AWS_ACCOUNT_ID="000000000000"
export AWS_DEFAULT_REGION="$AWS_REGION_LOCAL"
export AWS_REGION="$AWS_REGION_LOCAL"
export AWS_EC2_METADATA_DISABLED="true"
export AWS_ENDPOINT_URL="$LOCALSTACK_ENDPOINT"

export TF_VAR_domain_name="$DOMAIN_NAME"
export TF_VAR_aws_region="$AWS_REGION_LOCAL"
export TF_VAR_use_localstack="true"
export TF_VAR_localstack_endpoint="$LOCALSTACK_ENDPOINT"
export TF_VAR_localstack_runtime_endpoint="$LOCALSTACK_RUNTIME_ENDPOINT"
export TF_VAR_jwt_issuer="${JWT_ISSUER:-eventpro}"
export TF_VAR_jwt_access_ttl_seconds="${JWT_ACCESS_TTL_SECONDS:-3600}"
export TF_VAR_jwt_public_key="${JWT_PUBLIC_KEY:-}"
export TF_VAR_jwt_private_key="${JWT_PRIVATE_KEY:-}"
export TF_VAR_stripe_secret_key="${STRIPE_SECRET_KEY:-sk_test_local}"
export TF_VAR_stripe_publishable_key="${STRIPE_PUBLISHABLE_KEY:-pk_test_local}"
export TF_VAR_stripe_webhook_secret="${STRIPE_WEBHOOK_SECRET:-whsec_test_local}"
export TF_VAR_ses_sender_email="noreply@eventpro.local"
export TF_VAR_new_relic_license_key=""
export TF_VAR_new_relic_account_id=""

aws_lstk() { aws --endpoint-url="$LOCALSTACK_ENDPOINT" "$@"; }
compose_lstk() { docker compose --env-file "$ENV_FILE_PATH" -f "$COMPOSE_FILE_PATH" "$@"; }

start_localstack() {
  require_cmd docker
  [ -n "${LOCALSTACK_AUTH_TOKEN:-}" ] || die "LOCALSTACK_AUTH_TOKEN must be exported in the shell"
  log "Starting LocalStack Pro..."
  compose_lstk up -d localstack
}

check_localstack() {
  require_cmd aws
  require_cmd docker
  local _
  for _ in $(seq 1 60); do
    if aws_lstk sts get-caller-identity --query Account --output text 2>/dev/null | grep -qx '000000000000'; then
      return 0
    fi
    sleep 2
  done
  compose_lstk logs --tail=100 localstack >&2 || true
  die "LocalStack did not become ready at $LOCALSTACK_ENDPOINT"
}

state_bucket_exists() {
  aws_lstk s3api head-bucket --bucket "$STATE_BUCKET" >/dev/null 2>&1
}

bootstrap_state_bucket() {
  if ! state_bucket_exists; then
    log "Creating LocalStack Terraform state bucket: s3://$STATE_BUCKET"
    aws_lstk s3 mb "s3://$STATE_BUCKET" >/dev/null
  fi
}

bootstrap_route53_zone() {
  local zone_id
  zone_id="$(aws_lstk route53 list-hosted-zones-by-name \
    --dns-name "$DOMAIN_NAME" \
    --query "HostedZones[?Name=='${DOMAIN_NAME}.'].Id | [0]" \
    --output text)"
  if [ -z "$zone_id" ] || [ "$zone_id" = "None" ]; then
    log "Creating LocalStack Route53 hosted zone: $DOMAIN_NAME"
    aws_lstk route53 create-hosted-zone \
      --name "$DOMAIN_NAME" \
      --caller-reference "eventpro-lstk-${DOMAIN_NAME}-$(date +%s)" >/dev/null
  fi
}

terraform_init() {
  terraform -chdir="$ROOT_DIR/$1" init -input=false -reconfigure -backend-config=backend.lstk.tfbackend >/dev/null
}

select_workspace_for_action() {
  local stack_dir="$1"
  if [ "$ACTION" = "destroy" ]; then
    terraform -chdir="$ROOT_DIR/$stack_dir" workspace select "$WORKSPACE_NAME" >/dev/null 2>&1
  else
    terraform -chdir="$ROOT_DIR/$stack_dir" workspace select -or-create "$WORKSPACE_NAME" >/dev/null
  fi
}

terraform_output_json() {
  terraform -chdir="$ROOT_DIR/$1" output -json "$2" 2>/dev/null
}

stack_output_available() {
  terraform_output_json "$1" "$2" >/dev/null 2>&1
}

default_repo_for_stack() {
  case "$1" in
    backend/services/terraform) printf 'eventpro-api' ;;
    backend/lambdas/order-processor/terraform) printf 'eventpro-order-processor' ;;
    backend/lambdas/payment-processor/terraform) printf 'eventpro-payment-processor' ;;
    backend/lambdas/notification-sender/terraform) printf 'eventpro-notification-sender' ;;
    *) return 1 ;;
  esac
}

configure_image_vars_from_state() {
  local stack_dir="$1" image_json repo
  repo="$(default_repo_for_stack "$stack_dir" 2>/dev/null || true)"
  [ -n "$repo" ] || return 0

  image_json="$(terraform_output_json "$stack_dir" deployed_image || true)"
  if [ -n "$image_json" ]; then
    export TF_VAR_image_registry TF_VAR_image_name TF_VAR_image_tag
    TF_VAR_image_registry="$(jq -r '.registry' <<<"$image_json")"
    TF_VAR_image_name="$(jq -r '.name' <<<"$image_json")"
    TF_VAR_image_tag="$(jq -r '.tag' <<<"$image_json")"
  elif [ -n "$LOCAL_ECR_REGISTRY" ]; then
    export TF_VAR_image_registry="$LOCAL_ECR_REGISTRY"
    export TF_VAR_image_name="$repo"
    export TF_VAR_image_tag="lstk-plan"
  fi
}

write_localstack_runtime_tfvars() {
  local stack_dir="$1" file temp_file
  RUNTIME_TFVARS_FILE=""
  case "$stack_dir" in
    backend/services/terraform|backend/lambdas/order-processor/terraform|backend/lambdas/payment-processor/terraform|backend/lambdas/notification-sender/terraform) ;;
    *) return 1 ;;
  esac

  require_cmd jq
  temp_file="$(mktemp "${TMPDIR:-/tmp}/eventpro-lstk-runtime.XXXXXX")"
  file="${temp_file}.tfvars.json"
  mv "$temp_file" "$file"
  chmod 600 "$file"
  RUNTIME_TFVARS_FILES+=("$file")
  RUNTIME_TFVARS_FILE="$file"

  case "$stack_dir" in
    backend/services/terraform)
      jq -n \
        --arg image_registry "${TF_VAR_image_registry:?LocalStack image registry is not configured}" \
        --arg image_name "${TF_VAR_image_name:?LocalStack image name is not configured}" \
        --arg image_tag "${TF_VAR_image_tag:?LocalStack image tag is not configured}" \
        --arg jwt_issuer "$TF_VAR_jwt_issuer" \
        --argjson jwt_access_ttl_seconds "$TF_VAR_jwt_access_ttl_seconds" \
        --arg jwt_public_key "$TF_VAR_jwt_public_key" \
        --arg jwt_private_key "$TF_VAR_jwt_private_key" \
        '{
          image_registry: $image_registry,
          image_name: $image_name,
          image_tag: $image_tag,
          stripe_secret_key: env.TF_VAR_stripe_secret_key,
          stripe_publishable_key: env.TF_VAR_stripe_publishable_key,
          stripe_webhook_secret: env.TF_VAR_stripe_webhook_secret,
          stripe_price_pro_monthly: "price_local_pro_monthly",
          stripe_price_pro_yearly: "price_local_pro_yearly",
          stripe_price_enterprise_monthly: "price_local_enterprise_monthly",
          stripe_price_enterprise_yearly: "price_local_enterprise_yearly",
          jwt_issuer: $jwt_issuer,
          jwt_access_ttl_seconds: $jwt_access_ttl_seconds,
          jwt_public_key: $jwt_public_key,
          jwt_private_key: $jwt_private_key,
          new_relic_license_key: ""
        }' >"$file"
      ;;
    backend/lambdas/order-processor/terraform)
      jq -n \
        --arg image_registry "${TF_VAR_image_registry:?LocalStack image registry is not configured}" \
        --arg image_name "${TF_VAR_image_name:?LocalStack image name is not configured}" \
        --arg image_tag "${TF_VAR_image_tag:?LocalStack image tag is not configured}" \
        '{image_registry: $image_registry, image_name: $image_name, image_tag: $image_tag,
          new_relic_license_key: "", new_relic_account_id: ""}' >"$file"
      ;;
    backend/lambdas/payment-processor/terraform)
      jq -n \
        --arg image_registry "${TF_VAR_image_registry:?LocalStack image registry is not configured}" \
        --arg image_name "${TF_VAR_image_name:?LocalStack image name is not configured}" \
        --arg image_tag "${TF_VAR_image_tag:?LocalStack image tag is not configured}" \
        '{image_registry: $image_registry, image_name: $image_name, image_tag: $image_tag,
          stripe_secret_key: env.TF_VAR_stripe_secret_key, new_relic_license_key: "", new_relic_account_id: ""}' >"$file"
      ;;
    backend/lambdas/notification-sender/terraform)
      jq -n \
        --arg image_registry "${TF_VAR_image_registry:?LocalStack image registry is not configured}" \
        --arg image_name "${TF_VAR_image_name:?LocalStack image name is not configured}" \
        --arg image_tag "${TF_VAR_image_tag:?LocalStack image tag is not configured}" \
        '{image_registry: $image_registry, image_name: $image_name, image_tag: $image_tag,
          ses_sender_email: "noreply@eventpro.local", new_relic_license_key: "", new_relic_account_id: ""}' >"$file"
      ;;
  esac
}

run_terraform_stack() {
  local stack_dir="$1" runtime_tfvars=""
  local -a var_args
  require_cmd terraform
  log "Terraform $ACTION: $stack_dir (workspace=$WORKSPACE_NAME)"
  terraform_init "$stack_dir"
  if ! select_workspace_for_action "$stack_dir"; then
    if [ "$ACTION" = "destroy" ]; then
      log "Skipping $stack_dir: workspace '$WORKSPACE_NAME' does not exist."
      return 0
    fi
    die "Unable to select workspace '$WORKSPACE_NAME' for $stack_dir"
  fi

  if [ "$ACTION" != "apply" ]; then
    configure_image_vars_from_state "$stack_dir"
  fi

  var_args=(-var-file=terraform.lstk.tfvars)
  if write_localstack_runtime_tfvars "$stack_dir"; then
    runtime_tfvars="$RUNTIME_TFVARS_FILE"
    var_args+=("-var-file=$runtime_tfvars")
  fi

  case "$ACTION" in
    apply)
      terraform -chdir="$ROOT_DIR/$stack_dir" apply -input=false -auto-approve "${var_args[@]}"
      ;;
    destroy)
      if ! stack_output_available "$stack_dir" deployed_image && [ "$stack_dir" != "backend/shared-infra" ] && [ "$stack_dir" != "eventpro-frontend/terraform" ]; then
        log "Skipping $stack_dir: no applied state was found."
        return 0
      fi
      terraform -chdir="$ROOT_DIR/$stack_dir" destroy -input=false -auto-approve "${var_args[@]}"
      ;;
    plan)
      terraform -chdir="$ROOT_DIR/$stack_dir" plan -input=false "${var_args[@]}"
      ;;
  esac
}

require_shared_state() {
  terraform_init backend/shared-infra
  terraform -chdir="$ROOT_DIR/backend/shared-infra" workspace select "$WORKSPACE_NAME" >/dev/null 2>&1 || \
    die "Shared LocalStack state is missing; run 'make lstk-deploy' or apply shared-infra first"
  stack_output_available backend/shared-infra local_ecr_repository_urls || \
    die "Shared LocalStack infrastructure is not applied; run 'make lstk-deploy' first"
}

resolve_local_ecr() {
  require_cmd jq
  require_shared_state
  LOCAL_ECR_REGISTRY="$(terraform -chdir="$ROOT_DIR/backend/shared-infra" output -raw local_ecr_registry)"
  LOCAL_ECR_REPOSITORIES_JSON="$(terraform_output_json backend/shared-infra local_ecr_repository_urls)"
  [ -n "$LOCAL_ECR_REGISTRY" ] && [ "$LOCAL_ECR_REGISTRY" != "null" ] || die "LocalStack ECR registry output is empty"
}

repository_url() {
  local repository="$1" url
  url="$(jq -r --arg repository "$repository" '.[$repository] // empty' <<<"$LOCAL_ECR_REPOSITORIES_JSON")"
  [ -n "$url" ] || die "LocalStack ECR repository is missing: $repository"
  printf '%s' "$url"
}

login_local_ecr() {
  log "Logging in to LocalStack ECR: $LOCAL_ECR_REGISTRY"
  aws_lstk ecr get-login-password --region "$AWS_REGION_LOCAL" | \
    docker login --username AWS --password-stdin "$LOCAL_ECR_REGISTRY" >/dev/null
}

set_image_vars() {
  local repository="$1" tag="$2"
  export TF_VAR_image_registry="$LOCAL_ECR_REGISTRY"
  export TF_VAR_image_name="$repository"
  export TF_VAR_image_tag="$tag"
}

build_service_image() {
  [ "$BUILD_IMAGES" = true ] || return 0
  local repository="eventpro-api" image_ref platform
  image_ref="$(repository_url "$repository"):$IMAGE_TAG"
  platform="${SERVICES_IMAGE_PLATFORM:-linux/amd64}"
  log "Building API image: $image_ref ($platform)"
  docker buildx build --platform "$platform" --provenance=false --sbom=false --load \
    -f "$ROOT_DIR/backend/services/Dockerfile" -t "$image_ref" "$ROOT_DIR/backend"
  docker push "$image_ref"
}

build_lambda_images() {
  [ "$BUILD_IMAGES" = true ] || return 0
  local selection="$1"
  log "Building Lambda image selection '$selection' with tag $IMAGE_TAG"
  ECR_ENDPOINT_URL="$LOCALSTACK_ENDPOINT" \
    LAMBDA_IMAGE_PLATFORM="${LAMBDA_IMAGE_PLATFORM:-linux/amd64}" \
    LAMBDA_DOCKER_TARGET="runtime-plain" \
    "$ROOT_DIR/scripts/build-lambda-images.sh" \
      --lambda "$selection" \
      --tag "$IMAGE_TAG" \
      --registry "$LOCAL_ECR_REGISTRY" \
      --push \
      --no-latest-alias
}

build_frontend() {
  local api_url
  api_url="https://${WORKSPACE_NAME}-api.${DOMAIN_NAME}"
  log "Building frontend for $api_url with root-relative CloudFront assets"
  (
    cd "$ROOT_DIR"
    npm ci --workspace eventpro-frontend --include-workspace-root=false
    VITE_API_BASE_URL="$api_url" \
      VITE_ASSET_BASE_URL="/" \
      VITE_STRIPE_PUBLISHABLE_KEY="$TF_VAR_stripe_publishable_key" \
      npm run build --workspace eventpro-frontend
  )
}

sync_frontend() {
  [ "$FRONTEND_SYNC" = true ] || return 0
  local bucket_name
  bucket_name="$(terraform -chdir="$ROOT_DIR/eventpro-frontend/terraform" output -raw bucket_name)"
  log "Syncing frontend to s3://$bucket_name/"
  aws_lstk s3 sync "$ROOT_DIR/eventpro-frontend/dist/" "s3://$bucket_name/" \
    --delete \
    --exclude 'index.html' \
    --exclude 'assets/*'
  aws_lstk s3 sync "$ROOT_DIR/eventpro-frontend/dist/assets/" "s3://$bucket_name/assets/" \
    --delete \
    --cache-control 'public,max-age=31536000,immutable'
  aws_lstk s3 cp "$ROOT_DIR/eventpro-frontend/dist/index.html" "s3://$bucket_name/index.html" \
    --content-type 'text/html' \
    --cache-control 'no-cache,no-store,must-revalidate'
}

invalidate_frontend() {
  [ "$FRONTEND_INVALIDATE" = true ] || return 0
  local distribution_id
  distribution_id="$(terraform -chdir="$ROOT_DIR/eventpro-frontend/terraform" output -raw distribution_id)"
  log "Invalidating LocalStack CloudFront distribution $distribution_id"
  aws_lstk cloudfront create-invalidation --distribution-id "$distribution_id" --paths '/*' >/dev/null
}

apply_services() {
  set_image_vars eventpro-api "$IMAGE_TAG"
  build_service_image
  run_terraform_stack backend/services/terraform
}

apply_frontend() {
  build_frontend
  run_terraform_stack eventpro-frontend/terraform
  sync_frontend
  invalidate_frontend
}

apply_lambda_stack() {
  local lambda="$1"
  set_image_vars "eventpro-$lambda" "$IMAGE_TAG"
  run_terraform_stack "backend/lambdas/$lambda/terraform"
}

print_endpoints() {
  log "Frontend:   https://${WORKSPACE_NAME}-app.${DOMAIN_NAME}"
  log "API:        https://${WORKSPACE_NAME}-api.${DOMAIN_NAME}"
  log "API health: https://${WORKSPACE_NAME}-api.${DOMAIN_NAME}/actuator/health"
  log "LocalStack: $LOCALSTACK_ENDPOINT"
}

if [ "$START_LOCALSTACK" = true ] || [ "$INIT_ONLY" = true ]; then
  start_localstack
fi
if [ "$START_ONLY" = true ]; then exit 0; fi
if [ "$PRINT_ENDPOINTS_ONLY" = true ]; then print_endpoints; exit 0; fi

check_localstack

if [ "$VERIFY_ONLY" = true ]; then
  WORKSPACE="$WORKSPACE_NAME" "$ROOT_DIR/scripts/verify-lstk.sh" --env-file "$ENV_FILE_PATH"
  exit 0
fi

if [ "$BOOTSTRAP_STATE_ONLY" = true ]; then
  bootstrap_state_bucket
  exit 0
fi
if [ "$BOOTSTRAP_ROUTE53_ONLY" = true ]; then
  bootstrap_route53_zone
  exit 0
fi

if [ "$ACTION" = "destroy" ]; then
  if ! state_bucket_exists; then
    log "LocalStack state bucket does not exist; nothing to destroy."
    exit 0
  fi
else
  bootstrap_state_bucket
  bootstrap_route53_zone
fi
if [ "$INIT_ONLY" = true ]; then
  log "LocalStack configuration and bootstrap resources are ready."
  exit 0
fi

if [ "$ACTION" = "plan" ] && [ "$ONLY" = "all" ]; then
  run_terraform_stack backend/shared-infra
  if ! stack_output_available backend/shared-infra local_ecr_repository_urls; then
    log "Shared infrastructure has not been applied yet; downstream plans are intentionally skipped."
    log "Run 'make lstk-deploy' once, then 'make lstk-plan' will plan every stack."
    exit 0
  fi
  resolve_local_ecr
  run_terraform_stack backend/services/terraform
  run_terraform_stack eventpro-frontend/terraform
  run_terraform_stack backend/lambdas/order-processor/terraform
  run_terraform_stack backend/lambdas/payment-processor/terraform
  run_terraform_stack backend/lambdas/notification-sender/terraform
  exit 0
fi

case "$ONLY:$ACTION" in
  all:apply)
    run_terraform_stack backend/shared-infra
    resolve_local_ecr
    login_local_ecr
    apply_services
    apply_frontend
    build_lambda_images all
    apply_lambda_stack order-processor
    apply_lambda_stack payment-processor
    apply_lambda_stack notification-sender
    ;;
  all:destroy)
    run_terraform_stack backend/lambdas/notification-sender/terraform
    run_terraform_stack backend/lambdas/payment-processor/terraform
    run_terraform_stack backend/lambdas/order-processor/terraform
    run_terraform_stack eventpro-frontend/terraform
    run_terraform_stack backend/services/terraform
    run_terraform_stack backend/shared-infra
    ;;
  shared-infra:*) run_terraform_stack backend/shared-infra ;;
  services:apply)
    resolve_local_ecr; login_local_ecr; apply_services
    ;;
  services:*)
    [ "$ACTION" = "destroy" ] || resolve_local_ecr
    run_terraform_stack backend/services/terraform
    ;;
  frontend:apply)
    require_shared_state; apply_frontend
    ;;
  frontend:*) run_terraform_stack eventpro-frontend/terraform ;;
  lambdas:apply)
    resolve_local_ecr; login_local_ecr; build_lambda_images all
    apply_lambda_stack order-processor
    apply_lambda_stack payment-processor
    apply_lambda_stack notification-sender
    ;;
  lambdas:destroy)
    run_terraform_stack backend/lambdas/notification-sender/terraform
    run_terraform_stack backend/lambdas/payment-processor/terraform
    run_terraform_stack backend/lambdas/order-processor/terraform
    ;;
  lambdas:plan)
    resolve_local_ecr
    run_terraform_stack backend/lambdas/order-processor/terraform
    run_terraform_stack backend/lambdas/payment-processor/terraform
    run_terraform_stack backend/lambdas/notification-sender/terraform
    ;;
  order-processor:apply|payment-processor:apply|notification-sender:apply)
    lambda="${ONLY}"
    resolve_local_ecr; login_local_ecr; build_lambda_images "$lambda"; apply_lambda_stack "$lambda"
    ;;
  order-processor:*|payment-processor:*|notification-sender:*)
    [ "$ACTION" = "destroy" ] || resolve_local_ecr
    run_terraform_stack "backend/lambdas/$ONLY/terraform"
    ;;
  *) die "Unsupported action: $ONLY / $ACTION" ;;
esac

if [ "$ACTION" = "apply" ]; then
  print_endpoints
  if [ "$VERIFY_AFTER" = true ]; then
    WORKSPACE="$WORKSPACE_NAME" "$ROOT_DIR/scripts/verify-lstk.sh" --env-file "$ENV_FILE_PATH"
  fi
fi

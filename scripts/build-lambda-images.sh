#!/usr/bin/env bash
# Build and optionally push Lambda Docker images to ECR.
#
# Legacy usage (still supported):
#   ./scripts/build-lambda-images.sh [lambda-name] [version] [ecr-registry]
#
# Flag-based usage (recommended for automation):
#   ./scripts/build-lambda-images.sh --lambda order-processor --tag sha-abc123 --registry <acct>.dkr.ecr.us-east-1.amazonaws.com --push

set -euo pipefail

DEFAULT_LAMBDAS=(order-processor payment-processor notification-sender)
AWS_REGION="${AWS_REGION:-us-east-1}"
LAMBDA_IMAGE_PLATFORM="${LAMBDA_IMAGE_PLATFORM:-linux/amd64}"
LAMBDA_DOCKER_TARGET="${LAMBDA_DOCKER_TARGET:-runtime-newrelic}"

LAMBDA_NAME="all"
IMAGE_TAG="latest"
REGISTRY=""
PUSH_MODE="auto"     # auto|always|never
TAG_LATEST_ALIAS=true  # legacy-compatible default
OUTPUT_MODE="human"   # human|env
METADATA_FILE=""

EXTRA_TAGS=()
BUILT_LAMBDAS=()
ECR_LOGGED_IN=false

is_tty() {
  [ -t 1 ]
}

if is_tty; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

log() { printf '%b\n' "$*"; }
warn() { printf '%b\n' "${YELLOW}Warning:${NC} $*"; }
err() { printf '%b\n' "${RED}Error:${NC} $*" >&2; }

die() {
  err "$*"
  exit 1
}

usage() {
  cat <<USAGE
Usage:
  ./scripts/build-lambda-images.sh [lambda-name] [version] [ecr-registry]
  ./scripts/build-lambda-images.sh [options]

Options:
  -l, --lambda NAME        Lambda to build (all|order-processor|payment-processor|notification-sender)
  -t, --tag TAG            Primary image tag (default: latest)
      --version TAG        Alias for --tag
  -r, --registry HOST      Registry hostname (e.g. 123456789012.dkr.ecr.us-east-1.amazonaws.com)
      --push               Push built images to registry (requires --registry)
      --no-push            Build only (do not push)
      --extra-tag TAG      Additional image tag to apply/push (repeatable)
      --no-latest-alias    Do not auto-tag :latest when primary tag != latest
      --emit-env           Print machine-readable metadata (KEY=VALUE) after build
      --metadata-file PATH Write machine-readable metadata (KEY=VALUE) to file
  -h, --help               Show this help

Environment:
  AWS_REGION               AWS region for ECR login (default: us-east-1)
  AWS_ACCOUNT_ID           Used to infer --registry when not provided
  LAMBDA_IMAGE_PLATFORM    Docker platform for Lambda images (default: linux/amd64)
  LAMBDA_DOCKER_TARGET     Docker build target (default: runtime-newrelic; LocalStack uses runtime-plain)
  ECR_ENDPOINT_URL         Optional ECR API endpoint (for LocalStack)

Notes:
  - Docker build context is always 'backend/' (required by the Dockerfiles).
  - Lambda images are built as single-platform images with provenance/SBOM disabled.
  - In auto push mode, the script attempts ECR push when a registry is configured and AWS CLI is available.
USAGE
}

contains_lambda() {
  local target="$1"
  local lambda
  for lambda in "${DEFAULT_LAMBDAS[@]}"; do
    if [ "$lambda" = "$target" ]; then
      return 0
    fi
  done
  return 1
}

uppercase_slug() {
  echo "$1" | tr '[:lower:]-' '[:upper:]_'
}

parse_args() {
  # Backward-compatible positional form when first arg is not an option.
  if [ $# -gt 0 ] && [[ "$1" != -* ]]; then
    LAMBDA_NAME="${1:-all}"
    IMAGE_TAG="${2:-latest}"
    REGISTRY="${3:-}"
    return 0
  fi

  while [ $# -gt 0 ]; do
    case "$1" in
      -l|--lambda)
        [ $# -ge 2 ] || die "Missing value for $1"
        LAMBDA_NAME="$2"
        shift 2
        ;;
      -t|--tag|--version)
        [ $# -ge 2 ] || die "Missing value for $1"
        IMAGE_TAG="$2"
        shift 2
        ;;
      -r|--registry)
        [ $# -ge 2 ] || die "Missing value for $1"
        REGISTRY="$2"
        shift 2
        ;;
      --push)
        PUSH_MODE="always"
        shift
        ;;
      --no-push)
        PUSH_MODE="never"
        shift
        ;;
      --extra-tag)
        [ $# -ge 2 ] || die "Missing value for $1"
        EXTRA_TAGS+=("$2")
        shift 2
        ;;
      --no-latest-alias)
        TAG_LATEST_ALIAS=false
        shift
        ;;
      --emit-env)
        OUTPUT_MODE="env"
        shift
        ;;
      --metadata-file)
        [ $# -ge 2 ] || die "Missing value for $1"
        METADATA_FILE="$2"
        shift 2
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        die "Unknown option: $1"
        ;;
    esac
  done
}

resolve_registry() {
  if [ -n "$REGISTRY" ]; then
    return 0
  fi

  if [ -n "${AWS_ACCOUNT_ID:-}" ]; then
    REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
  fi
}

should_push() {
  case "$PUSH_MODE" in
    always)
      [ -n "$REGISTRY" ]
      return
      ;;
    never)
      return 1
      ;;
    auto)
      [ -n "$REGISTRY" ] || return 1
      command -v aws >/dev/null 2>&1 || return 1
      return 0
      ;;
    *)
      die "Unsupported push mode: $PUSH_MODE"
      ;;
  esac
}

login_ecr_once() {
  if [ "$ECR_LOGGED_IN" = true ]; then
    return 0
  fi

  command -v aws >/dev/null 2>&1 || die "AWS CLI is required to push images"

  log "${YELLOW}Logging in to ECR (${REGISTRY})...${NC}"
  local -a ecr_endpoint_args=()
  if [ -n "${ECR_ENDPOINT_URL:-}" ]; then
    ecr_endpoint_args+=(--endpoint-url "$ECR_ENDPOINT_URL")
  fi
  aws "${ecr_endpoint_args[@]}" ecr get-login-password --region "$AWS_REGION" | \
    docker login --username AWS --password-stdin "$REGISTRY" >/dev/null
  ECR_LOGGED_IN=true
}

build_one_lambda() {
  local lambda="$1"
  local image_name="eventpro-${lambda}"
  local dockerfile_path="backend/lambdas/${lambda}/Dockerfile"
  local build_context="backend"
  local primary_ref
  local registry_prefix=""
  local -a tags_to_apply=()
  local -a target_args=(--target "$LAMBDA_DOCKER_TARGET")
  local tag

  [ -f "$dockerfile_path" ] || die "Dockerfile not found: $dockerfile_path"

  if [ -n "$REGISTRY" ]; then
    registry_prefix="${REGISTRY}/"
  fi
  primary_ref="${registry_prefix}${image_name}:${IMAGE_TAG}"
  log "${GREEN}Building ${lambda} Lambda...${NC}"
  log "${YELLOW}docker buildx build --platform ${LAMBDA_IMAGE_PLATFORM} ${target_args[*]} --provenance=false --sbom=false --load -f ${dockerfile_path} -t ${primary_ref} ${build_context}${NC}"
  docker buildx build \
    --platform "$LAMBDA_IMAGE_PLATFORM" \
    "${target_args[@]}" \
    --provenance=false \
    --sbom=false \
    --load \
    -f "$dockerfile_path" \
    -t "$primary_ref" \
    "$build_context"

  # With `set -u`, "${EXTRA_TAGS[@]}" can error when the array is empty on some Bash versions.
  tags_to_apply=()
  if [ "${#EXTRA_TAGS[@]}" -gt 0 ]; then
    tags_to_apply=("${EXTRA_TAGS[@]}")
  fi
  if [ "$TAG_LATEST_ALIAS" = true ] && [ "$IMAGE_TAG" != "latest" ]; then
    tags_to_apply+=("latest")
  fi
  if [ "${#tags_to_apply[@]}" -gt 1 ]; then
    local -a deduped_tags=()
    local candidate
    local i
    for candidate in "${tags_to_apply[@]}"; do
      [ -z "$candidate" ] && continue
      local seen=false
      # `set -u` + empty array: `for x in "${deduped_tags[@]}"` errors; use index loop instead.
      for ((i = 0; i < ${#deduped_tags[@]}; i++)); do
        tag="${deduped_tags[i]}"
        if [ "$tag" = "$candidate" ]; then
          seen=true
          break
        fi
      done
      if [ "$seen" = false ]; then
        deduped_tags+=("$candidate")
      fi
    done
    tags_to_apply=("${deduped_tags[@]}")
  fi

  # `set -u` + empty array: `for x in "${tags_to_apply[@]}"` errors; only iterate when non-empty.
  if [ "${#tags_to_apply[@]}" -gt 0 ]; then
    for tag in "${tags_to_apply[@]}"; do
      local extra_ref="${registry_prefix}${image_name}:${tag}"
      docker image tag "$primary_ref" "$extra_ref"
    done
  fi

  if should_push; then
    login_ecr_once
    log "${YELLOW}Pushing ${primary_ref}${NC}"
    docker image push "$primary_ref"

    if [ "${#tags_to_apply[@]}" -gt 0 ]; then
      for tag in "${tags_to_apply[@]}"; do
        local extra_ref="${registry_prefix}${image_name}:${tag}"
        log "${YELLOW}Pushing ${extra_ref}${NC}"
        docker image push "$extra_ref"
      done
    fi

    log "${GREEN}Pushed ${lambda} image(s) successfully.${NC}"
  else
    if [ -n "$REGISTRY" ] && [ "$PUSH_MODE" = "always" ]; then
      die "--push requires a valid registry and AWS CLI"
    fi
    if [ -n "$REGISTRY" ]; then
      warn "Built image(s) for registry tagging but did not push (push mode: ${PUSH_MODE})."
    else
      log "${GREEN}Built local image(s) for ${lambda}.${NC}"
    fi
  fi

  BUILT_LAMBDAS+=("$lambda")
}

write_metadata_lines() {
  local lambda="$1"
  local image_name="eventpro-${lambda}"
  local uri_prefix=""
  local suffix

  if [ -n "$REGISTRY" ]; then
    uri_prefix="${REGISTRY}/"
  fi
  suffix="$(uppercase_slug "$lambda")"

  cat <<META
${suffix}_IMAGE_REGISTRY=${REGISTRY}
${suffix}_IMAGE_NAME=${image_name}
${suffix}_IMAGE_TAG=${IMAGE_TAG}
${suffix}_IMAGE_URI=${uri_prefix}${image_name}:${IMAGE_TAG}
META
}

emit_metadata() {
  local output_dest="$1"
  local lambda

  for lambda in "${BUILT_LAMBDAS[@]}"; do
    write_metadata_lines "$lambda" >> "$output_dest"
  done
}

print_human_summary() {
  local lambda
  log ""
  log "${GREEN}Build Summary:${NC}"
  log "  Lambda selection: ${LAMBDA_NAME}"
  log "  Primary tag: ${IMAGE_TAG}"
  log "  Registry: ${REGISTRY:-<local>}"
  log "  Platform: ${LAMBDA_IMAGE_PLATFORM}"
  if [ ${#EXTRA_TAGS[@]} -gt 0 ]; then
    log "  Extra tags: ${EXTRA_TAGS[*]}"
  fi
  if [ "$TAG_LATEST_ALIAS" = true ] && [ "$IMAGE_TAG" != "latest" ]; then
    log "  Latest alias: enabled"
  fi

  for lambda in "${BUILT_LAMBDAS[@]}"; do
    local image_name="eventpro-${lambda}"
    local uri_prefix=""
    [ -n "$REGISTRY" ] && uri_prefix="${REGISTRY}/"
    log ""
    log "  ${lambda}:"
    log "    image_registry = \"${REGISTRY}\""
    log "    image_name     = \"${image_name}\""
    log "    image_tag      = \"${IMAGE_TAG}\""
    log "    image_uri      = \"${uri_prefix}${image_name}:${IMAGE_TAG}\""
  done
}

main() {
  parse_args "$@"
  resolve_registry

  if [ -z "$LAMBDA_NAME" ]; then
    die "Lambda name cannot be empty"
  fi

  if [ "$LAMBDA_NAME" != "all" ] && ! contains_lambda "$LAMBDA_NAME"; then
    die "Unsupported lambda: ${LAMBDA_NAME}"
  fi

  if [ "$PUSH_MODE" = "always" ] && [ -z "$REGISTRY" ]; then
    die "--push requires --registry (or AWS_ACCOUNT_ID to infer the registry)"
  fi

  if [ -n "$METADATA_FILE" ]; then
    : > "$METADATA_FILE"
  fi

  if [ "$LAMBDA_NAME" = "all" ]; then
    local lambda
    for lambda in "${DEFAULT_LAMBDAS[@]}"; do
      build_one_lambda "$lambda"
    done
  else
    build_one_lambda "$LAMBDA_NAME"
  fi

  if [ -n "$METADATA_FILE" ]; then
    emit_metadata "$METADATA_FILE"
  fi

  if [ "$OUTPUT_MODE" = "env" ]; then
    if [ -n "$METADATA_FILE" ]; then
      cat "$METADATA_FILE"
    else
      local tmp_file
      tmp_file="$(mktemp)"
      emit_metadata "$tmp_file"
      cat "$tmp_file"
      rm -f "$tmp_file"
    fi
  else
    print_human_summary
  fi
}

main "$@"

# Terraform Deployment Targets

The same six Terraform stacks support real AWS and a complete LocalStack Pro environment. Use the target-specific command families rather than manually mixing credentials, endpoints, backends, or variable files.

## Canonical commands

| Target | Plan | Deploy | Verify | Destroy |
|---|---|---|---|---|
| AWS | `make aws-plan` | `make aws-deploy` | `make aws-verify-csrf` | `make tf-destroy-all` |
| LocalStack Pro | `make lstk-plan` | `make lstk-deploy` | `make lstk-verify` | `make lstk-destroy` |

The stack order is:

```text
shared-infra
  -> API image in ECR -> services
  -> frontend
  -> Lambda images in ECR -> order -> payment -> notification
```

Destroy runs the reverse order and leaves the LocalStack state bucket and hosted zone in place.

## LocalStack Pro

Prerequisites are Docker, Terraform, AWS CLI, Node/npm, Java, `jq`, and a LocalStack Pro auth token. Keep the token in the shell:

```bash
export LOCALSTACK_AUTH_TOKEN=...
make lstk-init
make lstk-deploy
```

`lstk-init` creates `.env.lstk` from the sanitized example only when it is absent, generates ignored JWT keys only when needed, starts the pinned LocalStack image, and creates the emulated state bucket and Route53 zone. It never writes the auth token into the environment file.

LocalStack deployment guarantees:

- Workspace `lstk`, account `000000000000`, region `us-east-1`, and mock AWS credentials.
- Host Terraform endpoint `http://localhost:4566`.
- ECS/Lambda runtime endpoint `http://localhost.localstack.cloud:4566`.
- Browser-facing S3 endpoint `https://localhost.localstack.cloud:4566`.
- `backend.lstk.tfbackend` plus the committed sanitized `terraform.lstk.tfvars` for every stack.
- LocalStack-owned ECR repositories and `linux/amd64` API/Lambda images.
- New Relic disabled and non-live Stripe sentinel keys.

On a pristine environment, `make lstk-plan` can only plan shared infrastructure because downstream stacks consume shared remote-state outputs. After the first `make lstk-deploy`, it plans all six stacks and reuses the image coordinates recorded in state.

`make lstk-deploy` performs verification automatically. The verifier checks LocalStack activation, ECR images, ECS and ALB health, API/DB/SQS/JWT behavior, S3 and image proxy access, CloudFront assets and SPA fallback, CORS, Lambda cold starts/event mappings, a harmless IN_APP notification, and disabled New Relic configuration.

Browser requests pass through two CORS layers in LocalStack: the LocalStack
edge gateway and Spring Security. `EXTRA_CORS_ALLOWED_HEADERS` extends the edge
allowlist with `X-XSRF-TOKEN` and `X-Correlation-Id`; Spring independently
allows the complete browser contract (`Authorization`, `Content-Type`,
`X-Correlation-Id`, and `X-XSRF-TOKEN`). Do not add `X-EventPro-Client` or
`X-Api-Key` to browser CORS. After changing the edge settings, run
`make lstk-init` to recreate the LocalStack container without deleting its
persistent volume, followed by `make lstk-verify`.

After the first full deployment, use the scoped redeploy commands when only one
artifact changed. They preserve the other stacks and existing LocalStack data:

```bash
make lstk-redeploy-services
make lstk-redeploy-frontend
make lstk-redeploy-lambda-order
make lstk-redeploy-lambda-payment
make lstk-redeploy-lambda-notification
make lstk-redeploy-lambdas
```

Services and Lambda redeploys build and push a uniquely tagged image before
applying only that Terraform stack. The frontend redeploy rebuilds the Vite
bundle, applies only the frontend stack, syncs S3, and invalidates CloudFront.
Use `make lstk-verify` afterward when full end-to-end verification is required.

Lower-level granular Terraform commands remain available:

```bash
make lstk-tf-shared-infra LSTK_TF_ACTION=apply
make lstk-tf-services LSTK_TF_ACTION=apply
make lstk-tf-frontend LSTK_TF_ACTION=apply
make lstk-tf-lambdas LSTK_TF_ACTION=apply
```

They fail with an actionable message if shared state or Local ECR repositories are missing.

## Real AWS

Copy `.env.remote.example` to the ignored `.env.remote`, populate the intended account/domain/secrets, authenticate to AWS, and run:

```bash
make aws-plan TF_WORKSPACE=dev
make aws-deploy TF_WORKSPACE=dev
```

The AWS deployer:

- Clears `AWS_ENDPOINT_URL`, service-specific endpoint overrides, LocalStack variables, and `TF_VAR_localstack_*` values.
- Forces `TF_VAR_use_localstack=false`.
- Calls STS against real AWS and refuses account `000000000000`.
- Requires the caller account to match `AWS_ACCOUNT_ID` when it is configured.
- Runs `terraform init -reconfigure` for every stack without automatically upgrading providers.
- Passes secrets through a mode-`600` temporary tfvars JSON file rather than exposing them in process arguments.
- Does not build, push, sync, or invalidate anything in plan mode.

Existing granular `tf-deploy-*` targets use the same guarded deployment script.

### CSRF rollout and verification

CSRF enforcement defaults to enabled. `CSRF_ENABLED=false` is only a staged
rollout and emergency control; it does not relax the CORS origin or header
allowlists. For the initial client rollout, use the same API image for both
service deployments:

```bash
# 1. Publish /api/v1/csrf without enforcing it yet.
make tf-deploy-services TF_WORKSPACE=dev CSRF_ENABLED=false IMAGE_TAG=<release-tag>

# 2. Publish the CSRF-capable browser client and invalidate CloudFront.
make tf-deploy-frontend TF_WORKSPACE=dev

# 3. Enable enforcement using the same API image.
make tf-deploy-services TF_WORKSPACE=dev CSRF_ENABLED=true \
  SERVICES_IMAGE_SOURCE=existing IMAGE_TAG=<release-tag>

# 4. Run strict-TLS, non-destructive browser security checks.
make aws-verify-csrf TF_WORKSPACE=dev CSRF_ENABLED=true
```

Set `CSRF_SMOKE_EMAIL` and `CSRF_SMOKE_PASSWORD` in the invoking environment to
add successful login, token-rotation, and authenticated-read checks. Without
them, AWS verification remains account-independent and non-mutating. Never put
smoke credentials in a committed environment file. Repeat the ordered rollout
for production only after dev verification and a browser mutation smoke pass.
The Lambda stacks are unaffected and do not need redeployment.

## Switching safely

Terraform backend selection happens before normal variables are evaluated, so LocalStack needs both `backend.lstk.tfbackend` and `terraform.lstk.tfvars`. AWS uses the normal S3 backend and real environment values.

Both command families always use `terraform init -reconfigure`. If Terraform ever asks to migrate state while switching targets, stop: AWS and LocalStack state must remain separate.

Provider versions are captured in committed lockfiles for macOS ARM and Linux AMD/ARM. Upgrade them only as an explicit maintenance action with `terraform providers lock`, then validate all six stacks before committing.

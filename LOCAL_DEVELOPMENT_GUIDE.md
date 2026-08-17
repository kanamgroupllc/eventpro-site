# EventPro deployment guide

This repository supports two deployment paths:

1. A complete production-shaped deployment on LocalStack Pro.
2. A higher-environment AWS deployment initiated from this workstation.

The older hybrid Docker/local-infrastructure workflow is not covered here.

## Deployment boundaries

| Concern | LocalStack Pro | Higher AWS environment |
| --- | --- | --- |
| Script | `scripts/lstk-deploy.sh` | `scripts/pipeline-deploy.sh` |
| Make entrypoint | `make lstk-*` | `make aws-*` or `make tf-deploy-*` |
| Terraform workspace | `lstk` | `dev`, `staging`, or `prod` |
| Configuration | `.env.lstk` plus `.env.lstk.secrets` | `.env.remote` |
| AWS endpoints | LocalStack endpoints | Real AWS endpoints |
| Email default | Capture/log provider | Resend |
| Resend credential | Optional local emulated secret | Real AWS Secrets Manager ARN |

Never use `scripts/pipeline-deploy.sh` for LocalStack or `scripts/lstk-deploy.sh` for AWS. Both scripts run `terraform init -reconfigure` with their appropriate backend configuration.

## Complete LocalStack Pro deployment

### Prerequisites

- Docker with Buildx
- LocalStack Pro authentication token
- AWS CLI
- Terraform
- `jq`
- Node.js/npm
- Stripe test-mode API keys for paid checkout testing

LocalStack must be able to bind ports `443`, `4566`, and `4510-4559`.

### Configure LocalStack

Create the non-secret configuration on the first run:

```bash
cp .env.lstk.example .env.lstk
```

Keep test credentials in the ignored `.env.lstk.secrets` file:

```bash
STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_PUBLISHABLE_KEY=pk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me
```

Export the LocalStack Pro token in the shell. Do not put it in a tracked file:

```bash
export LOCALSTACK_AUTH_TOKEN=replace_me
```

The complete deployment uses `.env.lstk.secrets` when `LSTK_SECRET_ENV_FILE` is supplied:

```bash
make lstk-init LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-plan LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-deploy LSTK_SECRET_ENV_FILE=.env.lstk.secrets
```

`make lstk-init` creates missing JWT keys, starts LocalStack Pro, and bootstraps the emulated Terraform state bucket and Route53 hosted zone. `make lstk-deploy` then applies:

```text
shared-infra
  -> services
  -> frontend
  -> order-processor
  -> payment-processor
  -> notification-sender
```

Images are built for `linux/amd64`, pushed to LocalStack ECR, and deployed to LocalStack ECS/Lambda. The frontend is uploaded to LocalStack S3 and served through its CloudFront emulation.

### LocalStack ticket email behavior

The safe default is:

```env
EMAIL_PROVIDER=log
```

This still exercises the complete ticket-delivery pipeline:

- Stripe-confirmed checkout
- leased checkout outbox
- real ticket QR generation
- private PDF and order manifest storage in LocalStack S3
- notification SQS and DLQ
- notification Lambda manifest/attachment reads
- DynamoDB delivery ledger
- captured email output without contacting Resend

To perform an intentional real Resend smoke test from LocalStack Pro, export the key for one command:

```bash
EMAIL_PROVIDER=resend \
RESEND_API_KEY=replace_with_a_current_resend_key \
make lstk-redeploy-lambda-notification \
  LSTK_SECRET_ENV_FILE=.env.lstk.secrets
```

The deploy script stores the key in LocalStack's emulated Secrets Manager as JSON, retrieves the emulated ARN, and supplies only that ARN to the Lambda Terraform stack. The key is not written to Terraform variables or state. This mode sends real external email through Resend; use it only when intended.

The production AWS secret ARN is not used by LocalStack.

### Verify LocalStack

Run the complete smoke suite:

```bash
make lstk-verify
```

Print the application endpoints:

```bash
make lstk-endpoints
```

Expected endpoints:

```text
https://lstk-app.localhost.localstack.cloud
https://lstk-api.localhost.localstack.cloud
```

Use HTTP/1.1 for command-line health checks through the LocalStack TLS gateway:

```bash
curl -k --http1.1 \
  https://lstk-api.localhost.localstack.cloud/actuator/health
```

Inspect notification resources:

```bash
aws --endpoint-url=http://localhost:4566 sqs list-queues
aws --endpoint-url=http://localhost:4566 lambda get-function \
  --function-name lstk-notification-sender
aws --endpoint-url=http://localhost:4566 dynamodb list-tables
aws --endpoint-url=http://localhost:4566 logs tail \
  /aws/lambda/lstk-notification-sender --since 10m
```

For ticket acceptance, complete authenticated, guest, and multi-ticket purchases. Confirm that:

- Purchases shows the real authorized QR for each physical ticket.
- PDF download uses the authenticated API endpoint.
- `ticket-artifacts/tickets/.../ticket.pdf` and the order manifest exist in the private S3 bucket.
- One notification is processed for the order.
- The DynamoDB ledger contains one `SENT` item per email part.
- Failures retry individually and reach the notification DLQ after five receives.

### Scoped LocalStack redeploys

After the first complete deployment, rebuild only the changed component:

```bash
make lstk-redeploy-services LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-redeploy-frontend LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-redeploy-lambda-order LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-redeploy-lambda-payment LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-redeploy-lambda-notification LSTK_SECRET_ENV_FILE=.env.lstk.secrets
make lstk-redeploy-lambdas LSTK_SECRET_ENV_FILE=.env.lstk.secrets
```

These retain unrelated LocalStack resources and data.

### Stop, destroy, or rebuild LocalStack

```bash
make lstk-stop
make lstk-destroy
make lstk-redeploy LSTK_SECRET_ENV_FILE=.env.lstk.secrets
```

`make lstk-destroy` destroys Terraform-owned resources. `make lstk-redeploy` destroys, reapplies, and verifies the complete environment.

## Higher environment deployment from local

This path deploys to the authenticated real AWS account using `.env.remote` and `scripts/pipeline-deploy.sh`.

### Resend secret configuration

The notification Lambda does not receive `RESEND_API_KEY` directly. The current Resend key must be stored in the target AWS account's Secrets Manager as:

```json
{
  "apiKey": "replace_with_the_current_resend_key"
}
```

The resulting ARN is supplied as `RESEND_API_KEY_SECRET_ARN`.

Your GitHub Actions secret named `RESEND_API_KEY_SECRET_ARN` is used only by GitHub Actions. A deployment launched from this workstation cannot read GitHub secrets. Put the same ARN—not the API key—in the ignored local `.env.remote` file.

The current GitHub workflow does not consume a `RESEND_API_KEY` GitHub secret. It can be removed if no other workflow uses it.

### Configure `.env.remote`

```bash
cp .env.remote.example .env.remote
```

At minimum, configure the target and notification values:

```env
WORKSPACE=dev
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=123456789012
DOMAIN_NAME=abcham.com
RESEND_API_KEY_SECRET_ARN=arn:aws:secretsmanager:us-east-1:123456789012:secret:eventpro/resend-api-key-example
```

Also configure the existing Stripe, JWT, image, and monitoring values required for the selected stacks. AWS credentials should come from the active AWS profile/session rather than being stored in `.env.remote`.

The verified `mail.abcham.com` Resend DNS records are external prerequisites. These Terraform stacks do not recreate or import them.

Confirm the active identity before planning:

```bash
aws sts get-caller-identity
```

The returned account must match `AWS_ACCOUNT_ID`.

Confirm that the secret exists in the same account and region:

```bash
set -a
source .env.remote
set +a

aws secretsmanager describe-secret \
  --region "$AWS_REGION" \
  --secret-id "$RESEND_API_KEY_SECRET_ARN"
```

Do not print the secret value.

### Plan and deploy everything

```bash
make aws-plan TF_WORKSPACE=dev TF_ENV_FILE=.env.remote
make aws-deploy TF_WORKSPACE=dev TF_ENV_FILE=.env.remote
```

Or call the deployment script directly:

```bash
./scripts/pipeline-deploy.sh \
  --env-file .env.remote \
  --workspace dev \
  --plan

./scripts/pipeline-deploy.sh \
  --env-file .env.remote \
  --workspace dev \
  --apply
```

The dependency order is the same as LocalStack:

```text
shared-infra
  -> services
  -> frontend
  -> order-processor
  -> payment-processor
  -> notification-sender
```

The notification deployment fails before apply if `RESEND_API_KEY_SECRET_ARN` is missing. Terraform grants the Lambda permission to read only that secret and passes only the ARN as an environment variable.

### Scoped higher-environment deployments

Shared infrastructure must already exist for scoped service, frontend, or Lambda deployments.

```bash
make tf-deploy-shared-infra \
  TF_WORKSPACE=dev TF_ENV_FILE=.env.remote

make tf-deploy-services \
  TF_WORKSPACE=dev TF_ENV_FILE=.env.remote

make tf-deploy-frontend \
  TF_WORKSPACE=dev TF_ENV_FILE=.env.remote

make tf-deploy-lambda-notification \
  TF_WORKSPACE=dev TF_ENV_FILE=.env.remote

make tf-deploy-lambdas \
  TF_WORKSPACE=dev TF_ENV_FILE=.env.remote
```

Set `IMAGE_TAG` only when a specific container tag is required. Otherwise the deployment script derives one from the current Git commit.

### Verify AWS deployment

After deployment, inspect the Lambda configuration without retrieving the secret value:

```bash
aws lambda get-function-configuration \
  --function-name dev-notification-sender \
  --query '{State:State,LastUpdateStatus:LastUpdateStatus,Environment:Environment.Variables}'
```

The environment should contain `RESEND_API_KEY_SECRET_ARN`, `RESEND_FROM`, `RESEND_REPLY_TO`, `TICKET_ARTIFACTS_BUCKET`, and `DELIVERY_LEDGER_TABLE`. It must not contain `RESEND_API_KEY`.

Complete controlled authenticated, guest, and multi-ticket purchases and verify:

- Resend accepts the email from `Abcham <noreply@mail.abcham.com>`.
- Every physical ticket is attached as a PDF with its real QR.
- The delivery ledger stores the provider message ID without recipient PII.
- Successful SQS records are not retried when another record fails.
- Notification failures retry five times and remain in the DLQ.
- Paid orders remain successful when delivery is delayed or fails.

Monitor the notification DLQ and checkout outbox alarms after rollout.

## Credential rules

- Rotate any Resend key that has appeared in Git, Terraform values, logs, or shared shell history.
- Store the production key only in AWS Secrets Manager.
- Store only the production secret ARN in GitHub Actions and `.env.remote`.
- Keep LocalStack's default email provider set to `log`.
- Supply `RESEND_API_KEY` to LocalStack only for an intentional one-command live smoke test.
- Never add Resend DNS records to these Terraform stacks; `mail.abcham.com` is already verified.

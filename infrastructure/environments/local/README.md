# Terraform - Local Environment (LocalStack)

## Overview

This directory contains the Terraform configuration for provisioning AWS resources in **LocalStack** for local development of the EventPro Platform.

## Prerequisites

1. **LocalStack** must be running (via Docker Compose or standalone)
2. **Terraform 1.5+** installed
3. **AWS CLI** configured (credentials are ignored for LocalStack)

## LocalStack Setup

LocalStack is configured in the root `docker-compose.yml`. Ensure it's running:

```bash
# From project root
docker-compose up -d localstack

# Verify LocalStack is healthy
curl http://localhost:4566/_localstack/health
```

## Quick Start

1. **Initialize Terraform**:
   ```bash
   cd infrastructure/environments/local
   terraform init
   ```

2. **Plan** (optional, to see what will be created):
   ```bash
   terraform plan
   ```

3. **Apply** (provision resources in LocalStack):
   ```bash
   terraform apply
   ```

4. **View Outputs** (get resource URLs and IDs):
   ```bash
   terraform output
   ```

## Provisioned Resources

This configuration creates the following resources in LocalStack:

### SQS Queues
- `order-queue` - Order processing queue (with DLQ: `order-queue-dlq`)
- `payment-queue` - Payment processing queue (with DLQ: `payment-queue-dlq`)
- `notification-queue` - Notification sending queue (with DLQ: `notification-queue-dlq`)

### S3 Buckets
- `eventpro-images-local` - Event images storage (with CORS enabled for localhost)

### SES (Email)
- Verified sender identity: `noreply@eventpro.com` (for order confirmation and other emails)

### Secrets Manager
- `eventpro-db-secret` - Database credentials
- `eventpro-jwt-secret` - JWT signing key
- `eventpro-stripe-keys` - Stripe API keys (test values)

## Outputs

After applying, Terraform outputs include:

- SQS queue URLs
- S3 bucket name
- Secrets Manager ARNs

Use these values to configure your application:

```bash
# Get all outputs as environment variables
terraform output -json | jq -r 'to_entries[] | "export \(.key | ascii_upcase)=\(.value.value)"'
```

## Configuration

### Terraform Variables

**No variables are required** - all variables have defaults. The configuration works out of the box.

If you want to customize, you can create a `terraform.tfvars` file (see `terraform.tfvars.example`):

```hcl
# Optional: Override defaults
aws_region = "us-east-1"
environment = "local"
name_prefix = "eventpro-local"
```

### Environment Variables

The application should use these LocalStack endpoints:

- **SQS**: `http://localhost:4566`
- **S3**: `http://localhost:4566`
- **SES**: `http://localhost:4566`
- **Secrets Manager**: `http://localhost:4566`

### Application Configuration

Update `application-local.yml` with:

```yaml
aws:
  sqs:
    endpoint: http://localhost:4566
  s3:
    endpoint: http://localhost:4566
  secrets:
    manager:
      endpoint: http://localhost:4566
```

## Testing LocalStack Resources

### SQS
```bash
# Send a test message
aws --endpoint-url=http://localhost:4566 sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-queue \
  --message-body '{"test": "message"}'

# Receive messages
aws --endpoint-url=http://localhost:4566 sqs receive-message \
  --queue-url http://localhost:4566/000000000000/order-queue
```

### S3
```bash
# List buckets
aws --endpoint-url=http://localhost:4566 s3 ls

# Upload a file
aws --endpoint-url=http://localhost:4566 s3 cp test.jpg \
  s3://eventpro-images-local/

# List objects
aws --endpoint-url=http://localhost:4566 s3 ls s3://eventpro-images-local/
```

### Secrets Manager
```bash
# List secrets
aws --endpoint-url=http://localhost:4566 secretsmanager list-secrets

# Get secret value
aws --endpoint-url=http://localhost:4566 secretsmanager get-secret-value \
  --secret-id eventpro-db-secret
```

## Cleanup

To remove all resources:

```bash
terraform destroy
```

**Note**: LocalStack data persists in Docker volumes. To completely reset:

```bash
# Stop and remove LocalStack container
docker-compose down localstack

# Remove LocalStack volume
docker volume rm eventpro-site_localstack_data

# Restart LocalStack
docker-compose up -d localstack

# Re-apply Terraform
terraform apply
```

## Troubleshooting

### LocalStack Not Running
```bash
# Check if LocalStack is running
docker ps | grep localstack

# Check LocalStack logs
docker logs localstack

# Restart LocalStack
docker-compose restart localstack
```

### Terraform State Issues
If Terraform state becomes corrupted:

```bash
# Remove state file (will need to re-apply)
rm terraform.tfstate

# Re-initialize
terraform init

# Re-apply
terraform apply
```

### Resource Already Exists
If resources already exist in LocalStack:

```bash
# Import existing resources or destroy and recreate
terraform destroy
terraform apply
```

## Integration with Application

After provisioning, update your application environment:

1. **Backend** (`application-local.yml`):
   - Set `AWS_ENDPOINT_URL=http://localhost:4566`
   - Use outputs for queue URLs, bucket names, Cognito IDs

2. **Frontend** (`.env.local`):
   - Set `VITE_COGNITO_USER_POOL_ID` from Terraform output
   - Set `VITE_COGNITO_CLIENT_ID` from Terraform output
   - Set `VITE_S3_BUCKET_NAME=eventpro-images-local`

## Next Steps

1. Provision resources: `terraform apply`
2. Copy outputs to application configuration
3. Start backend with `SPRING_PROFILES_ACTIVE=local`
4. Start frontend with `.env.local` configured
5. Test the complete setup


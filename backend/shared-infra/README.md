# Shared Infrastructure

`backend/shared-infra` is the only upstream Terraform state for deployed EventPro component stacks.

Downstream stacks may read `shared-infra/terraform.tfstate` through `data.terraform_remote_state.shared_infra`, but they must not read each other's Terraform state.

## Owns

- RDS PostgreSQL, DB subnet group, DB parameter group, and RDS-managed master user secret.
- Order, payment, and notification SQS queues.
- Event-images S3 bucket.
- Default VPC/subnet data outputs used by ECS and lambdas.
- Shared ALB, application compute, and RDS security groups.
- Route53 hosted zone lookup.
- API/ALB ACM certificate and frontend/CloudFront ACM certificate.

## State Migration

This refactor moves resource ownership from `backend/services/terraform` to `backend/shared-infra`. Existing deployed resources must be moved between Terraform states before applying the new configuration. Do not apply the new stacks against an environment with existing services-owned resources until the state migration is complete.

Use the same Terraform workspace for both source and destination states. The resource addresses that moved are:

```text
aws_acm_certificate.alb
aws_acm_certificate.cloudfront
aws_acm_certificate_validation.alb
aws_acm_certificate_validation.cloudfront
aws_db_instance.main
aws_db_parameter_group.main
aws_db_subnet_group.main
aws_route53_record.alb_cert_validation
aws_route53_record.cloudfront_cert_validation
aws_s3_bucket.images
aws_s3_bucket_cors_configuration.images
aws_s3_bucket_public_access_block.images
aws_s3_bucket_server_side_encryption_configuration.images
aws_s3_bucket_versioning.images
aws_security_group.alb
aws_security_group.ecs -> aws_security_group.app
aws_security_group.rds
aws_sqs_queue.order
aws_sqs_queue.payment
aws_sqs_queue.notification
```

After migration:

- `backend/shared-infra` plan should not recreate RDS, queues, buckets, or certs.
- `backend/services/terraform` plan should not destroy those resources.
- Services, frontend, and lambda stacks should contain only `terraform_remote_state.shared_infra` data sources.

## LocalStack Variable Files

Each Terraform component stack keeps LocalStack-only variable values in `terraform.lstk.tfvars` and LocalStack S3 backend settings in `backend.lstk.tfbackend`.

Use both files explicitly when running the full AWS-emulation stacks locally:

```bash
terraform init -reconfigure -backend-config=backend.lstk.tfbackend
terraform plan -var-file=terraform.lstk.tfvars
terraform apply -var-file=terraform.lstk.tfvars
```

Do not put LocalStack values in the higher-environment `terraform.tfvars` files.

See `docs/TERRAFORM_DEPLOY_TARGETS.md` for the full AWS vs LocalStack Pro runbook.

# Frontend Terraform - Phase 2
# S3, CloudFront OAC, Route53 app record
# Uses terraform_remote_state for shared infra (Route53 zone and CloudFront certificate)

provider "aws" {
  region                      = var.aws_region
  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  s3_use_path_style           = var.use_localstack
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    cloudfront = var.use_localstack ? var.localstack_endpoint : null
    route53    = var.use_localstack ? var.localstack_endpoint : null
    s3         = var.use_localstack ? var.localstack_endpoint : null
    sts        = var.use_localstack ? var.localstack_endpoint : null
  }
}

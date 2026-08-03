# AWS provider - default region from backend/config

provider "aws" {
  region                      = var.aws_region
  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  s3_use_path_style           = var.use_localstack
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    applicationautoscaling = var.use_localstack ? var.localstack_endpoint : null
    cloudwatch             = var.use_localstack ? var.localstack_endpoint : null
    cloudwatchlogs         = var.use_localstack ? var.localstack_endpoint : null
    ec2                    = var.use_localstack ? var.localstack_endpoint : null
    ecs                    = var.use_localstack ? var.localstack_endpoint : null
    elasticloadbalancing   = var.use_localstack ? var.localstack_endpoint : null
    iam                    = var.use_localstack ? var.localstack_endpoint : null
    route53                = var.use_localstack ? var.localstack_endpoint : null
    s3                     = var.use_localstack ? var.localstack_endpoint : null
    secretsmanager         = var.use_localstack ? var.localstack_endpoint : null
    sqs                    = var.use_localstack ? var.localstack_endpoint : null
    sts                    = var.use_localstack ? var.localstack_endpoint : null
  }

  default_tags {
    tags = merge(var.tags, { Env = terraform.workspace })
  }
}

# CloudFront ACM certificates must be created in us-east-1.
provider "aws" {
  alias                       = "us_east_1"
  region                      = "us-east-1"
  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  s3_use_path_style           = var.use_localstack
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    sts = var.use_localstack ? var.localstack_endpoint : null
  }

  default_tags {
    tags = merge(var.tags, { Env = terraform.workspace })
  }
}

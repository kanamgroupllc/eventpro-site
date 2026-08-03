# Order-processor Lambda Terraform - Phase 3
# Lambda (container image), IAM, SQS event source mapping
# Uses terraform_remote_state from shared infra for DB/queue outputs

locals {
  workspace   = terraform.workspace
  name_prefix = local.workspace
  image_uri   = "${var.image_registry}/${var.image_name}:${var.image_tag}"
  common_tags = merge(var.tags, { Env = local.workspace })
  localstack_spring_application_json = jsonencode({
    spring = {
      jpa = {
        hibernate = {
          "ddl-auto" = "none"
        }
        properties = {
          "hibernate.boot.allow_jdbc_metadata_access" = "false"
          "hibernate.temp.use_jdbc_metadata_defaults" = "false"
        }
      }
    }
  })
  localstack_runtime_env = var.use_localstack ? {
    AWS_ACCESS_KEY_ID                                               = "test"
    AWS_SECRET_ACCESS_KEY                                           = "test"
    AWS_ENDPOINT_URL                                                = var.localstack_runtime_endpoint
    AWS_SECRETS_MANAGER_ENDPOINT                                    = var.localstack_runtime_endpoint
    SQS_ENDPOINT                                                    = var.localstack_runtime_endpoint
    SPRING_JPA_HIBERNATE_DDL_AUTO                                   = "none"
    SPRING_JPA_PROPERTIES_HIBERNATE_BOOT_ALLOW_JDBC_METADATA_ACCESS = "false"
    SPRING_APPLICATION_JSON                                         = local.localstack_spring_application_json
  } : {}
  new_relic_env = var.new_relic_license_key != "" ? {
    AWS_LAMBDA_EXEC_WRAPPER               = "/opt/newrelic-java-handler"
    NEW_RELIC_ACCOUNT_ID                  = var.new_relic_account_id
    NEW_RELIC_APM_LAMBDA_MODE             = "true"
    NEW_RELIC_APP_NAME                    = "eventpro-order-processor-${local.workspace}"
    NEW_RELIC_CLOUD_AWS_ACCOUNT_ID        = data.aws_caller_identity.current.account_id
    NEW_RELIC_DISTRIBUTED_TRACING_ENABLED = "true"
    NEW_RELIC_LAMBDA_HANDLER              = "org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest"
    NEW_RELIC_LABELS                      = "env:${local.workspace};service:eventpro-order-processor"
    NEW_RELIC_LICENSE_KEY                 = var.new_relic_license_key
    NEW_RELIC_LOG_LEVEL                   = "info"
    NEW_RELIC_TRUSTED_ACCOUNT_KEY         = var.new_relic_account_id
  } : {}

  shared_infra_remote_state_config = merge(
    {
      bucket = var.shared_infra_state_bucket
      key    = var.shared_infra_state_key
      region = var.shared_infra_state_region
    },
    jsondecode(var.use_localstack ? jsonencode({
      access_key                  = "test"
      secret_key                  = "test"
      skip_credentials_validation = true
      skip_metadata_api_check     = true
      skip_region_validation      = true
      skip_requesting_account_id  = true
      skip_s3_checksum            = true
      use_path_style              = true
      endpoints = {
        s3  = var.localstack_endpoint
        sts = var.localstack_endpoint
      }
    }) : "{}")
  )
}

data "aws_caller_identity" "current" {}

provider "aws" {
  region                      = var.aws_region
  access_key                  = var.use_localstack ? "test" : null
  secret_key                  = var.use_localstack ? "test" : null
  s3_use_path_style           = var.use_localstack
  skip_credentials_validation = var.use_localstack
  skip_metadata_api_check     = var.use_localstack
  skip_requesting_account_id  = var.use_localstack

  endpoints {
    cloudwatchlogs = var.use_localstack ? var.localstack_endpoint : null
    ec2            = var.use_localstack ? var.localstack_endpoint : null
    iam            = var.use_localstack ? var.localstack_endpoint : null
    lambda         = var.use_localstack ? var.localstack_endpoint : null
    secretsmanager = var.use_localstack ? var.localstack_endpoint : null
    sqs            = var.use_localstack ? var.localstack_endpoint : null
    sts            = var.use_localstack ? var.localstack_endpoint : null
  }
}

# Remote state from shared infra (DB, queues, VPC)
data "terraform_remote_state" "shared_infra" {
  backend   = "s3"
  workspace = terraform.workspace

  config = local.shared_infra_remote_state_config
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${local.name_prefix}-order-processor"
  retention_in_days = var.log_retention_in_days

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-order-processor-logs" })
}

# IAM Role for Lambda
resource "aws_iam_role" "lambda" {
  name = "${local.name_prefix}-order-processor-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-order-processor-lambda-role" })
}

# IAM Policy: SQS receive (order queue), send (payment queue)
resource "aws_iam_role_policy" "sqs" {
  name = "${local.name_prefix}-order-processor-sqs-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          data.terraform_remote_state.shared_infra.outputs.order_queue_arn,
          data.terraform_remote_state.shared_infra.outputs.payment_queue_arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["sqs:SendMessage"]
        Resource = data.terraform_remote_state.shared_infra.outputs.payment_queue_arn
      }
    ]
  })
}

# IAM Policy: VPC (ENI for RDS access)
resource "aws_iam_role_policy" "vpc" {
  name = "${local.name_prefix}-order-processor-vpc-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:CreateNetworkInterface",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DeleteNetworkInterface",
          "ec2:AssignPrivateIpAddresses",
          "ec2:UnassignPrivateIpAddresses"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy: CloudWatch Logs
resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "${local.name_prefix}-order-processor-logs-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents"
        ]
        Resource = "${aws_cloudwatch_log_group.lambda.arn}:*"
      }
    ]
  })
}

# IAM Policy: Secrets Manager (RDS credentials)
resource "aws_iam_role_policy" "secrets_manager" {
  name = "${local.name_prefix}-order-processor-secrets-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = data.terraform_remote_state.shared_infra.outputs.db_master_user_secret_arn
      }
    ]
  })
}

# Lambda Function (Spring Boot container image)
resource "aws_lambda_function" "order_processor" {
  function_name = "${local.name_prefix}-order-processor"
  description   = "Processes orders from SQS, validates them, reserves tickets, and publishes to payment queue"
  role          = aws_iam_role.lambda.arn
  timeout       = var.timeout_seconds
  memory_size   = var.memory_size_mb

  package_type  = "Image"
  image_uri     = local.image_uri
  architectures = [var.lambda_architecture]

  image_config {
    command = var.new_relic_license_key != "" ? ["com.newrelic.java.HandlerWrapper::handleStreamsRequest"] : ["org.springframework.cloud.function.adapter.aws.FunctionInvoker::handleRequest"]
  }

  environment {
    variables = merge({
      DB_HOST               = data.terraform_remote_state.shared_infra.outputs.rds_runtime_host
      DB_PORT               = tostring(data.terraform_remote_state.shared_infra.outputs.rds_port)
      DB_NAME               = data.terraform_remote_state.shared_infra.outputs.rds_name
      DB_SECRET_ARN         = data.terraform_remote_state.shared_infra.outputs.db_master_user_secret_arn
      SQS_PAYMENT_QUEUE_URL = data.terraform_remote_state.shared_infra.outputs.payment_queue_url
      # AWS_REGION is reserved; Lambda injects it automatically — do not set here.
      spring_cloud_function_definition = "processOrder"
    }, local.localstack_runtime_env, local.new_relic_env)
  }

  vpc_config {
    subnet_ids         = data.terraform_remote_state.shared_infra.outputs.lambda_subnet_ids
    security_group_ids = [data.terraform_remote_state.shared_infra.outputs.app_security_group_id]
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.cloudwatch_logs
  ]

  lifecycle {
    precondition {
      condition     = var.new_relic_license_key == "" || var.new_relic_account_id != ""
      error_message = "new_relic_account_id is required when new_relic_license_key is set for New Relic Lambda monitoring."
    }
  }

  tags = merge(
    local.common_tags,
    { Name = "${local.name_prefix}-order-processor" },
    var.new_relic_license_key != "" ? { "NR.Apm.Lambda.Mode" = "true" } : {}
  )
}

# SQS Event Source Mapping (order queue -> Lambda)
resource "aws_lambda_event_source_mapping" "order_queue" {
  event_source_arn = data.terraform_remote_state.shared_infra.outputs.order_queue_arn
  function_name    = aws_lambda_function.order_processor.arn
  # Checkout sessions are finalized synchronously by the API/webhook. Keep the legacy
  # function deployable while queues are drained, but prevent competing fulfillment.
  enabled = false

  batch_size                         = var.batch_size
  maximum_batching_window_in_seconds = 5

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-order-processor-event-source" })
}

output "deployed_image" {
  description = "Container image coordinates currently configured for the Lambda"
  value = {
    registry = var.image_registry
    name     = var.image_name
    tag      = var.image_tag
  }
}

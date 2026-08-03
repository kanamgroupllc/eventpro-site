# Lambda Payment Processor Module - Main Configuration
# This module creates a Lambda function for processing payments from SQS

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name_prefix}-payment-processor"
  retention_in_days = var.log_retention_in_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-payment-processor-logs"
    }
  )
}

# IAM Role for Lambda Execution
resource "aws_iam_role" "lambda" {
  name = "${var.name_prefix}-payment-processor-lambda-role"

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

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-payment-processor-lambda-role"
    }
  )
}

# IAM Policy for SQS Access
resource "aws_iam_role_policy" "sqs" {
  name = "${var.name_prefix}-payment-processor-sqs-policy"
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
          var.payment_queue_arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = var.notification_queue_arn
      }
    ]
  })
}

# IAM Policy for Secrets Manager (for RDS-managed database secret only)
# Stripe secrets are now passed as environment variables
resource "aws_iam_role_policy" "secrets_manager" {
  name = "${var.name_prefix}-payment-processor-secrets-policy"
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
        Resource = [
          var.database_secret_arn
        ]
      }
    ]
  })
}

# IAM Policy for RDS/VPC Access (if VPC is configured)
resource "aws_iam_role_policy" "vpc" {
  count = var.vpc_config != null ? 1 : 0
  name  = "${var.name_prefix}-payment-processor-vpc-policy"
  role  = aws_iam_role.lambda.id

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

# IAM Policy for CloudWatch Logs
resource "aws_iam_role_policy" "cloudwatch_logs" {
  name = "${var.name_prefix}-payment-processor-logs-policy"
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

# Lambda Function
resource "aws_lambda_function" "payment_processor" {
  function_name = "${var.name_prefix}-payment-processor"
  description   = "Processes payments from SQS, calls Stripe, updates orders/tickets, and publishes to notification queue"
  role          = aws_iam_role.lambda.arn
  handler       = "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"
  runtime       = "provided.al2"
  timeout       = var.timeout_seconds
  memory_size   = var.memory_size_mb

  # Container image
  package_type = "Image"
  image_uri    = var.lambda_image_uri

  # Environment variables
  environment {
    variables = {
      DB_HOST                    = var.database_host
      DB_PORT                    = tostring(var.database_port)
      DB_NAME                    = var.database_name
      DB_SECRET_ARN              = var.database_secret_arn
      STRIPE_SECRET_KEY          = var.stripe_secret_key != null ? var.stripe_secret_key : ""
      SQS_NOTIFICATION_QUEUE_URL = var.notification_queue_url
      # AWS_REGION is reserved; Lambda injects it — do not set here.
      QUARKUS_LOG_LEVEL = var.log_level
    }
  }

  # VPC Configuration (if provided)
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [var.vpc_config] : []
    content {
      subnet_ids         = vpc_config.value.subnet_ids
      security_group_ids = vpc_config.value.security_group_ids
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.cloudwatch_logs
  ]

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-payment-processor"
    }
  )
}

# SQS Event Source Mapping
resource "aws_lambda_event_source_mapping" "payment_queue" {
  event_source_arn = var.payment_queue_arn
  function_name    = aws_lambda_function.payment_processor.arn
  enabled          = var.enable_event_source_mapping

  batch_size                         = var.batch_size
  maximum_batching_window_in_seconds = var.maximum_batching_window_in_seconds
  maximum_record_age_in_seconds      = var.maximum_record_age_in_seconds
  bisect_batch_on_function_error     = var.bisect_batch_on_function_error
  maximum_retry_attempts             = var.maximum_retry_attempts

  function_response_types = var.function_response_types

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-payment-processor-event-source"
    }
  )
}


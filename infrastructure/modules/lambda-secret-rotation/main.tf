# Lambda Secret Rotation Module - Main Configuration
# This module creates a Lambda function for rotating database credentials in Secrets Manager

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.name_prefix}-secret-rotation"
  retention_in_days = var.log_retention_in_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-secret-rotation-logs"
    }
  )
}

# IAM Role for Lambda Execution
resource "aws_iam_role" "lambda" {
  name = "${var.name_prefix}-secret-rotation-lambda-role"

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
      Name = "${var.name_prefix}-secret-rotation-lambda-role"
    }
  )
}

# IAM Policy for Secrets Manager Access
resource "aws_iam_role_policy" "secrets_manager" {
  name = "${var.name_prefix}-secret-rotation-secrets-manager-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:PutSecretValue",
          "secretsmanager:DescribeSecret",
          "secretsmanager:UpdateSecretVersionStage"
        ]
        Resource = var.secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetRandomPassword"
        ]
        Resource = "*"
      }
    ]
  })
}

# IAM Policy for VPC Access (if VPC is configured)
resource "aws_iam_role_policy" "vpc" {
  count = var.vpc_config != null ? 1 : 0
  name  = "${var.name_prefix}-secret-rotation-vpc-policy"
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
  name = "${var.name_prefix}-secret-rotation-logs-policy"
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

# Security Group for Lambda (if VPC is configured)
resource "aws_security_group" "lambda" {
  count       = var.vpc_config != null ? 1 : 0
  name        = "${var.name_prefix}-secret-rotation-lambda-sg"
  description = "Security group for secret rotation Lambda function"
  vpc_id      = var.vpc_config.vpc_id

  # Allow outbound to RDS
  egress {
    description     = "PostgreSQL to RDS"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = var.vpc_config.rds_security_group_ids
  }

  # Allow outbound HTTPS for Secrets Manager API
  egress {
    description = "HTTPS to AWS services"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-secret-rotation-lambda-sg"
    }
  )
}

# Lambda Function
resource "aws_lambda_function" "secret_rotation" {
  function_name = "${var.name_prefix}-secret-rotation"
  role          = aws_iam_role.lambda.arn
  package_type  = "Image"
  image_uri     = var.image_uri

  description = "Rotates database credentials stored in AWS Secrets Manager"

  timeout     = var.timeout
  memory_size = var.memory_size

  # VPC Configuration (if provided)
  dynamic "vpc_config" {
    for_each = var.vpc_config != null ? [1] : []
    content {
      subnet_ids         = var.vpc_config.subnet_ids
      security_group_ids = [aws_security_group.lambda[0].id]
    }
  }

  environment {
    variables = {
      DB_SSLMODE = var.db_sslmode
    }
  }

  # Ensure log group exists before function
  depends_on = [
    aws_cloudwatch_log_group.lambda,
    aws_iam_role_policy.secrets_manager,
    aws_iam_role_policy.cloudwatch_logs
  ]

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-secret-rotation"
    }
  )
}

# Lambda Permission for Secrets Manager
resource "aws_lambda_permission" "secrets_manager" {
  statement_id  = "AllowExecutionFromSecretsManager"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.secret_rotation.function_name
  principal     = "secretsmanager.amazonaws.com"
  source_arn    = var.secret_arn
}


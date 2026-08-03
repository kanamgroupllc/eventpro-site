# Local Environment - Main Configuration
# This file provisions AWS resources in LocalStack for local development



# Include provider settings from settings.tf
# (settings.tf configures LocalStack endpoints)

# SQS Dead Letter Queues (provisioned in LocalStack)
resource "aws_sqs_queue" "order_queue_dlq" {
  provider = aws.localstack

  name                      = "order-queue-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "order-queue-dlq"
    Environment = "local"
    Purpose     = "Order processing queue - Dead Letter Queue"
  }
}

resource "aws_sqs_queue" "payment_queue_dlq" {
  provider = aws.localstack

  name                      = "payment-queue-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "payment-queue-dlq"
    Environment = "local"
    Purpose     = "Payment processing queue - Dead Letter Queue"
  }
}

resource "aws_sqs_queue" "notification_queue_dlq" {
  provider = aws.localstack

  name                      = "notification-queue-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name        = "notification-queue-dlq"
    Environment = "local"
    Purpose     = "Notification sending queue - Dead Letter Queue"
  }
}

# SQS Queues (provisioned in LocalStack)
resource "aws_sqs_queue" "order_queue" {
  provider = aws.localstack

  name                       = "order-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 360    # 6 minutes (must be >= Lambda timeout)
  receive_wait_time_seconds  = 20     # Long polling

  # Dead-letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.order_queue_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "order-queue"
    Environment = "local"
    Purpose     = "Order processing queue"
  }
}

resource "aws_sqs_queue" "payment_queue" {
  provider = aws.localstack

  name                       = "payment-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 360    # 6 minutes (must be >= Lambda timeout)
  receive_wait_time_seconds  = 20     # Long polling

  # Dead-letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.payment_queue_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "payment-queue"
    Environment = "local"
    Purpose     = "Payment processing queue"
  }
}

resource "aws_sqs_queue" "notification_queue" {
  provider = aws.localstack

  name                       = "notification-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 360    # 6 minutes (must be >= Lambda timeout)
  receive_wait_time_seconds  = 20     # Long polling

  # Dead-letter queue configuration
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_queue_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name        = "notification-queue"
    Environment = "local"
    Purpose     = "Notification sending queue"
  }
}

# SES Email Identity (provisioned in LocalStack - required for sending mail)
# Use this address as aws.ses.fromEmail in local env (e.g. noreply@eventpro.com)
resource "aws_ses_email_identity" "sender" {
  provider = aws.localstack
  email    = "noreply@eventpro.com"
}

# S3 Bucket for Event Images (provisioned in LocalStack)
resource "aws_s3_bucket" "images" {
  provider = aws.localstack

  bucket        = "eventpro-images-local"
  force_destroy = true

  tags = {
    Name        = "eventpro-images-local"
    Environment = "local"
    Purpose     = "Event images storage"
  }
}

# S3 Bucket CORS Configuration
resource "aws_s3_bucket_cors_configuration" "images" {
  provider = aws.localstack
  bucket   = aws_s3_bucket.images.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    allowed_origins = ["http://localhost:5173", "http://localhost:3000"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# S3 Bucket Public Access (for local development - allows public read)
resource "aws_s3_bucket_public_access_block" "images" {
  provider = aws.localstack
  bucket   = aws_s3_bucket.images.id

  block_public_acls       = false
  block_public_policy     = false
  ignore_public_acls      = false
  restrict_public_buckets = false
}

# S3 Bucket Policy for Public Read
resource "aws_s3_bucket_policy" "images" {
  provider = aws.localstack
  bucket   = aws_s3_bucket.images.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "PublicReadGetObject"
        Effect    = "Allow"
        Principal = "*"
        Action    = "s3:GetObject"
        Resource  = "${aws_s3_bucket.images.arn}/*"
      }
    ]
  })
}

# Lambda Functions (provisioned in LocalStack)
# These Lambda functions are managed by LocalStack and automatically triggered by SQS event source mappings

# CloudWatch Log Groups for Lambda Functions
resource "aws_cloudwatch_log_group" "order_processor" {
  provider          = aws.localstack
  name              = "/aws/lambda/local-order-processor"
  retention_in_days = 7

  tags = {
    Name        = "local-order-processor-logs"
    Environment = "local"
  }
}

resource "aws_cloudwatch_log_group" "payment_processor" {
  provider          = aws.localstack
  name              = "/aws/lambda/local-payment-processor"
  retention_in_days = 7

  tags = {
    Name        = "local-payment-processor-logs"
    Environment = "local"
  }
}

resource "aws_cloudwatch_log_group" "notification_sender" {
  provider          = aws.localstack
  name              = "/aws/lambda/local-notification-sender"
  retention_in_days = 7

  tags = {
    Name        = "local-notification-sender-logs"
    Environment = "local"
  }
}

# IAM Roles for Lambda Functions
resource "aws_iam_role" "lambda_order_processor" {
  provider = aws.localstack
  name     = "local-order-processor-lambda-role"

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

  tags = {
    Name        = "local-order-processor-lambda-role"
    Environment = "local"
  }
}

resource "aws_iam_role_policy" "lambda_order_processor" {
  provider = aws.localstack
  name     = "local-order-processor-lambda-policy"
  role     = aws_iam_role.lambda_order_processor.id

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
        Resource = "${aws_cloudwatch_log_group.order_processor.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.order_queue.arn,
          aws_sqs_queue.payment_queue.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.payment_queue.arn
      }
    ]
  })
}

resource "aws_iam_role" "lambda_payment_processor" {
  provider = aws.localstack
  name     = "local-payment-processor-lambda-role"

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

  tags = {
    Name        = "local-payment-processor-lambda-role"
    Environment = "local"
  }
}

resource "aws_iam_role_policy" "lambda_payment_processor" {
  provider = aws.localstack
  name     = "local-payment-processor-lambda-policy"
  role     = aws_iam_role.lambda_payment_processor.id

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
        Resource = "${aws_cloudwatch_log_group.payment_processor.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = [
          aws_sqs_queue.payment_queue.arn,
          aws_sqs_queue.notification_queue.arn
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.notification_queue.arn
      }
    ]
  })
}

resource "aws_iam_role" "lambda_notification_sender" {
  provider = aws.localstack
  name     = "local-notification-sender-lambda-role"

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

  tags = {
    Name        = "local-notification-sender-lambda-role"
    Environment = "local"
  }
}

resource "aws_iam_role_policy" "lambda_notification_sender" {
  provider = aws.localstack
  name     = "local-notification-sender-lambda-policy"
  role     = aws_iam_role.lambda_notification_sender.id

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
        Resource = "${aws_cloudwatch_log_group.notification_sender.arn}:*"
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes",
          "sqs:GetQueueUrl"
        ]
        Resource = aws_sqs_queue.notification_queue.arn
      }
    ]
  })
}

# Lambda Functions
resource "aws_lambda_function" "order_processor" {
  provider = aws.localstack

  function_name = "local-order-processor"
  description   = "Processes orders from SQS, validates them, reserves tickets, and publishes to payment queue"
  role          = aws_iam_role.lambda_order_processor.arn
  handler       = "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"
  runtime       = "provided.al2"
  timeout       = 300 # 5 minutes
  memory_size   = 512

  package_type = "Image"
  image_uri    = "eventpro-order-processor:local"

  environment {
    variables = {
      DB_URL           = "jdbc:postgresql://postgres:5432/eventpro"
      DB_USERNAME      = "eventpro"
      DB_PASSWORD      = "eventpro"
      AWS_ENDPOINT_URL = "http://localstack:4566"
      # AWS_REGION is reserved on Lambda; runtime provides it (see AWS docs).
      AWS_ACCESS_KEY_ID     = "test"
      AWS_SECRET_ACCESS_KEY = "test"
      SQS_PAYMENT_QUEUE_URL = aws_sqs_queue.payment_queue.url
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.order_processor,
    aws_iam_role_policy.lambda_order_processor
  ]

  tags = {
    Name        = "local-order-processor"
    Environment = "local"
  }
}

resource "aws_lambda_function" "payment_processor" {
  provider = aws.localstack

  function_name = "local-payment-processor"
  description   = "Processes payments from SQS, calls Stripe, updates orders/tickets, and publishes to notification queue"
  role          = aws_iam_role.lambda_payment_processor.arn
  handler       = "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"
  runtime       = "provided.al2"
  timeout       = 300 # 5 minutes
  memory_size   = 512

  package_type = "Image"
  image_uri    = "eventpro-payment-processor:local"

  environment {
    variables = {
      DB_URL           = "jdbc:postgresql://postgres:5432/eventpro"
      DB_USERNAME      = "eventpro"
      DB_PASSWORD      = "eventpro"
      AWS_ENDPOINT_URL = "http://localstack:4566"
      # AWS_REGION is reserved on Lambda; runtime provides it (see AWS docs).
      AWS_ACCESS_KEY_ID          = "test"
      AWS_SECRET_ACCESS_KEY      = "test"
      SQS_NOTIFICATION_QUEUE_URL = aws_sqs_queue.notification_queue.url
      STRIPE_SECRET_KEY          = "sk_test_local"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.payment_processor,
    aws_iam_role_policy.lambda_payment_processor
  ]

  tags = {
    Name        = "local-payment-processor"
    Environment = "local"
  }
}

resource "aws_lambda_function" "notification_sender" {
  provider = aws.localstack

  function_name = "local-notification-sender"
  description   = "Sends notifications from SQS queue via email, SMS, or in-app"
  role          = aws_iam_role.lambda_notification_sender.arn
  handler       = "io.quarkus.amazon.lambda.runtime.QuarkusStreamHandler::handleRequest"
  runtime       = "provided.al2"
  timeout       = 60 # 1 minute
  memory_size   = 256

  package_type = "Image"
  image_uri    = "eventpro-notification-sender:local"

  environment {
    variables = {
      DB_URL           = "jdbc:postgresql://postgres:5432/eventpro"
      DB_USERNAME      = "eventpro"
      DB_PASSWORD      = "eventpro"
      AWS_ENDPOINT_URL = "http://localstack:4566"
      # AWS_REGION is reserved on Lambda; runtime provides it (see AWS docs).
      AWS_ACCESS_KEY_ID     = "test"
      AWS_SECRET_ACCESS_KEY = "test"
      SES_SENDER_EMAIL      = "noreply@eventpro.com"
    }
  }

  depends_on = [
    aws_cloudwatch_log_group.notification_sender,
    aws_iam_role_policy.lambda_notification_sender
  ]

  tags = {
    Name        = "local-notification-sender"
    Environment = "local"
  }
}

# SQS Event Source Mappings
resource "aws_lambda_event_source_mapping" "order_queue" {
  provider = aws.localstack

  event_source_arn = aws_sqs_queue.order_queue.arn
  function_name    = aws_lambda_function.order_processor.arn
  enabled          = true

  batch_size                         = 10
  maximum_batching_window_in_seconds = 0
  maximum_record_age_in_seconds      = 604800 # 7 days
  bisect_batch_on_function_error     = true
  maximum_retry_attempts             = 3

  depends_on = [
    aws_lambda_function.order_processor,
    aws_sqs_queue.order_queue
  ]
}

resource "aws_lambda_event_source_mapping" "payment_queue" {
  provider = aws.localstack

  event_source_arn = aws_sqs_queue.payment_queue.arn
  function_name    = aws_lambda_function.payment_processor.arn
  enabled          = true

  batch_size                         = 1 # Critical path - process one at a time
  maximum_batching_window_in_seconds = 0
  maximum_record_age_in_seconds      = 604800 # 7 days
  bisect_batch_on_function_error     = true
  maximum_retry_attempts             = 3

  depends_on = [
    aws_lambda_function.payment_processor,
    aws_sqs_queue.payment_queue
  ]
}

resource "aws_lambda_event_source_mapping" "notification_queue" {
  provider = aws.localstack

  event_source_arn = aws_sqs_queue.notification_queue.arn
  function_name    = aws_lambda_function.notification_sender.arn
  enabled          = true

  batch_size                         = 10
  maximum_batching_window_in_seconds = 0
  maximum_record_age_in_seconds      = 604800 # 7 days
  bisect_batch_on_function_error     = true
  maximum_retry_attempts             = 3

  depends_on = [
    aws_lambda_function.notification_sender,
    aws_sqs_queue.notification_queue
  ]
}

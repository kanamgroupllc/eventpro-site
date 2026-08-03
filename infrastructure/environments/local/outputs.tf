# Local Environment - Outputs
# Outputs for local development environment

output "sqs_order_queue_url" {
  description = "SQS Order Queue URL"
  value       = aws_sqs_queue.order_queue.url
}

output "sqs_order_queue_arn" {
  description = "SQS Order Queue ARN"
  value       = aws_sqs_queue.order_queue.arn
}

output "sqs_order_queue_dlq_url" {
  description = "SQS Order Queue Dead Letter Queue URL"
  value       = aws_sqs_queue.order_queue_dlq.url
}

output "sqs_payment_queue_url" {
  description = "SQS Payment Queue URL"
  value       = aws_sqs_queue.payment_queue.url
}

output "sqs_payment_queue_arn" {
  description = "SQS Payment Queue ARN"
  value       = aws_sqs_queue.payment_queue.arn
}

output "sqs_payment_queue_dlq_url" {
  description = "SQS Payment Queue Dead Letter Queue URL"
  value       = aws_sqs_queue.payment_queue_dlq.url
}

output "sqs_notification_queue_url" {
  description = "SQS Notification Queue URL"
  value       = aws_sqs_queue.notification_queue.url
}

output "sqs_notification_queue_arn" {
  description = "SQS Notification Queue ARN"
  value       = aws_sqs_queue.notification_queue.arn
}

output "sqs_notification_queue_dlq_url" {
  description = "SQS Notification Queue Dead Letter Queue URL"
  value       = aws_sqs_queue.notification_queue_dlq.url
}

output "s3_images_bucket_name" {
  description = "S3 Images Bucket Name"
  value       = aws_s3_bucket.images.id
}

output "s3_images_bucket_arn" {
  description = "S3 Images Bucket ARN"
  value       = aws_s3_bucket.images.arn
}

# Lambda Function Outputs
output "lambda_order_processor_arn" {
  description = "Order Processor Lambda Function ARN"
  value       = aws_lambda_function.order_processor.arn
}

output "lambda_order_processor_name" {
  description = "Order Processor Lambda Function Name"
  value       = aws_lambda_function.order_processor.function_name
}

output "lambda_payment_processor_arn" {
  description = "Payment Processor Lambda Function ARN"
  value       = aws_lambda_function.payment_processor.arn
}

output "lambda_payment_processor_name" {
  description = "Payment Processor Lambda Function Name"
  value       = aws_lambda_function.payment_processor.function_name
}

output "lambda_notification_sender_arn" {
  description = "Notification Sender Lambda Function ARN"
  value       = aws_lambda_function.notification_sender.arn
}

output "lambda_notification_sender_name" {
  description = "Notification Sender Lambda Function Name"
  value       = aws_lambda_function.notification_sender.function_name
}

# Event Source Mapping Outputs
output "event_source_mapping_order_queue_id" {
  description = "Order Queue Event Source Mapping ID"
  value       = aws_lambda_event_source_mapping.order_queue.uuid
}

output "event_source_mapping_payment_queue_id" {
  description = "Payment Queue Event Source Mapping ID"
  value       = aws_lambda_event_source_mapping.payment_queue.uuid
}

output "event_source_mapping_notification_queue_id" {
  description = "Notification Queue Event Source Mapping ID"
  value       = aws_lambda_event_source_mapping.notification_queue.uuid
}

# Convenience output for environment variables
output "environment_variables" {
  description = "Environment variables for application configuration"
  value = {
    ORDER_QUEUE_URL        = aws_sqs_queue.order_queue.url
    ORDER_QUEUE_ARN        = aws_sqs_queue.order_queue.arn
    PAYMENT_QUEUE_URL      = aws_sqs_queue.payment_queue.url
    PAYMENT_QUEUE_ARN      = aws_sqs_queue.payment_queue.arn
    NOTIFICATION_QUEUE_URL = aws_sqs_queue.notification_queue.url
    NOTIFICATION_QUEUE_ARN = aws_sqs_queue.notification_queue.arn
    S3_BUCKET_NAME         = aws_s3_bucket.images.id
  }
}

# SQS Module - Main Configuration
# This module creates SQS queues for order, payment, and notification processing

# Dead Letter Queue (if enabled)
resource "aws_sqs_queue" "dlq" {
  count = var.enable_dlq ? 1 : 0

  name                      = "${var.queue_name}-dlq"
  message_retention_seconds = var.dlq_message_retention_seconds

  # Server-side encryption
  sqs_managed_sse_enabled           = var.sqs_managed_sse_enabled
  kms_master_key_id                 = var.kms_master_key_id
  kms_data_key_reuse_period_seconds = var.kms_data_key_reuse_period_seconds

  tags = merge(
    var.tags,
    {
      Name    = "${var.queue_name}-dlq"
      Purpose = "${var.queue_purpose} - Dead Letter Queue"
    }
  )
}

# SQS Queue
resource "aws_sqs_queue" "main" {
  name                       = var.queue_name
  message_retention_seconds  = var.message_retention_seconds
  visibility_timeout_seconds = var.visibility_timeout_seconds
  receive_wait_time_seconds  = var.receive_wait_time_seconds
  delay_seconds              = var.delay_seconds
  max_message_size           = var.max_message_size

  # Server-side encryption
  sqs_managed_sse_enabled           = var.sqs_managed_sse_enabled
  kms_master_key_id                 = var.kms_master_key_id
  kms_data_key_reuse_period_seconds = var.kms_data_key_reuse_period_seconds

  # Dead-letter queue configuration
  redrive_policy = var.dead_letter_queue_arn != null ? jsonencode({
    deadLetterTargetArn = var.dead_letter_queue_arn
    maxReceiveCount     = var.max_receive_count
    }) : (var.enable_dlq && length(aws_sqs_queue.dlq) > 0 ? jsonencode({
      deadLetterTargetArn = aws_sqs_queue.dlq[0].arn
      maxReceiveCount     = var.max_receive_count
  }) : null)

  tags = merge(
    var.tags,
    {
      Name    = var.queue_name
      Purpose = var.queue_purpose
    }
  )
}


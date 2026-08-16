# SQS queues for order, payment, and notification processing.

resource "aws_sqs_queue" "order" {
  name                       = "${local.name_prefix}-order-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = var.order_queue_visibility_timeout_seconds
  receive_wait_time_seconds  = 20

  sqs_managed_sse_enabled = true

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-order-queue"
    Purpose = "Order processing queue"
  })
}

resource "aws_sqs_queue" "payment" {
  name                       = "${local.name_prefix}-payment-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = var.payment_queue_visibility_timeout_seconds
  receive_wait_time_seconds  = 20

  sqs_managed_sse_enabled = true

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-payment-queue"
    Purpose = "Payment processing queue"
  })
}

resource "aws_sqs_queue" "notification_dlq" {
  name                      = "${local.name_prefix}-notification-dlq"
  message_retention_seconds = 1209600
  sqs_managed_sse_enabled   = true

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-notification-dlq"
    Purpose = "Failed notification messages"
  })
}

resource "aws_sqs_queue" "notification" {
  name                       = "${local.name_prefix}-notification-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = var.notification_queue_visibility_timeout_seconds
  receive_wait_time_seconds  = 20

  sqs_managed_sse_enabled = true
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 5
  })

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-notification-queue"
    Purpose = "Notification sending queue"
  })
}

resource "aws_cloudwatch_metric_alarm" "notification_dlq_visible" {
  alarm_name          = "${local.name_prefix}-notification-dlq-visible"
  alarm_description   = "Notification messages require operator attention"
  namespace           = "AWS/SQS"
  metric_name         = "ApproximateNumberOfMessagesVisible"
  statistic           = "Maximum"
  period              = 300
  evaluation_periods  = 1
  comparison_operator = "GreaterThanThreshold"
  threshold           = 0
  treat_missing_data  = "notBreaching"
  dimensions          = { QueueName = aws_sqs_queue.notification_dlq.name }
  tags                = local.common_tags
}

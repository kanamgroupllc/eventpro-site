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

resource "aws_sqs_queue" "notification" {
  name                       = "${local.name_prefix}-notification-queue"
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = var.notification_queue_visibility_timeout_seconds
  receive_wait_time_seconds  = 20

  sqs_managed_sse_enabled = true

  tags = merge(local.common_tags, {
    Name    = "${local.name_prefix}-notification-queue"
    Purpose = "Notification sending queue"
  })
}

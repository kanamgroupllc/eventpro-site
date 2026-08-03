output "vpc_id" {
  description = "Default VPC ID"
  value       = data.aws_vpc.default.id
}

output "lambda_subnet_ids" {
  description = "Default VPC subnet IDs for Lambda VPC config"
  value       = data.aws_subnets.default.ids
}

output "service_subnet_ids" {
  description = "Default VPC subnet IDs for ECS/ALB"
  value       = data.aws_subnets.default.ids
}

output "alb_security_group_id" {
  description = "ALB security group ID"
  value       = aws_security_group.alb.id
}

output "app_security_group_id" {
  description = "Application compute security group ID for ECS and DB-touching lambdas"
  value       = aws_security_group.app.id
}

output "ecs_security_group_id" {
  description = "Backward-compatible application compute security group ID"
  value       = aws_security_group.app.id
}

output "rds_security_group_id" {
  description = "RDS security group ID"
  value       = aws_security_group.rds.id
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = split(":", aws_db_instance.main.endpoint)[0]
}

output "rds_runtime_host" {
  description = "RDS hostname reachable by deployed compute"
  value       = var.use_localstack ? "localhost.localstack.cloud" : split(":", aws_db_instance.main.endpoint)[0]
}

output "rds_port" {
  description = "RDS port"
  value       = tonumber(split(":", aws_db_instance.main.endpoint)[1])
}

output "rds_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "db_master_user_secret_arn" {
  description = "Secrets Manager ARN for RDS master user"
  value       = aws_db_instance.main.master_user_secret[0].secret_arn
}

output "order_queue_url" {
  description = "Order SQS queue URL"
  value       = aws_sqs_queue.order.url
}

output "order_queue_arn" {
  description = "Order SQS queue ARN"
  value       = aws_sqs_queue.order.arn
}

output "payment_queue_url" {
  description = "Payment SQS queue URL"
  value       = aws_sqs_queue.payment.url
}

output "payment_queue_arn" {
  description = "Payment SQS queue ARN"
  value       = aws_sqs_queue.payment.arn
}

output "notification_queue_url" {
  description = "Notification SQS queue URL"
  value       = aws_sqs_queue.notification.url
}

output "notification_queue_arn" {
  description = "Notification SQS queue ARN"
  value       = aws_sqs_queue.notification.arn
}

output "route53_zone_id" {
  description = "Route53 hosted zone ID"
  value       = data.aws_route53_zone.main.zone_id
}

output "route53_zone_name" {
  description = "Route53 hosted zone name"
  value       = data.aws_route53_zone.main.name
}

output "cloudfront_certificate_arn" {
  description = "ACM certificate ARN for CloudFront in us-east-1"
  value       = aws_acm_certificate_validation.cloudfront.certificate_arn
}

output "alb_certificate_arn" {
  description = "ACM certificate ARN for ALB"
  value       = aws_acm_certificate_validation.alb.certificate_arn
}

output "s3_images_bucket_id" {
  description = "S3 images bucket name"
  value       = aws_s3_bucket.images.id
}

output "s3_images_bucket_arn" {
  description = "S3 images bucket ARN"
  value       = aws_s3_bucket.images.arn
}

output "local_ecr_repository_urls" {
  description = "LocalStack ECR repository URLs keyed by repository name; empty in real AWS"
  value       = { for name, repository in aws_ecr_repository.localstack : name => repository.repository_url }
}

output "local_ecr_registry" {
  description = "LocalStack ECR registry host; null in real AWS"
  value = var.use_localstack ? split(
    "/",
    aws_ecr_repository.localstack["eventpro-api"].repository_url
  )[0] : null
}

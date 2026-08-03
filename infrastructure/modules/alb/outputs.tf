# ALB Module - Outputs

output "alb_id" {
  description = "ID of the load balancer"
  value       = aws_lb.main.id
}

output "alb_arn" {
  description = "ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "alb_arn_suffix" {
  description = "ARN suffix for use with CloudWatch Metrics"
  value       = aws_lb.main.arn_suffix
}

output "alb_dns_name" {
  description = "DNS name of the load balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Canonical hosted zone ID of the load balancer (to be used in a Route 53 Alias record)"
  value       = aws_lb.main.zone_id
}

output "primary_target_group_id" {
  description = "ID of the primary target group"
  value       = aws_lb_target_group.primary.id
}

output "primary_target_group_arn" {
  description = "ARN of the primary target group"
  value       = aws_lb_target_group.primary.arn
}

output "primary_target_group_arn_suffix" {
  description = "ARN suffix for use with CloudWatch Metrics"
  value       = aws_lb_target_group.primary.arn_suffix
}

output "secondary_target_group_id" {
  description = "ID of the secondary target group (if blue/green is enabled)"
  value       = var.enable_blue_green ? aws_lb_target_group.secondary[0].id : null
}

output "secondary_target_group_arn" {
  description = "ARN of the secondary target group (if blue/green is enabled)"
  value       = var.enable_blue_green ? aws_lb_target_group.secondary[0].arn : null
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener"
  value       = aws_lb_listener.http.arn
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener"
  value       = aws_lb_listener.https.arn
}

output "listener_rules" {
  description = "Map of listener rule ARNs (key is rule name)"
  value = {
    for k, v in aws_lb_listener_rule.path_routing : k => v.arn
  }
}


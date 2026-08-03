output "load_balancer_dns_name" {
  description = "Application Load Balancer DNS name"
  value       = aws_lb.main.dns_name
}

output "load_balancer_url" {
  description = "Application Load Balancer URL (AWS DNS endpoint)"
  value       = "https://${aws_lb.main.dns_name}"
}

output "api_url" {
  description = "API base URL"
  value       = "https://${terraform.workspace}-api.${var.domain_name}"
}

output "deployed_image" {
  description = "Container image coordinates currently configured for the API"
  value = {
    registry = var.image_registry
    name     = var.image_name
    tag      = var.image_tag
  }
}

# CloudFront Module - Outputs

output "distribution_id" {
  description = "Identifier for the distribution"
  value       = aws_cloudfront_distribution.main.id
}

output "distribution_arn" {
  description = "ARN for the distribution"
  value       = aws_cloudfront_distribution.main.arn
}

output "distribution_domain_name" {
  description = "Domain name corresponding to the distribution"
  value       = aws_cloudfront_distribution.main.domain_name
}

output "distribution_hosted_zone_id" {
  description = "CloudFront Route 53 zone ID that can be used to route an Alias Resource Record Set to"
  value       = aws_cloudfront_distribution.main.hosted_zone_id
}

output "distribution_status" {
  description = "Current status of the distribution. Deployed if the distribution's information is fully propagated"
  value       = aws_cloudfront_distribution.main.status
}

output "distribution_etag" {
  description = "Current version of the distribution's information"
  value       = aws_cloudfront_distribution.main.etag
}

output "distribution_caller_reference" {
  description = "Internal value used by CloudFront to allow future updates to the distribution configuration"
  value       = aws_cloudfront_distribution.main.caller_reference
}

output "origin_access_control_ids" {
  description = "Map of origin access control IDs (key is origin_id)"
  value = {
    for k, v in aws_cloudfront_origin_access_control.s3_oac : k => v.id
  }
}

output "origin_access_control_arns" {
  description = "Map of origin access control ARNs (key is origin_id)"
  value = {
    for k, v in aws_cloudfront_origin_access_control.s3_oac : k => v.arn
  }
}

# Invalidation command helper output
output "invalidation_command" {
  description = "AWS CLI command to invalidate cache (example)"
  value       = "aws cloudfront create-invalidation --distribution-id ${aws_cloudfront_distribution.main.id} --paths '/*'"
}


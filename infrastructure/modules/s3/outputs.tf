# S3 Module - Outputs

output "bucket_id" {
  description = "ID (name) of the bucket"
  value       = aws_s3_bucket.main.id
}

output "bucket_arn" {
  description = "ARN of the bucket"
  value       = aws_s3_bucket.main.arn
}

output "bucket_domain_name" {
  description = "Bucket domain name"
  value       = aws_s3_bucket.main.bucket_domain_name
}

output "bucket_regional_domain_name" {
  description = "The bucket region-specific domain name"
  value       = aws_s3_bucket.main.bucket_regional_domain_name
}

output "bucket_hosted_zone_id" {
  description = "Route 53 Hosted Zone ID for this bucket's region"
  value       = aws_s3_bucket.main.hosted_zone_id
}

output "bucket_region" {
  description = "AWS region this bucket resides in"
  value       = aws_s3_bucket.main.bucket_region
}

output "website_endpoint" {
  description = "Website endpoint (if website is enabled)"
  value       = var.enable_website ? aws_s3_bucket_website_configuration.main[0].website_endpoint : null
}

output "website_domain" {
  description = "Domain of the website endpoint (if website is enabled)"
  value       = var.enable_website ? aws_s3_bucket_website_configuration.main[0].website_domain : null
}


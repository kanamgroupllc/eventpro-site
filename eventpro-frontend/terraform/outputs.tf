output "bucket_name" {
  description = "S3 bucket for frontend assets"
  value       = aws_s3_bucket.frontend.id
}

output "distribution_id" {
  description = "CloudFront distribution ID"
  value       = aws_cloudfront_distribution.frontend.id
}

output "app_url" {
  description = "Frontend URL"
  value       = "https://${terraform.workspace}-app.${var.domain_name}"
}

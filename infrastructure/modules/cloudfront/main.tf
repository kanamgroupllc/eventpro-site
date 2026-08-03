# CloudFront Module - Main Configuration
# This module creates a CloudFront distribution with S3 origins, cache behaviors, and SSL certificate support

# Origin Access Control for S3 origins
resource "aws_cloudfront_origin_access_control" "s3_oac" {
  for_each = { for origin in var.origins : origin.origin_id => origin if origin.origin_type == "s3" }

  name                              = "${var.name_prefix}-${each.value.origin_id}-oac"
  description                       = "Origin Access Control for ${each.value.origin_id}"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  enabled             = var.enabled
  is_ipv6_enabled     = var.is_ipv6_enabled
  comment             = var.comment
  default_root_object = var.default_root_object
  http_version        = var.http_version
  price_class         = var.price_class

  # Aliases (custom domains)
  aliases = var.aliases

  # Origins
  dynamic "origin" {
    for_each = var.origins
    content {
      domain_name         = origin.value.domain_name
      origin_id           = origin.value.origin_id
      origin_path         = origin.value.origin_path
      connection_attempts = origin.value.connection_attempts != null ? origin.value.connection_attempts : 3
      connection_timeout  = origin.value.connection_timeout != null ? origin.value.connection_timeout : 10

      # S3 Origin with Origin Access Control
      origin_access_control_id = origin.value.origin_type == "s3" ? aws_cloudfront_origin_access_control.s3_oac[origin.value.origin_id].id : null

      # Custom Origin Configuration
      dynamic "custom_origin_config" {
        for_each = origin.value.origin_type == "custom" ? [1] : []
        content {
          http_port                = origin.value.custom_origin_config.http_port
          https_port               = origin.value.custom_origin_config.https_port
          origin_protocol_policy   = origin.value.custom_origin_config.origin_protocol_policy
          origin_ssl_protocols     = origin.value.custom_origin_config.origin_ssl_protocols
          origin_keepalive_timeout = origin.value.custom_origin_config.origin_keepalive_timeout
          origin_read_timeout      = origin.value.custom_origin_config.origin_read_timeout
        }
      }

      # Custom Headers
      dynamic "custom_header" {
        for_each = origin.value.custom_headers != null ? origin.value.custom_headers : []
        content {
          name  = custom_header.value.name
          value = custom_header.value.value
        }
      }

      # Origin Shield
      dynamic "origin_shield" {
        for_each = origin.value.origin_shield_enabled ? [1] : []
        content {
          enabled              = true
          origin_shield_region = origin.value.origin_shield_region
        }
      }
    }
  }

  # Default Cache Behavior
  default_cache_behavior {
    allowed_methods        = var.default_cache_behavior.allowed_methods
    cached_methods         = var.default_cache_behavior.cached_methods
    target_origin_id       = var.default_cache_behavior.target_origin_id
    compress               = var.default_cache_behavior.compress
    viewer_protocol_policy = var.default_cache_behavior.viewer_protocol_policy

    # Cache Policy (preferred over forwarded_values)
    cache_policy_id = var.default_cache_behavior.cache_policy_id

    # Origin Request Policy
    origin_request_policy_id = var.default_cache_behavior.origin_request_policy_id

    # Response Headers Policy
    response_headers_policy_id = var.default_cache_behavior.response_headers_policy_id

    # Field Level Encryption
    field_level_encryption_id = var.default_cache_behavior.field_level_encryption_id

    # Realtime Log Config
    realtime_log_config_arn = var.default_cache_behavior.realtime_log_config_arn

    # Trusted Key Groups
    trusted_key_groups = var.default_cache_behavior.trusted_key_groups

    # Trusted Signers
    trusted_signers = var.default_cache_behavior.trusted_signers

    # Lambda Function Associations
    dynamic "lambda_function_association" {
      for_each = var.default_cache_behavior.lambda_function_associations
      content {
        event_type   = lambda_function_association.value.event_type
        lambda_arn   = lambda_function_association.value.lambda_arn
        include_body = lambda_function_association.value.include_body
      }
    }

    # CloudFront Function Associations
    dynamic "function_association" {
      for_each = var.default_cache_behavior.function_associations
      content {
        event_type   = function_association.value.event_type
        function_arn = function_association.value.function_arn
      }
    }

    # Smooth Streaming
    smooth_streaming = var.default_cache_behavior.smooth_streaming

    # Min/Max/Default TTL (used when cache_policy_id is not set)
    min_ttl     = var.default_cache_behavior.min_ttl
    default_ttl = var.default_cache_behavior.default_ttl
    max_ttl     = var.default_cache_behavior.max_ttl
  }

  # Ordered Cache Behaviors
  dynamic "ordered_cache_behavior" {
    for_each = var.ordered_cache_behaviors
    content {
      path_pattern           = ordered_cache_behavior.value.path_pattern
      allowed_methods        = ordered_cache_behavior.value.allowed_methods
      cached_methods         = ordered_cache_behavior.value.cached_methods
      target_origin_id       = ordered_cache_behavior.value.target_origin_id
      compress               = ordered_cache_behavior.value.compress
      viewer_protocol_policy = ordered_cache_behavior.value.viewer_protocol_policy

      # Cache Policy
      cache_policy_id = ordered_cache_behavior.value.cache_policy_id

      # Origin Request Policy
      origin_request_policy_id = ordered_cache_behavior.value.origin_request_policy_id

      # Response Headers Policy
      response_headers_policy_id = ordered_cache_behavior.value.response_headers_policy_id

      # Field Level Encryption
      field_level_encryption_id = ordered_cache_behavior.value.field_level_encryption_id

      # Realtime Log Config
      realtime_log_config_arn = ordered_cache_behavior.value.realtime_log_config_arn

      # Trusted Key Groups
      trusted_key_groups = ordered_cache_behavior.value.trusted_key_groups

      # Trusted Signers
      trusted_signers = ordered_cache_behavior.value.trusted_signers

      # Lambda Function Associations
      dynamic "lambda_function_association" {
        for_each = ordered_cache_behavior.value.lambda_function_associations
        content {
          event_type   = lambda_function_association.value.event_type
          lambda_arn   = lambda_function_association.value.lambda_arn
          include_body = lambda_function_association.value.include_body
        }
      }

      # CloudFront Function Associations
      dynamic "function_association" {
        for_each = ordered_cache_behavior.value.function_associations
        content {
          event_type   = function_association.value.event_type
          function_arn = function_association.value.function_arn
        }
      }

      # Smooth Streaming
      smooth_streaming = ordered_cache_behavior.value.smooth_streaming

      # Min/Max/Default TTL
      min_ttl     = ordered_cache_behavior.value.min_ttl
      default_ttl = ordered_cache_behavior.value.default_ttl
      max_ttl     = ordered_cache_behavior.value.max_ttl
    }
  }

  # Custom Error Responses
  dynamic "custom_error_response" {
    for_each = var.custom_error_responses
    content {
      error_caching_min_ttl = custom_error_response.value.error_caching_min_ttl
      error_code            = custom_error_response.value.error_code
      response_code         = custom_error_response.value.response_code
      response_page_path    = custom_error_response.value.response_page_path
    }
  }

  # Restrictions
  restrictions {
    geo_restriction {
      restriction_type = var.geo_restriction_type
      locations        = var.geo_restriction_locations
    }
  }

  # Viewer Certificate
  viewer_certificate {
    acm_certificate_arn            = var.acm_certificate_arn
    cloudfront_default_certificate = var.acm_certificate_arn == null ? true : false
    ssl_support_method             = var.acm_certificate_arn != null ? "sni-only" : null
    minimum_protocol_version       = var.acm_certificate_arn != null ? var.minimum_protocol_version : null
  }

  # Logging Configuration (V1)
  dynamic "logging_config" {
    for_each = var.logging_enabled ? [1] : []
    content {
      bucket          = var.logging_bucket
      include_cookies = var.logging_include_cookies
      prefix          = var.logging_prefix
    }
  }

  # Web ACL
  web_acl_id = var.web_acl_id

  # Retain on Delete
  retain_on_delete = var.retain_on_delete

  # Wait for Deployment
  wait_for_deployment = var.wait_for_deployment

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-cloudfront"
    }
  )
}

# Note: Cache invalidation is typically done via AWS CLI:
# aws cloudfront create-invalidation --distribution-id <distribution-id> --paths "/*"


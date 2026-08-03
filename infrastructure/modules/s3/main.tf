# S3 Module - Main Configuration
# This module creates S3 buckets for images and frontend assets with versioning, lifecycle policies, CORS, and encryption

# S3 Bucket
resource "aws_s3_bucket" "main" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  tags = merge(
    var.tags,
    {
      Name = var.bucket_name
      Type = var.bucket_type
    }
  )
}

# S3 Bucket Versioning
resource "aws_s3_bucket_versioning" "main" {
  bucket = aws_s3_bucket.main.id

  versioning_configuration {
    status = var.versioning_enabled ? "Enabled" : "Suspended"
  }
}

# S3 Bucket Server-Side Encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "main" {
  bucket = aws_s3_bucket.main.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm     = var.kms_key_id != null ? "aws:kms" : "AES256"
      kms_master_key_id = var.kms_key_id
    }
    bucket_key_enabled = var.bucket_key_enabled
  }
}

# S3 Bucket Public Access Block
resource "aws_s3_bucket_public_access_block" "main" {
  bucket = aws_s3_bucket.main.id

  block_public_acls       = var.block_public_acls
  block_public_policy     = var.block_public_policy
  ignore_public_acls      = var.ignore_public_acls
  restrict_public_buckets = var.restrict_public_buckets
}

# S3 Bucket CORS Configuration (for frontend bucket)
resource "aws_s3_bucket_cors_configuration" "main" {
  count = var.enable_cors ? 1 : 0

  bucket = aws_s3_bucket.main.id

  dynamic "cors_rule" {
    for_each = var.cors_rules
    content {
      allowed_headers = cors_rule.value.allowed_headers
      allowed_methods = cors_rule.value.allowed_methods
      allowed_origins = cors_rule.value.allowed_origins
      expose_headers  = cors_rule.value.expose_headers
      max_age_seconds = cors_rule.value.max_age_seconds
    }
  }
}

# S3 Bucket Lifecycle Configuration
resource "aws_s3_bucket_lifecycle_configuration" "main" {
  count = length(var.lifecycle_rules) > 0 ? 1 : 0

  bucket = aws_s3_bucket.main.id

  dynamic "rule" {
    for_each = var.lifecycle_rules
    content {
      id     = rule.value.id
      status = rule.value.status

      # Filter
      dynamic "filter" {
        for_each = rule.value.filter_prefix != null || (rule.value.filter_tags != null && length(rule.value.filter_tags) > 0) ? [1] : []
        content {
          prefix = rule.value.filter_prefix
          dynamic "tag" {
            for_each = rule.value.filter_tags != null ? rule.value.filter_tags : {}
            content {
              key   = tag.key
              value = tag.value
            }
          }
        }
      }

      # Expiration
      dynamic "expiration" {
        for_each = rule.value.expiration_days != null ? [1] : []
        content {
          days = rule.value.expiration_days
        }
      }

      # Noncurrent Version Expiration
      dynamic "noncurrent_version_expiration" {
        for_each = rule.value.noncurrent_version_expiration_days != null ? [1] : []
        content {
          noncurrent_days = rule.value.noncurrent_version_expiration_days
        }
      }

      # Transitions
      dynamic "transition" {
        for_each = rule.value.transitions
        content {
          days          = transition.value.days
          storage_class = transition.value.storage_class
        }
      }

      # Noncurrent Version Transitions
      dynamic "noncurrent_version_transition" {
        for_each = rule.value.noncurrent_version_transitions != null ? rule.value.noncurrent_version_transitions : []
        content {
          noncurrent_days = noncurrent_version_transition.value.noncurrent_days
          storage_class   = noncurrent_version_transition.value.storage_class
        }
      }

      # Abort Incomplete Multipart Upload
      dynamic "abort_incomplete_multipart_upload" {
        for_each = rule.value.abort_incomplete_multipart_upload_days != null ? [1] : []
        content {
          days_after_initiation = rule.value.abort_incomplete_multipart_upload_days
        }
      }
    }
  }
}

# S3 Bucket Policy
resource "aws_s3_bucket_policy" "main" {
  count = var.bucket_policy != null ? 1 : 0

  bucket = aws_s3_bucket.main.id
  policy = var.bucket_policy
}

# S3 Bucket Website Configuration (for frontend bucket)
resource "aws_s3_bucket_website_configuration" "main" {
  count = var.enable_website ? 1 : 0

  bucket = aws_s3_bucket.main.id

  index_document {
    suffix = var.index_document
  }

  error_document {
    key = var.error_document
  }
}


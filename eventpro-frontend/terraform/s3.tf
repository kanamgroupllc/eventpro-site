# S3 bucket for frontend static assets (Block Public Access)

resource "aws_s3_bucket" "frontend" {
  bucket = "${terraform.workspace}-eventpro-site-frontend"

  tags          = merge(var.tags, { Name = "${terraform.workspace}-eventpro-site-frontend", Env = terraform.workspace })
  force_destroy = true
}

resource "aws_s3_bucket_versioning" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  rule {
    blocked_encryption_types = var.use_localstack ? ["SSE-C"] : []
    bucket_key_enabled       = false

    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "frontend" {
  bucket = aws_s3_bucket.frontend.id

  block_public_acls       = var.use_localstack ? false : true
  block_public_policy     = var.use_localstack ? false : true
  ignore_public_acls      = var.use_localstack ? false : true
  restrict_public_buckets = var.use_localstack ? false : true
}

resource "aws_s3_bucket_cors_configuration" "frontend_localstack" {
  count  = var.use_localstack ? 1 : 0
  bucket = aws_s3_bucket.frontend.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "HEAD"]
    allowed_origins = ["https://${terraform.workspace}-app.${var.domain_name}"]
    max_age_seconds = 300
  }
}

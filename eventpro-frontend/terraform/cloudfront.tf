# CloudFront OAC + distribution with S3 origin

resource "aws_cloudfront_origin_access_control" "frontend" {
  count = var.use_localstack ? 0 : 1

  name                              = "${terraform.workspace}-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

data "aws_iam_policy_document" "frontend_bucket_oac" {
  count = var.use_localstack ? 0 : 1

  statement {
    sid    = "AllowCloudFrontOAC"
    effect = "Allow"

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.frontend.arn]
    }
  }
}

data "aws_iam_policy_document" "frontend_bucket_public_read" {
  count = var.use_localstack ? 1 : 0

  statement {
    sid    = "AllowLocalStackCloudFrontRead"
    effect = "Allow"

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    actions   = ["s3:GetObject"]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }
}

resource "aws_s3_bucket_policy" "frontend" {
  bucket = aws_s3_bucket.frontend.id
  policy = var.use_localstack ? data.aws_iam_policy_document.frontend_bucket_public_read[0].json : data.aws_iam_policy_document.frontend_bucket_oac[0].json

  depends_on = [aws_s3_bucket_public_access_block.frontend]
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "EventPro Frontend"
  default_root_object = "index.html"
  price_class         = "PriceClass_100"

  origin {
    domain_name              = var.use_localstack ? "localhost.localstack.cloud" : aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = "s3-frontend"
    origin_path              = var.use_localstack ? "/${aws_s3_bucket.frontend.id}" : null
    origin_access_control_id = var.use_localstack ? null : aws_cloudfront_origin_access_control.frontend[0].id

    dynamic "custom_origin_config" {
      for_each = var.use_localstack ? [1] : []

      content {
        http_port              = 4566
        https_port             = 4566
        origin_protocol_policy = "http-only"
        origin_ssl_protocols   = ["TLSv1.2"]
      }
    }

    dynamic "s3_origin_config" {
      for_each = var.use_localstack ? [] : [1]

      content {
        origin_access_identity = ""
      }
    }
  }

  aliases = ["${terraform.workspace}-app.${var.domain_name}"]

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "s3-frontend"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"
    cache_policy_id        = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad" # CachingDisabled
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = var.use_localstack ? null : data.terraform_remote_state.shared_infra.outputs.cloudfront_certificate_arn
    cloudfront_default_certificate = var.use_localstack ? true : null
    ssl_support_method             = var.use_localstack ? null : "sni-only"
    minimum_protocol_version       = var.use_localstack ? null : "TLSv1.2_2021"
  }

  tags = merge(var.tags, { Name = "${terraform.workspace}-frontend", Env = terraform.workspace })
}

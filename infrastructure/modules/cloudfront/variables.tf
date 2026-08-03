# CloudFront Module - Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "enabled" {
  description = "Whether the distribution is enabled to accept end user requests for content"
  type        = bool
  default     = true
}

variable "is_ipv6_enabled" {
  description = "Whether the IPv6 is enabled for the distribution"
  type        = bool
  default     = true
}

variable "comment" {
  description = "Any comments you want to include about the distribution"
  type        = string
  default     = null
}

variable "default_root_object" {
  description = "Object that you want CloudFront to return when an end user requests the root URL"
  type        = string
  default     = "index.html"
}

variable "http_version" {
  description = "Maximum HTTP version to support on the distribution. Allowed values are http1.1, http2, http2and3 and http3"
  type        = string
  default     = "http2"
}

variable "price_class" {
  description = "Price class for this distribution. One of PriceClass_All, PriceClass_200, PriceClass_100"
  type        = string
  default     = "PriceClass_All"
}

variable "aliases" {
  description = "Extra CNAMEs (alternate domain names), if any, for this distribution"
  type        = list(string)
  default     = []
}

variable "origins" {
  description = "List of origins for this distribution"
  type = list(object({
    origin_id           = string
    domain_name         = string
    origin_type         = string # "s3" or "custom"
    origin_path         = optional(string)
    connection_attempts = optional(number)
    connection_timeout  = optional(number)
    custom_origin_config = optional(object({
      http_port                = number
      https_port               = number
      origin_protocol_policy   = string
      origin_ssl_protocols     = list(string)
      origin_keepalive_timeout = optional(number)
      origin_read_timeout      = optional(number)
    }))
    custom_headers = optional(list(object({
      name  = string
      value = string
    })), [])
    origin_shield_enabled = optional(bool, false)
    origin_shield_region  = optional(string)
  }))
}

variable "default_cache_behavior" {
  description = "Default cache behavior for this distribution"
  type = object({
    allowed_methods            = list(string)
    cached_methods             = list(string)
    target_origin_id           = string
    compress                   = optional(bool, true)
    viewer_protocol_policy     = string
    cache_policy_id            = optional(string)
    origin_request_policy_id   = optional(string)
    response_headers_policy_id = optional(string)
    field_level_encryption_id  = optional(string)
    realtime_log_config_arn    = optional(string)
    trusted_key_groups         = optional(list(string))
    trusted_signers            = optional(list(string))
    lambda_function_associations = optional(list(object({
      event_type   = string
      lambda_arn   = string
      include_body = optional(bool, false)
    })), [])
    function_associations = optional(list(object({
      event_type   = string
      function_arn = string
    })), [])
    smooth_streaming = optional(bool, false)
    min_ttl          = optional(number, 0)
    default_ttl      = optional(number, 86400)
    max_ttl          = optional(number, 31536000)
  })
}

variable "ordered_cache_behaviors" {
  description = "Ordered list of cache behaviors for this distribution"
  type = list(object({
    path_pattern               = string
    allowed_methods            = list(string)
    cached_methods             = list(string)
    target_origin_id           = string
    compress                   = optional(bool, true)
    viewer_protocol_policy     = string
    cache_policy_id            = optional(string)
    origin_request_policy_id   = optional(string)
    response_headers_policy_id = optional(string)
    field_level_encryption_id  = optional(string)
    realtime_log_config_arn    = optional(string)
    trusted_key_groups         = optional(list(string))
    trusted_signers            = optional(list(string))
    lambda_function_associations = optional(list(object({
      event_type   = string
      lambda_arn   = string
      include_body = optional(bool, false)
    })), [])
    function_associations = optional(list(object({
      event_type   = string
      function_arn = string
    })), [])
    smooth_streaming = optional(bool, false)
    min_ttl          = optional(number, 0)
    default_ttl      = optional(number, 86400)
    max_ttl          = optional(number, 31536000)
  }))
  default = []
}

variable "custom_error_responses" {
  description = "List of custom error responses"
  type = list(object({
    error_caching_min_ttl = optional(number, 300)
    error_code            = number
    response_code         = optional(number)
    response_page_path    = optional(string)
  }))
  default = []
}

variable "geo_restriction_type" {
  description = "Method that you want to use to restrict distribution of your content by country: none, whitelist, or blacklist"
  type        = string
  default     = "none"
}

variable "geo_restriction_locations" {
  description = "ISO 3166-1-alpha-2 codes for which you want CloudFront either to distribute your content (whitelist) or not distribute your content (blacklist)"
  type        = list(string)
  default     = []
}

variable "acm_certificate_arn" {
  description = "ARN of the AWS Certificate Manager certificate that you wish to use with this distribution. The ACM certificate must be in US-EAST-1"
  type        = string
  default     = null
}

variable "minimum_protocol_version" {
  description = "Minimum version of the SSL protocol that you want CloudFront to use for HTTPS connections"
  type        = string
  default     = "TLSv1.2_2021"
}

variable "logging_enabled" {
  description = "Whether to enable logging"
  type        = bool
  default     = false
}

variable "logging_bucket" {
  description = "Amazon S3 bucket for logging where access logs are stored"
  type        = string
  default     = null
}

variable "logging_include_cookies" {
  description = "Whether to include cookies in access logs"
  type        = bool
  default     = false
}

variable "logging_prefix" {
  description = "Prefix added to the access log file names"
  type        = string
  default     = null
}

variable "web_acl_id" {
  description = "Unique identifier that specifies the AWS WAF web ACL, if any, to associate with this distribution"
  type        = string
  default     = null
}

variable "retain_on_delete" {
  description = "Disables the distribution instead of deleting it when destroying the resource through Terraform"
  type        = bool
  default     = false
}

variable "wait_for_deployment" {
  description = "If enabled, the resource will wait for the distribution status to change from InProgress to Deployed"
  type        = bool
  default     = true
}


variable "tags" {
  description = "A map of tags to assign to the resource"
  type        = map(string)
  default     = {}
}


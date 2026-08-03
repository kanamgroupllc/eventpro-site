# S3 Module - Variables

variable "bucket_name" {
  description = "Name of the S3 bucket"
  type        = string
}

variable "bucket_type" {
  description = "Type of bucket (e.g., 'images', 'frontend')"
  type        = string
}

variable "force_destroy" {
  description = "Whether to allow deletion of the bucket even if it contains objects"
  type        = bool
  default     = false
}

variable "versioning_enabled" {
  description = "Whether to enable versioning on the bucket"
  type        = bool
  default     = true
}

variable "kms_key_id" {
  description = "KMS key ID for server-side encryption. If not provided, AES256 is used."
  type        = string
  default     = null
}

variable "bucket_key_enabled" {
  description = "Whether to use Amazon S3 Bucket Keys for SSE-KMS"
  type        = bool
  default     = false
}

variable "block_public_acls" {
  description = "Whether to block public ACLs"
  type        = bool
  default     = true
}

variable "block_public_policy" {
  description = "Whether to block public bucket policies"
  type        = bool
  default     = true
}

variable "ignore_public_acls" {
  description = "Whether to ignore public ACLs"
  type        = bool
  default     = true
}

variable "restrict_public_buckets" {
  description = "Whether to restrict public bucket policies"
  type        = bool
  default     = true
}

variable "enable_cors" {
  description = "Whether to enable CORS configuration"
  type        = bool
  default     = false
}

variable "cors_rules" {
  description = "List of CORS rules"
  type = list(object({
    allowed_headers = optional(list(string))
    allowed_methods = list(string)
    allowed_origins = list(string)
    expose_headers  = optional(list(string))
    max_age_seconds = optional(number)
  }))
  default = []
}

variable "lifecycle_rules" {
  description = "List of lifecycle rules"
  type = list(object({
    id                                 = string
    status                             = string
    filter_prefix                      = optional(string)
    filter_tags                        = optional(map(string))
    expiration_days                    = optional(number)
    noncurrent_version_expiration_days = optional(number)
    transitions = optional(list(object({
      days          = number
      storage_class = string
    })))
    noncurrent_version_transitions = optional(list(object({
      noncurrent_days = number
      storage_class   = string
    })))
    abort_incomplete_multipart_upload_days = optional(number)
  }))
  default = []
}

variable "bucket_policy" {
  description = "JSON bucket policy document"
  type        = string
  default     = null
}

variable "enable_website" {
  description = "Whether to enable website configuration (for frontend bucket)"
  type        = bool
  default     = false
}

variable "index_document" {
  description = "Index document for website configuration"
  type        = string
  default     = "index.html"
}

variable "error_document" {
  description = "Error document for website configuration"
  type        = string
  default     = "error.html"
}

variable "tags" {
  description = "A map of tags to assign to the bucket"
  type        = map(string)
  default     = {}
}


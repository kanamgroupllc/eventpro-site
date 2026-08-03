# Lambda Secret Rotation Module - Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "image_uri" {
  description = "ECR image URI for the Lambda function"
  type        = string
}

variable "secret_arn" {
  description = "ARN of the secret to rotate"
  type        = string
}

variable "vpc_config" {
  description = "VPC configuration for Lambda (required if RDS is in VPC)"
  type = object({
    vpc_id                 = string
    subnet_ids             = list(string)
    rds_security_group_ids = list(string)
  })
  default = null
}

variable "timeout" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 60
}

variable "memory_size" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 256
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "db_sslmode" {
  description = "PostgreSQL SSL mode (require, prefer, disable)"
  type        = string
  default     = "require"
}

variable "tags" {
  description = "A map of tags to assign to all resources"
  type        = map(string)
  default     = {}
}


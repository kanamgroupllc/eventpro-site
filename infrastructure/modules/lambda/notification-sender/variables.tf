# Lambda Notification Sender Module - Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "lambda_image_uri" {
  description = "ECR image URI for the Lambda function"
  type        = string
}

variable "notification_queue_arn" {
  description = "ARN of the SQS notification queue"
  type        = string
}

variable "database_secret_arn" {
  description = "ARN of the RDS-managed Secrets Manager secret for database credentials"
  type        = string
}

variable "database_host" {
  description = "Database hostname (from RDS module)"
  type        = string
}

variable "database_port" {
  description = "Database port (from RDS module)"
  type        = number
}

variable "database_name" {
  description = "Database name (from RDS module)"
  type        = string
}

variable "ses_sender_email" {
  description = "SES sender email address"
  type        = string
  default     = "noreply@eventpro.com"
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "timeout_seconds" {
  description = "Lambda function timeout in seconds"
  type        = number
  default     = 60
}

variable "memory_size_mb" {
  description = "Lambda function memory size in MB"
  type        = number
  default     = 512
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "log_level" {
  description = "Quarkus log level"
  type        = string
  default     = "INFO"
}

variable "vpc_config" {
  description = "VPC configuration for Lambda (required for RDS access)"
  type = object({
    subnet_ids         = list(string)
    security_group_ids = list(string)
  })
  default = null
}

variable "enable_event_source_mapping" {
  description = "Enable SQS event source mapping"
  type        = bool
  default     = true
}

variable "batch_size" {
  description = "Maximum number of records to retrieve in a single batch"
  type        = number
  default     = 10
}

variable "maximum_batching_window_in_seconds" {
  description = "Maximum amount of time to gather records before invoking the function"
  type        = number
  default     = 5
}

variable "maximum_record_age_in_seconds" {
  description = "Maximum age of a record that Lambda sends to a function"
  type        = number
  default     = -1 # No limit
}

variable "bisect_batch_on_function_error" {
  description = "If the function returns an error, split the batch in two and retry"
  type        = bool
  default     = true
}

variable "maximum_retry_attempts" {
  description = "Maximum number of retry attempts for failed records"
  type        = number
  default     = 3
}

variable "function_response_types" {
  description = "List of function response types to apply"
  type        = list(string)
  default     = []
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default     = {}
}


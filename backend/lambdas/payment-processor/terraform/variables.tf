# Payment-processor Lambda Terraform - Variables

variable "image_registry" {
  description = "Container image registry hostname (e.g. 123456789012.dkr.ecr.us-east-1.amazonaws.com)"
  type        = string
}

variable "image_name" {
  description = "Container image name/repository (e.g. eventpro-payment-processor)"
  type        = string
}

variable "image_tag" {
  description = "Container image tag (e.g. git SHA or latest)"
  type        = string
}

variable "stripe_secret_key" {
  description = "Stripe secret key (pass via CI secrets)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "use_localstack" {
  description = "Route AWS provider calls to LocalStack endpoints"
  type        = bool
  default     = false
}

variable "localstack_endpoint" {
  description = "LocalStack endpoint used when use_localstack is true"
  type        = string
  default     = "http://localhost:4566"
}

variable "localstack_runtime_endpoint" {
  description = "LocalStack endpoint visible from Lambda runtime containers"
  type        = string
  default     = "http://host.docker.internal:4566"
}

variable "shared_infra_state_bucket" {
  description = "S3 bucket containing the shared infrastructure Terraform state"
  type        = string
  default     = "eventpro-site-state"
}

variable "shared_infra_state_key" {
  description = "Key for the shared infrastructure Terraform state file"
  type        = string
  default     = "shared-infra/terraform.tfstate"
}

variable "shared_infra_state_region" {
  description = "AWS region of the shared infrastructure Terraform state bucket"
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

variable "lambda_architecture" {
  description = "Instruction set architecture for the Lambda container image"
  type        = string
  default     = "x86_64"

  validation {
    condition     = contains(["x86_64", "arm64"], var.lambda_architecture)
    error_message = "lambda_architecture must be either x86_64 or arm64."
  }
}

variable "log_retention_in_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 7
}

variable "batch_size" {
  description = "Maximum number of SQS records per Lambda invocation"
  type        = number
  default     = 10
}

variable "new_relic_license_key" {
  description = "New Relic license key (pass via CI secrets)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "new_relic_account_id" {
  description = "New Relic account ID used by the Lambda extension for distributed tracing"
  type        = string
  default     = ""

  validation {
    condition     = var.new_relic_account_id == "" || can(regex("^[0-9]+$", var.new_relic_account_id))
    error_message = "new_relic_account_id must be a numeric New Relic account ID (or empty)."
  }
}

variable "tags" {
  description = "Tags to apply to resources"
  type        = map(string)
  default = {
    Project   = "eventpro"
    ManagedBy = "terraform"
  }
}

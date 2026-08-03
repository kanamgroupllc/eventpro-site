# Local Environment - Variables
# Variables for local development environment

variable "aws_region" {
  description = "AWS region (used for LocalStack)"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "local"
}

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
  default     = "eventpro-local"
}

variable "tags" {
  description = "Common tags for all resources"
  type        = map(string)
  default = {
    Environment = "local"
    Project     = "eventpro"
    ManagedBy   = "terraform"
  }
}


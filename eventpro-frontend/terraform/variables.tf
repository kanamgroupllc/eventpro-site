variable "domain_name" {
  description = "Domain (e.g., example.com)"
  type        = string
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

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default = {
    Project   = "eventpro"
    ManagedBy = "terraform"
  }
}

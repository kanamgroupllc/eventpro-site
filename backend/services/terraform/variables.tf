# Services Terraform - Variables
# Resource names use terraform.workspace prefix

variable "image_registry" {
  description = "Container image registry hostname (e.g. 123456789012.dkr.ecr.us-east-1.amazonaws.com)"
  type        = string
}

variable "image_name" {
  description = "Container image name/repository (e.g. eventpro-api)"
  type        = string
}

variable "image_tag" {
  description = "Container image tag (e.g. git SHA or latest)"
  type        = string
}

variable "domain_name" {
  description = "Domain for Route53 (e.g., example.com). Hosted zone must exist in account."
  type        = string
}

variable "aws_region" {
  description = "AWS region to deploy resources into"
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
  description = "LocalStack endpoint visible from ECS/Lambda runtime containers"
  type        = string
  default     = "http://host.docker.internal:4566"
}

variable "cors_allowed_origins" {
  description = "Additional browser origins allowed to call the API. The workspace frontend origin is always included."
  type        = list(string)
  default     = []
}

variable "csrf_enabled" {
  description = "Enable browser CSRF enforcement. Keep true except during a controlled client rollout or emergency rollback."
  type        = bool
  default     = true
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

# ECS
variable "ecs_container_port" {
  description = "Container port"
  type        = number
  default     = 8080
}

variable "ecs_task_cpu" {
  description = "Task CPU units (1024 = 1 vCPU)"
  type        = number
  default     = 1024
}

variable "ecs_task_memory" {
  description = "Task memory in MiB"
  type        = number
  default     = 2048
}

variable "ecs_desired_count" {
  description = "Desired task count"
  type        = number
  default     = 2
}

variable "ecs_enable_auto_scaling" {
  description = "Enable auto-scaling"
  type        = bool
  default     = true
}

variable "ecs_autoscaling_min_capacity" {
  description = "Min capacity"
  type        = number
  default     = 2
}

variable "ecs_autoscaling_max_capacity" {
  description = "Max capacity"
  type        = number
  default     = 10
}

variable "ecs_autoscaling_cpu_target_value" {
  description = "Target CPU utilization %"
  type        = number
  default     = 70
}

variable "ecs_autoscaling_memory_target_value" {
  description = "Target memory utilization %"
  type        = number
  default     = null
}

variable "ecs_log_retention_days" {
  description = "CloudWatch log retention"
  type        = number
  default     = 7
}

variable "ecs_container_insights" {
  description = "Enable Container Insights"
  type        = bool
  default     = false
}

variable "ecs_enable_execute_command" {
  description = "Enable ECS Exec"
  type        = bool
  default     = false
}

# ALB
variable "alb_internal" {
  description = "Internal ALB"
  type        = bool
  default     = false
}

variable "alb_enable_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

# Application secrets (sensitive - pass via CI secrets)
variable "stripe_secret_key" {
  description = "Stripe secret key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_publishable_key" {
  description = "Stripe publishable key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_webhook_secret" {
  description = "Stripe webhook secret"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_price_pro_monthly" {
  description = "Stripe recurring price ID for the Pro monthly subscription"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_price_pro_yearly" {
  description = "Stripe recurring price ID for the Pro yearly subscription"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_price_enterprise_monthly" {
  description = "Stripe recurring price ID for the Enterprise monthly subscription"
  type        = string
  default     = ""
  sensitive   = true
}

variable "stripe_price_enterprise_yearly" {
  description = "Stripe recurring price ID for the Enterprise yearly subscription"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_issuer" {
  description = "JWT issuer"
  type        = string
  default     = "eventpro"
}

variable "jwt_access_ttl_seconds" {
  description = "JWT access TTL"
  type        = number
  default     = 3600
}

variable "jwt_public_key" {
  description = "JWT public key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "jwt_private_key" {
  description = "JWT private key"
  type        = string
  default     = ""
  sensitive   = true
}

variable "new_relic_license_key" {
  description = "New Relic license key (pass via CI secrets)"
  type        = string
  default     = ""
  sensitive   = true
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default = {
    Project   = "eventpro"
    ManagedBy = "terraform"
  }
}

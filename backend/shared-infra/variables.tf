# Shared infrastructure variables
# Resource names use terraform.workspace prefix.

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

# RDS
variable "db_name" {
  description = "Database name"
  type        = string
  default     = "eventprodb"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  default     = "16"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Max allocated storage for autoscaling"
  type        = number
  default     = 100
}

variable "db_storage_type" {
  description = "Storage type"
  type        = string
  default     = "gp3"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ"
  type        = bool
  default     = false
}

variable "db_backup_retention_period" {
  description = "Backup retention in days"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Backup window"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Maintenance window"
  type        = string
  default     = "sun:04:00-sun:05:00"
}

variable "db_auto_minor_version_upgrade" {
  description = "Auto minor version upgrade"
  type        = bool
  default     = true
}

variable "db_monitoring_interval" {
  description = "Enhanced monitoring interval (0 to disable)"
  type        = number
  default     = 0
}

variable "db_performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = false
}

variable "db_deletion_protection" {
  description = "Enable deletion protection"
  type        = bool
  default     = false
}

# S3
variable "images_bucket_name" {
  description = "Optional explicit S3 bucket name for uploaded images. Leave empty to use a globally unique default name."
  type        = string
  default     = ""
}

# SQS
variable "order_queue_visibility_timeout_seconds" {
  description = "Order queue visibility timeout in seconds (match/exceed order-processor Lambda timeout)"
  type        = number
  default     = 60
}

variable "payment_queue_visibility_timeout_seconds" {
  description = "Payment queue visibility timeout in seconds (match/exceed payment-processor Lambda timeout)"
  type        = number
  default     = 60
}

variable "notification_queue_visibility_timeout_seconds" {
  description = "Notification queue visibility timeout in seconds (match/exceed notification-sender Lambda timeout)"
  type        = number
  default     = 60
}

variable "ecs_container_port" {
  description = "API ECS container port allowed from ALB"
  type        = number
  default     = 8080
}

variable "tags" {
  description = "Common tags"
  type        = map(string)
  default = {
    Project   = "eventpro"
    ManagedBy = "terraform"
  }
}

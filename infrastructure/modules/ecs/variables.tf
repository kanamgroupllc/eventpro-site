# ECS Module - Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "service_name" {
  description = "Name of the ECS service"
  type        = string
}

variable "container_name" {
  description = "Name of the container"
  type        = string
}

variable "container_image" {
  description = "Docker image to use for the container"
  type        = string
}

variable "container_port" {
  description = "Port on which the container listens"
  type        = number
  default     = 8080
}

variable "task_cpu" {
  description = "CPU units for the task (1024 = 1 vCPU)"
  type        = number
  default     = 512
}

variable "task_memory" {
  description = "Memory for the task in MiB"
  type        = number
  default     = 1024
}

variable "desired_count" {
  description = "Number of instances of the task definition to place and keep running"
  type        = number
  default     = 2
}

variable "private_subnet_ids" {
  description = "List of private subnet IDs for the ECS service"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for the ECS service"
  type        = list(string)
}

variable "target_group_arn" {
  description = "ARN of the target group to associate with the service"
  type        = string
  default     = null
}

variable "platform_version" {
  description = "Platform version on which to run your service (Fargate only)"
  type        = string
  default     = "LATEST"
}

variable "health_check_grace_period_seconds" {
  description = "Seconds to ignore failing load balancer health checks on newly instantiated tasks"
  type        = number
  default     = 60
}

variable "health_check" {
  description = "Health check configuration for the container"
  type = object({
    command     = list(string)
    interval    = number
    timeout     = number
    retries     = number
    startPeriod = number
  })
  default = null
}

variable "deployment_maximum_percent" {
  description = "Upper limit (as a percentage of desiredCount) of the number of running tasks that can be running in a service during a deployment"
  type        = number
  default     = 200
}

variable "deployment_minimum_healthy_percent" {
  description = "Lower limit (as a percentage of desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment"
  type        = number
  default     = 100
}

variable "deployment_circuit_breaker_enable" {
  description = "Whether to enable the deployment circuit breaker"
  type        = bool
  default     = true
}

variable "deployment_circuit_breaker_rollback" {
  description = "Whether to enable automatic rollback on deployment failure"
  type        = bool
  default     = true
}

variable "enable_execute_command" {
  description = "Whether to enable Amazon ECS Exec for the tasks within the service"
  type        = bool
  default     = false
}

variable "environment_variables" {
  description = "List of environment variables for the container"
  type = list(object({
    name  = string
    value = string
  }))
  default = []
}

variable "secrets" {
  description = "List of secrets from AWS Secrets Manager or SSM Parameter Store"
  type = list(object({
    name      = string
    valueFrom = string
  }))
  default = null
}

variable "log_retention_in_days" {
  description = "Number of days to retain logs in CloudWatch"
  type        = number
  default     = 7
}

variable "container_insights_enabled" {
  description = "Whether to enable CloudWatch Container Insights for the cluster"
  type        = bool
  default     = true
}

variable "enable_auto_scaling" {
  description = "Whether to enable auto-scaling for the service"
  type        = bool
  default     = true
}

variable "autoscaling_min_capacity" {
  description = "Minimum number of tasks for auto-scaling"
  type        = number
  default     = 2
}

variable "autoscaling_max_capacity" {
  description = "Maximum number of tasks for auto-scaling"
  type        = number
  default     = 10
}

variable "autoscaling_cpu_target_value" {
  description = "Target CPU utilization percentage for auto-scaling"
  type        = number
  default     = 70
}

variable "autoscaling_memory_target_value" {
  description = "Target memory utilization percentage for auto-scaling"
  type        = number
  default     = null
}

variable "autoscaling_scale_in_cooldown" {
  description = "Amount of time, in seconds, after a scale in activity completes before another scale in activity can start"
  type        = number
  default     = 300
}

variable "autoscaling_scale_out_cooldown" {
  description = "Amount of time, in seconds, after a scale out activity completes before another scale out activity can start"
  type        = number
  default     = 60
}

variable "task_role_policy" {
  description = "IAM policy document for the task role (JSON string)"
  type        = string
  default     = null
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}


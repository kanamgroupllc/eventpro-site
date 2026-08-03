# ALB Module - Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "service_name" {
  description = "Name of the service (used in target group names)"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "subnet_ids" {
  description = "List of subnet IDs for the ALB"
  type        = list(string)
}

variable "security_group_ids" {
  description = "List of security group IDs for the ALB"
  type        = list(string)
}

variable "internal" {
  description = "Whether the load balancer is internal or internet-facing"
  type        = bool
  default     = false
}

variable "enable_deletion_protection" {
  description = "Whether to enable deletion protection"
  type        = bool
  default     = false
}

variable "idle_timeout" {
  description = "Time in seconds that the connection is allowed to be idle"
  type        = number
  default     = 60
}

variable "access_logs_enabled" {
  description = "Whether to enable access logs"
  type        = bool
  default     = false
}

variable "access_logs_bucket" {
  description = "S3 bucket name for access logs"
  type        = string
  default     = null
}

variable "access_logs_prefix" {
  description = "S3 bucket prefix for access logs"
  type        = string
  default     = null
}

variable "certificate_arn" {
  description = "ARN of the ACM certificate for HTTPS listener"
  type        = string
}

variable "ssl_policy" {
  description = "Name of the SSL Policy for the listener"
  type        = string
  default     = "ELBSecurityPolicy-TLS13-1-2-2021-06"
}

variable "target_port" {
  description = "Port on which targets receive traffic"
  type        = number
  default     = 8080
}

variable "health_check_enabled" {
  description = "Whether health checks are enabled"
  type        = bool
  default     = true
}

variable "health_check_healthy_threshold" {
  description = "Number of consecutive health check successes required before considering a target healthy"
  type        = number
  default     = 2
}

variable "health_check_unhealthy_threshold" {
  description = "Number of consecutive health check failures required before considering a target unhealthy"
  type        = number
  default     = 3
}

variable "health_check_timeout" {
  description = "Amount of time, in seconds, during which no response from a target means a failed health check"
  type        = number
  default     = 5
}

variable "health_check_interval" {
  description = "Approximate amount of time, in seconds, between health checks of an individual target"
  type        = number
  default     = 30
}

variable "health_check_path" {
  description = "Destination for the health check request"
  type        = string
  default     = "/actuator/health"
}

variable "health_check_protocol" {
  description = "Protocol the load balancer uses when performing health checks on targets"
  type        = string
  default     = "HTTP"
}

variable "health_check_matcher" {
  description = "HTTP or gRPC codes to use when checking for a successful response from a target"
  type        = string
  default     = "200"
}

variable "deregistration_delay" {
  description = "Amount time for Elastic Load Balancing to wait before changing the state of a deregistering target from draining to unused"
  type        = number
  default     = 300
}

variable "slow_start" {
  description = "Amount time for targets to warm up before the load balancer sends them a full share of requests"
  type        = number
  default     = 0
}

variable "stickiness_enabled" {
  description = "Boolean to enable / disable stickiness"
  type        = bool
  default     = false
}

variable "stickiness_cookie_duration" {
  description = "Time period, in seconds, during which requests from a client should be routed to the same target"
  type        = number
  default     = 86400
}

variable "enable_blue_green" {
  description = "Whether to create a secondary target group for blue/green deployments"
  type        = bool
  default     = false
}

variable "path_routing_rules" {
  description = "Map of path-based routing rules. Key is rule name, value contains priority, path_patterns, target_group_arn, and optional host_header"
  type = map(object({
    priority         = number
    path_patterns    = list(string)
    target_group_arn = string
    host_header      = optional(list(string))
  }))
  default = {}
}

variable "tags" {
  description = "A map of tags to assign to the resources"
  type        = map(string)
  default     = {}
}

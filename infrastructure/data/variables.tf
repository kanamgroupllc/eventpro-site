# Data Source Variables

variable "route53_zone_name" {
  description = "Name of the Route53 hosted zone (e.g., example.com.)"
  type        = string
}

variable "route53_private_zone" {
  description = "Whether the hosted zone is private"
  type        = bool
  default     = false
}


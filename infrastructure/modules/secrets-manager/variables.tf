# Secrets Manager Module - Variables

variable "name_prefix" {
  description = "Prefix for resource names"
  type        = string
}

variable "secrets" {
  description = "Map of secrets to create. Key is the secret identifier, value contains secret configuration"
  type = map(object({
    name                    = string
    description             = optional(string)
    kms_key_id              = optional(string)
    recovery_window_in_days = optional(number, 30)
    tags                    = optional(map(string))

    # Secret Value - either secret_string or secret_key_value
    secret_string    = optional(string)
    secret_key_value = optional(map(string))

    # Rotation Configuration
    rotation_enabled                  = optional(bool, false)
    rotation_lambda_arn               = optional(string)
    rotate_immediately                = optional(bool, true)
    rotation_automatically_after_days = optional(number) # 30-90 days
    rotation_duration                 = optional(string) # e.g., "3h"
    rotation_schedule_expression      = optional(string) # cron() or rate() expression

    # IAM Policy
    policy              = optional(string)
    block_public_policy = optional(bool, true)
  }))
}

variable "tags" {
  description = "A map of tags to assign to all secrets"
  type        = map(string)
  default     = {}
}


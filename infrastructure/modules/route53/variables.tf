# Route53 Module - Variables

variable "zone_id" {
  description = "The ID of the hosted zone to contain the records"
  type        = string
}

variable "records" {
  description = "Map of Route53 records to create. Key is the record identifier, value contains record configuration"
  type = map(object({
    name    = string
    type    = string
    ttl     = optional(number)
    records = optional(list(string))

    # Alias Configuration
    alias = optional(object({
      name                   = string
      zone_id                = string
      evaluate_target_health = optional(bool, false)
    }))

    # Routing Policies
    set_identifier  = optional(string)
    health_check_id = optional(string)

    failover_routing_policy = optional(object({
      type = string # PRIMARY or SECONDARY
    }))

    weighted_routing_policy = optional(object({
      weight = number
    }))

    geolocation_routing_policy = optional(object({
      continent   = optional(string)
      country     = optional(string)
      subdivision = optional(string)
    }))

    latency_routing_policy = optional(object({
      region = string
    }))

    multivalue_answer_routing_policy = optional(bool, false)

    # Other Options
    allow_overwrite = optional(bool, false)

    # Tags
    tags = optional(map(string))
  }))
}

variable "tags" {
  description = "A map of tags to assign to all records"
  type        = map(string)
  default     = {}
}


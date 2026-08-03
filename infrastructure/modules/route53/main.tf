# Route53 Module - Main Configuration
# This module creates Route53 DNS records including alias records for CloudFront and ALB

# Route53 Records
resource "aws_route53_record" "records" {
  for_each = var.records

  zone_id = var.zone_id
  name    = each.value.name
  type    = each.value.type

  # TTL (required for non-alias records)
  ttl = each.value.alias != null ? null : each.value.ttl

  # Records (required for non-alias records)
  records = each.value.alias != null ? null : each.value.records

  # Alias Configuration (for CloudFront, ALB, etc.)
  dynamic "alias" {
    for_each = each.value.alias != null ? [each.value.alias] : []
    content {
      name                   = alias.value.name
      zone_id                = alias.value.zone_id
      evaluate_target_health = alias.value.evaluate_target_health
    }
  }

  # Set Identifier (for routing policies)
  set_identifier = each.value.set_identifier

  # Health Check ID
  health_check_id = each.value.health_check_id

  # Failover Routing Policy
  dynamic "failover_routing_policy" {
    for_each = each.value.failover_routing_policy != null ? [each.value.failover_routing_policy] : []
    content {
      type = failover_routing_policy.value.type
    }
  }

  # Weighted Routing Policy
  dynamic "weighted_routing_policy" {
    for_each = each.value.weighted_routing_policy != null ? [each.value.weighted_routing_policy] : []
    content {
      weight = weighted_routing_policy.value.weight
    }
  }

  # Geolocation Routing Policy
  dynamic "geolocation_routing_policy" {
    for_each = each.value.geolocation_routing_policy != null ? [each.value.geolocation_routing_policy] : []
    content {
      continent   = geolocation_routing_policy.value.continent
      country     = geolocation_routing_policy.value.country
      subdivision = geolocation_routing_policy.value.subdivision
    }
  }

  # Latency Routing Policy
  dynamic "latency_routing_policy" {
    for_each = each.value.latency_routing_policy != null ? [each.value.latency_routing_policy] : []
    content {
      region = latency_routing_policy.value.region
    }
  }

  # Multivalue Answer Routing Policy (only set when set_identifier is provided and policy is true)
  multivalue_answer_routing_policy = each.value.set_identifier != null && each.value.multivalue_answer_routing_policy == true ? true : null

  # Allow Overwrite
  allow_overwrite = each.value.allow_overwrite
}


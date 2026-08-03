# Route53 Module - Outputs

output "record_fqdns" {
  description = "Map of fully qualified domain names (FQDN) for each record (key is the record identifier)"
  value = {
    for k, v in aws_route53_record.records : k => v.fqdn
  }
}

output "record_names" {
  description = "Map of record names (key is the record identifier)"
  value = {
    for k, v in aws_route53_record.records : k => v.name
  }
}

output "record_ids" {
  description = "Map of record IDs (key is the record identifier)"
  value = {
    for k, v in aws_route53_record.records : k => "${v.zone_id}_${v.name}_${v.type}"
  }
}


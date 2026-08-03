# Secrets Manager Module - Outputs

output "secret_arns" {
  description = "Map of secret ARNs (key is the secret identifier)"
  value = {
    for k, v in aws_secretsmanager_secret.secrets : k => v.arn
  }
}

output "secret_ids" {
  description = "Map of secret IDs (key is the secret identifier)"
  value = {
    for k, v in aws_secretsmanager_secret.secrets : k => v.id
  }
}

output "secret_names" {
  description = "Map of secret names (key is the secret identifier)"
  value = {
    for k, v in aws_secretsmanager_secret.secrets : k => v.name
  }
}

output "secret_version_ids" {
  description = "Map of secret version IDs (key is the secret identifier)"
  value = {
    for k, v in aws_secretsmanager_secret_version.secrets : k => v.version_id
  }
}

output "rotation_enabled" {
  description = "Map indicating which secrets have rotation enabled (key is the secret identifier)"
  value = {
    for k, v in var.secrets : k => v.rotation_enabled
  }
}

output "rotation_arns" {
  description = "Map of rotation ARNs for secrets with rotation enabled (key is the secret identifier)"
  value = {
    for k, v in aws_secretsmanager_secret_rotation.secrets : k => v.arn
  }
}


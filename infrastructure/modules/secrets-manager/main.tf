# Secrets Manager Module - Main Configuration
# This module creates AWS Secrets Manager secrets with rotation and IAM policies

# Secrets
resource "aws_secretsmanager_secret" "secrets" {
  for_each = var.secrets

  name                    = "${var.name_prefix}-${each.value.name}"
  description             = each.value.description
  kms_key_id              = each.value.kms_key_id
  recovery_window_in_days = each.value.recovery_window_in_days

  tags = merge(
    var.tags,
    each.value.tags != null ? each.value.tags : {},
    {
      Name = "${var.name_prefix}-${each.value.name}"
    }
  )
}

# Secret Versions
resource "aws_secretsmanager_secret_version" "secrets" {
  for_each = var.secrets

  secret_id     = aws_secretsmanager_secret.secrets[each.key].id
  secret_string = each.value.secret_string != null ? each.value.secret_string : jsonencode(each.value.secret_key_value)

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# Secret Rotation
resource "aws_secretsmanager_secret_rotation" "secrets" {
  for_each = {
    for k, v in var.secrets : k => v
    if v.rotation_enabled && v.rotation_lambda_arn != null
  }

  secret_id           = aws_secretsmanager_secret.secrets[each.key].id
  rotation_lambda_arn = each.value.rotation_lambda_arn
  rotate_immediately  = each.value.rotate_immediately

  rotation_rules {
    automatically_after_days = each.value.rotation_automatically_after_days
    duration                 = each.value.rotation_duration
    schedule_expression      = each.value.rotation_schedule_expression
  }
}

# Secret Policies
resource "aws_secretsmanager_secret_policy" "secrets" {
  for_each = {
    for k, v in var.secrets : k => v
    if v.policy != null
  }

  secret_arn          = aws_secretsmanager_secret.secrets[each.key].arn
  policy              = each.value.policy
  block_public_policy = each.value.block_public_policy
}


# RDS PostgreSQL with manage_master_user_password (Secrets Manager)
# Uses default VPC subnets.

resource "aws_db_subnet_group" "main" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-db-subnet-group" })
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-postgres16-params"
  family = "postgres16"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
    # Static Postgres parameters must be applied on reboot, not immediately.
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "log_connections"
    value = "1"
  }

  parameter {
    name  = "log_disconnections"
    value = "1"
  }

  parameter {
    name  = "log_statement"
    value = "ddl"
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-postgres16-params" })
}

resource "aws_db_instance" "main" {
  identifier = "${local.name_prefix}-rds"

  engine         = "postgres"
  engine_version = var.db_engine_version
  instance_class = var.db_instance_class

  db_name                     = var.db_name
  username                    = "accessplus"
  manage_master_user_password = true
  port                        = var.use_localstack ? null : 5432

  allocated_storage     = var.db_allocated_storage
  max_allocated_storage = var.use_localstack ? 0 : var.db_max_allocated_storage
  storage_type          = var.db_storage_type
  storage_encrypted     = true

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = true

  multi_az = var.db_multi_az

  backup_retention_period = var.db_backup_retention_period
  backup_window           = var.db_backup_window
  copy_tags_to_snapshot   = true

  maintenance_window          = var.db_maintenance_window
  auto_minor_version_upgrade  = var.db_auto_minor_version_upgrade
  allow_major_version_upgrade = false

  parameter_group_name = aws_db_parameter_group.main.name

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  monitoring_interval             = var.db_monitoring_interval
  performance_insights_enabled    = var.db_performance_insights_enabled

  deletion_protection       = var.db_deletion_protection
  skip_final_snapshot       = !var.db_deletion_protection
  final_snapshot_identifier = var.db_deletion_protection ? "${local.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-rds" })

  lifecycle {
    ignore_changes = [
      password,
      final_snapshot_identifier,
    ]
  }
}

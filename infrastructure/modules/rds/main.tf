# RDS Module - Main Configuration
# This module creates an RDS PostgreSQL 16+ instance with Multi-AZ, backups, and encryption
# RDS manages master user password automatically via Secrets Manager

# DB Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.name_prefix}-db-subnet-group"
  subnet_ids = var.private_subnet_ids

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-db-subnet-group"
    }
  )
}

# DB Parameter Group for PostgreSQL 16
resource "aws_db_parameter_group" "main" {
  name   = "${var.name_prefix}-postgres16-params"
  family = "postgres16"

  # Common PostgreSQL parameters for better performance
  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
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

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-postgres16-params"
    }
  )
}

# RDS Instance
resource "aws_db_instance" "main" {
  identifier = var.db_instance_identifier

  # Engine Configuration
  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  # Database Configuration
  db_name  = var.db_name
  username = "accessplus"
  # RDS manages master user password automatically via Secrets Manager
  manage_master_user_password = true
  port                        = 5432

  # Storage Configuration
  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = var.storage_type
  storage_encrypted     = true

  # Network Configuration
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [var.security_group_id]
  publicly_accessible    = false

  # Multi-AZ Configuration
  multi_az = var.multi_az

  # Backup Configuration
  backup_retention_period = var.backup_retention_period
  backup_window           = var.backup_window
  copy_tags_to_snapshot   = true

  # Maintenance Configuration
  maintenance_window          = var.maintenance_window
  auto_minor_version_upgrade  = var.auto_minor_version_upgrade
  allow_major_version_upgrade = false

  # Parameter Group
  parameter_group_name = aws_db_parameter_group.main.name

  # Monitoring
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  monitoring_interval                   = var.monitoring_interval
  monitoring_role_arn                   = var.monitoring_role_arn
  performance_insights_enabled          = var.performance_insights_enabled
  performance_insights_retention_period = var.performance_insights_enabled ? var.performance_insights_retention_period : null

  # Deletion Protection
  deletion_protection       = var.deletion_protection
  skip_final_snapshot       = !var.deletion_protection
  final_snapshot_identifier = var.deletion_protection ? "${var.name_prefix}-final-snapshot-${formatdate("YYYY-MM-DD-hhmm", timestamp())}" : null

  # Tags
  tags = merge(
    var.tags,
    {
      Name = var.db_instance_identifier
    }
  )

  # Lifecycle
  lifecycle {
    ignore_changes = [
      password,
      final_snapshot_identifier,
      master_user_secret, # RDS manages this automatically
    ]
  }
}


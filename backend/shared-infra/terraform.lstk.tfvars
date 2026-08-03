domain_name         = "localhost.localstack.cloud"
aws_region          = "us-east-1"
use_localstack      = true
localstack_endpoint = "http://localhost:4566"

db_instance_class               = "db.t3.micro"
db_allocated_storage            = 20
db_multi_az                     = false
db_backup_retention_period      = 0
db_deletion_protection          = false
db_monitoring_interval          = 0
db_performance_insights_enabled = false

tags = {
  Project   = "eventpro"
  ManagedBy = "terraform"
  Target    = "localstack"
}

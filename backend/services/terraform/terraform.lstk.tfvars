domain_name                 = "localhost.localstack.cloud"
aws_region                  = "us-east-1"
use_localstack              = true
localstack_endpoint         = "http://localhost:4566"
localstack_runtime_endpoint = "http://localhost.localstack.cloud:4566"

ecs_desired_count              = 1
ecs_enable_auto_scaling        = false
ecs_container_insights         = false
ecs_enable_execute_command     = false
alb_enable_deletion_protection = false

cors_allowed_origins = [
  "https://lstk-app.localhost.localstack.cloud",
  "https://localhost.localstack.cloud:4566",
]

tags = {
  Project   = "eventpro"
  ManagedBy = "terraform"
  Target    = "localstack"
}

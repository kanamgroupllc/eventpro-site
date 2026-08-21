aws_region                  = "us-east-1"
use_localstack              = true
localstack_endpoint         = "http://localhost:4566"
localstack_runtime_endpoint = "http://localhost.localstack.cloud:4566"
lambda_architecture         = "x86_64"
memory_size_mb              = 1024
timeout_seconds             = 60
email_provider              = "log"

tags = {
  Project   = "eventpro"
  ManagedBy = "terraform"
  Target    = "localstack"
}

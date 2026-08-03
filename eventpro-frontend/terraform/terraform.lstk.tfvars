domain_name         = "localhost.localstack.cloud"
aws_region          = "us-east-1"
use_localstack      = true
localstack_endpoint = "http://localhost:4566"

tags = {
  Project   = "eventpro"
  ManagedBy = "terraform"
  Target    = "localstack"
}

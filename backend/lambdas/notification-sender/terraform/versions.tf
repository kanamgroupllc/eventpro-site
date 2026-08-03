terraform {
  required_version = ">= 1.12.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.31.0"
    }
  }

  backend "s3" {
    bucket       = "eventpro-site-state"
    key          = "notification/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
  }
}

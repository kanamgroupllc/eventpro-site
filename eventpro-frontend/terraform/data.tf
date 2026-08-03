# Shared infrastructure Terraform outputs

locals {
  shared_infra_remote_state_config = merge(
    {
      bucket = var.shared_infra_state_bucket
      key    = var.shared_infra_state_key
      region = var.shared_infra_state_region
    },
    jsondecode(var.use_localstack ? jsonencode({
      access_key                  = "test"
      secret_key                  = "test"
      skip_credentials_validation = true
      skip_metadata_api_check     = true
      skip_region_validation      = true
      skip_requesting_account_id  = true
      skip_s3_checksum            = true
      use_path_style              = true
      endpoints = {
        s3  = var.localstack_endpoint
        sts = var.localstack_endpoint
      }
    }) : "{}")
  )
}

data "terraform_remote_state" "shared_infra" {
  backend   = "s3"
  workspace = terraform.workspace

  config = local.shared_infra_remote_state_config
}

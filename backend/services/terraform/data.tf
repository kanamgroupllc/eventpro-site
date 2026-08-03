# Data sources and remote shared infrastructure state

data "aws_region" "current" {}

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

  workspace   = terraform.workspace
  name_prefix = local.workspace
  image_uri   = "${var.image_registry}/${var.image_name}:${var.image_tag}"
  common_tags = merge(var.tags, { Env = local.workspace })
  cors_allowed_origins = distinct(concat(
    ["https://${terraform.workspace}-app.${var.domain_name}"],
    var.use_localstack ? [
      "https://localhost.localstack.cloud:4566",
      "http://localhost.localstack.cloud:4566",
      "http://localhost:4566"
    ] : [],
    var.cors_allowed_origins
  ))
  cors_environment_variables = [
    for index, origin in local.cors_allowed_origins : {
      name  = "EVENTPRO_CORS_ALLOWED_ORIGINS_${index}"
      value = origin
    }
  ]
}

data "terraform_remote_state" "shared_infra" {
  backend   = "s3"
  workspace = terraform.workspace

  config = local.shared_infra_remote_state_config
}

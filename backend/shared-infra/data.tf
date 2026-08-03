# Shared data sources and naming locals

data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

data "aws_route53_zone" "main" {
  name         = var.domain_name
  private_zone = false
}

locals {
  workspace                  = terraform.workspace
  name_prefix                = local.workspace
  common_tags                = merge(var.tags, { Env = local.workspace })
  default_images_bucket_name = "eventpro-${lower(local.workspace)}-${data.aws_caller_identity.current.account_id}-${data.aws_region.current.region}-images"
  images_bucket_name         = var.images_bucket_name != "" ? var.images_bucket_name : local.default_images_bucket_name
}
 
# LocalStack-only image repositories. Real AWS repositories remain managed by
# the existing release pipeline and are intentionally not duplicated here.

locals {
  localstack_ecr_repositories = var.use_localstack ? toset([
    "eventpro-api",
    "eventpro-order-processor",
    "eventpro-payment-processor",
    "eventpro-notification-sender",
  ]) : toset([])
}

resource "aws_ecr_repository" "localstack" {
  for_each = local.localstack_ecr_repositories

  name         = each.value
  force_delete = true

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = merge(local.common_tags, { Name = each.value })
}

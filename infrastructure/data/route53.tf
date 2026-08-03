# Route53 Data Source
# References an existing Route53 hosted zone

data "aws_route53_zone" "main" {
  name         = var.route53_zone_name
  private_zone = var.route53_private_zone
}


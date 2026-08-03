# Route53 A record: ${workspace}-api.${domain_name} -> ALB

resource "aws_route53_record" "api" {
  allow_overwrite = true
  zone_id         = data.terraform_remote_state.shared_infra.outputs.route53_zone_id
  name            = "${terraform.workspace}-api.${var.domain_name}"
  type            = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

resource "aws_route53_record" "api_ipv6" {
  allow_overwrite = true
  zone_id         = data.terraform_remote_state.shared_infra.outputs.route53_zone_id
  name            = "${terraform.workspace}-api.${var.domain_name}"
  type            = "AAAA"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

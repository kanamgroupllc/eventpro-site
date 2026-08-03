# Route53 A record: ${workspace}-app.${domain_name} -> CloudFront

resource "aws_route53_record" "app" {
  zone_id = data.terraform_remote_state.shared_infra.outputs.route53_zone_id
  name    = "${terraform.workspace}-app.${var.domain_name}"
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.frontend.domain_name
    zone_id                = aws_cloudfront_distribution.frontend.hosted_zone_id
    evaluate_target_health = false
  }
}

# Application Load Balancer for ECS API

resource "aws_lb" "main" {
  name               = "${local.name_prefix}-alb"
  internal           = var.alb_internal
  load_balancer_type = "application"
  security_groups    = [data.terraform_remote_state.shared_infra.outputs.alb_security_group_id]
  subnets            = data.terraform_remote_state.shared_infra.outputs.service_subnet_ids

  enable_deletion_protection = var.alb_enable_deletion_protection
  enable_http2               = var.use_localstack ? false : true
  idle_timeout               = 60

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-alb" })
}

resource "aws_lb_target_group" "api" {
  name        = "${local.name_prefix}-api-primary"
  port        = var.ecs_container_port
  protocol    = "HTTP"
  vpc_id      = data.terraform_remote_state.shared_infra.outputs.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    unhealthy_threshold = 3
    timeout             = 5
    interval            = 30
    path                = "/actuator/health"
    protocol            = "HTTP"
    matcher             = "200"
    port                = "traffic-port"
  }

  deregistration_delay = 300

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-api-primary-tg" })
}

# HTTP listener - redirect to HTTPS
resource "aws_lb_listener" "http_redirect" {
  load_balancer_arn = aws_lb.main.arn
  port              = var.use_localstack ? 4566 : 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-alb-http-listener" })
}

# HTTPS listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = data.terraform_remote_state.shared_infra.outputs.alb_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-alb-https-listener" })
}

# ALB Module - Main Configuration
# This module creates an Application Load Balancer with HTTPS listener, target groups, and routing rules

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.name_prefix}-alb"
  internal           = var.internal
  load_balancer_type = "application"
  security_groups    = var.security_group_ids
  subnets            = var.subnet_ids

  enable_deletion_protection = var.enable_deletion_protection
  enable_http2               = true
  idle_timeout               = var.idle_timeout

  # Access logs (optional)
  dynamic "access_logs" {
    for_each = var.access_logs_enabled ? [1] : []
    content {
      bucket  = var.access_logs_bucket
      prefix  = var.access_logs_prefix
      enabled = true
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-alb"
    }
  )
}

# Target Group for Primary (Blue)
resource "aws_lb_target_group" "primary" {
  name        = "${var.name_prefix}-${var.service_name}-primary"
  port        = var.target_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    timeout             = var.health_check_timeout
    interval            = var.health_check_interval
    path                = var.health_check_path
    protocol            = var.health_check_protocol
    matcher             = var.health_check_matcher
    port                = "traffic-port"
  }

  deregistration_delay = var.deregistration_delay
  slow_start           = var.slow_start

  stickiness {
    enabled         = var.stickiness_enabled
    type            = "lb_cookie"
    cookie_duration = var.stickiness_cookie_duration
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-primary-tg"
      Type = "primary"
    }
  )
}

# Target Group for Secondary (Green) - for blue/green deployments
resource "aws_lb_target_group" "secondary" {
  count = var.enable_blue_green ? 1 : 0

  name        = "${var.name_prefix}-${var.service_name}-secondary"
  port        = var.target_port
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = var.health_check_healthy_threshold
    unhealthy_threshold = var.health_check_unhealthy_threshold
    timeout             = var.health_check_timeout
    interval            = var.health_check_interval
    path                = var.health_check_path
    protocol            = var.health_check_protocol
    matcher             = var.health_check_matcher
    port                = "traffic-port"
  }

  deregistration_delay = var.deregistration_delay
  slow_start           = var.slow_start

  stickiness {
    enabled         = var.stickiness_enabled
    type            = "lb_cookie"
    cookie_duration = var.stickiness_cookie_duration
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-secondary-tg"
      Type = "secondary"
    }
  )
}

# HTTP Listener (redirects to HTTPS)
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-alb-http-listener"
    }
  )
}

# HTTPS Listener
resource "aws_lb_listener" "https" {
  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = var.ssl_policy
  certificate_arn   = var.certificate_arn

  # Forward action (always required)
  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.primary.arn
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-alb-https-listener"
    }
  )
}

# Listener Rules for path-based routing
resource "aws_lb_listener_rule" "path_routing" {
  for_each = var.path_routing_rules

  listener_arn = aws_lb_listener.https.arn
  priority     = each.value.priority

  action {
    type             = "forward"
    target_group_arn = each.value.target_group_arn != null ? each.value.target_group_arn : aws_lb_target_group.primary.arn
  }

  condition {
    path_pattern {
      values = each.value.path_patterns
    }
  }

  # Optional: Host header condition
  dynamic "condition" {
    for_each = each.value.host_header != null ? [1] : []
    content {
      host_header {
        values = each.value.host_header
      }
    }
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${each.key}-rule"
    }
  )
}

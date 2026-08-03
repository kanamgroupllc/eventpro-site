# ECS Module - Main Configuration
# This module creates an ECS Fargate service with cluster, task definition, auto-scaling, and CloudWatch logging

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "main" {
  name              = "/ecs/${var.name_prefix}/${var.service_name}"
  retention_in_days = var.log_retention_in_days

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-logs"
    }
  )
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.container_insights_enabled ? "enabled" : "disabled"
  }

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-cluster"
    }
  )
}

# IAM Role for ECS Task Execution (allows ECS to pull images, write logs, etc.)
resource "aws_iam_role" "ecs_execution" {
  name = "${var.name_prefix}-${var.service_name}-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-execution-role"
    }
  )
}

# Attach AWS managed policy for ECS task execution
resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Task (allows application to access AWS services)
resource "aws_iam_role" "ecs_task" {
  name = "${var.name_prefix}-${var.service_name}-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-task-role"
    }
  )
}

# Additional IAM policy for task role (e.g., SQS, S3, Secrets Manager access)
resource "aws_iam_role_policy" "ecs_task" {
  name = "${var.name_prefix}-${var.service_name}-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = var.task_role_policy != null ? var.task_role_policy : jsonencode({
    Version   = "2012-10-17"
    Statement = []
  })
}

# ECS Task Definition
resource "aws_ecs_task_definition" "main" {
  family                   = "${var.name_prefix}-${var.service_name}"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.task_cpu
  memory                   = var.task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  container_definitions = jsonencode([
    {
      name      = var.container_name
      image     = var.container_image
      essential = true

      portMappings = [
        {
          containerPort = var.container_port
          protocol      = "tcp"
        }
      ]

      environment = var.environment_variables

      secrets = var.secrets != null ? var.secrets : []

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.main.name
          "awslogs-region"        = data.aws_region.current.id
          "awslogs-stream-prefix" = "ecs"
        }
      }

      healthCheck = var.health_check != null ? var.health_check : null
    }
  ])

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-task"
    }
  )
}

# Data source for current AWS region
data "aws_region" "current" {}

# ECS Service
resource "aws_ecs_service" "main" {
  name             = "${var.name_prefix}-${var.service_name}"
  cluster          = aws_ecs_cluster.main.id
  task_definition  = aws_ecs_task_definition.main.arn
  desired_count    = var.desired_count
  launch_type      = "FARGATE"
  platform_version = var.platform_version

  network_configuration {
    subnets          = var.private_subnet_ids
    security_groups  = var.security_group_ids
    assign_public_ip = false
  }

  dynamic "load_balancer" {
    for_each = var.target_group_arn != null ? [1] : []
    content {
      target_group_arn = var.target_group_arn
      container_name   = var.container_name
      container_port   = var.container_port
    }
  }

  health_check_grace_period_seconds = var.health_check_grace_period_seconds

  deployment_maximum_percent         = var.deployment_maximum_percent
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent

  deployment_circuit_breaker {
    enable   = var.deployment_circuit_breaker_enable
    rollback = var.deployment_circuit_breaker_rollback
  }

  deployment_controller {
    type = "ECS"
  }

  enable_execute_command = var.enable_execute_command

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}"
    }
  )

  # Ignore desired_count changes to allow auto-scaling to manage it
  lifecycle {
    ignore_changes = [desired_count]
  }

}

# Application Auto Scaling Target
resource "aws_appautoscaling_target" "ecs_target" {
  count              = var.enable_auto_scaling ? 1 : 0
  max_capacity       = var.autoscaling_max_capacity
  min_capacity       = var.autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.main.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(
    var.tags,
    {
      Name = "${var.name_prefix}-${var.service_name}-autoscaling-target"
    }
  )
}

# Application Auto Scaling Policy (CPU-based)
resource "aws_appautoscaling_policy" "ecs_cpu" {
  count              = var.enable_auto_scaling && var.autoscaling_cpu_target_value != null ? 1 : 0
  name               = "${var.name_prefix}-${var.service_name}-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }

    target_value       = var.autoscaling_cpu_target_value
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
    disable_scale_in   = false
  }
}

# Application Auto Scaling Policy (Memory-based)
resource "aws_appautoscaling_policy" "ecs_memory" {
  count              = var.enable_auto_scaling && var.autoscaling_memory_target_value != null ? 1 : 0
  name               = "${var.name_prefix}-${var.service_name}-memory-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target[0].resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }

    target_value       = var.autoscaling_memory_target_value
    scale_in_cooldown  = var.autoscaling_scale_in_cooldown
    scale_out_cooldown = var.autoscaling_scale_out_cooldown
    disable_scale_in   = false
  }
}


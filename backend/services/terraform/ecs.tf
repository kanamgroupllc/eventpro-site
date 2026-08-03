# ECS Fargate cluster, service, and task definition for EventPro API

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name_prefix}/eventpro-api"
  retention_in_days = var.ecs_log_retention_days

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eventpro-api-logs" })
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name_prefix}-cluster"

  setting {
    name  = "containerInsights"
    value = var.ecs_container_insights ? "enabled" : "disabled"
  }

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-cluster" })
}

# ECS Task Execution Role (pull images, write logs)
resource "aws_iam_role" "ecs_execution" {
  name = "${local.name_prefix}-eventpro-api-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eventpro-api-execution-role" })
}

resource "aws_iam_role_policy_attachment" "ecs_execution" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS Task Role (SQS, S3, Secrets Manager, SES, SNS)
resource "aws_iam_role" "ecs_task" {
  name = "${local.name_prefix}-eventpro-api-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eventpro-api-task-role" })
}

resource "aws_iam_role_policy" "ecs_task" {
  name = "${local.name_prefix}-eventpro-api-task-policy"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = ["sqs:SendMessage", "sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:GetQueueAttributes"]
        Resource = [
          data.terraform_remote_state.shared_infra.outputs.order_queue_arn,
          data.terraform_remote_state.shared_infra.outputs.payment_queue_arn,
          data.terraform_remote_state.shared_infra.outputs.notification_queue_arn
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${data.terraform_remote_state.shared_infra.outputs.s3_images_bucket_arn}/*"
      },
      {
        Effect   = "Allow"
        Action   = ["ses:SendEmail", "ses:SendRawEmail"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = [data.terraform_remote_state.shared_infra.outputs.db_master_user_secret_arn]
      }
    ]
  })
}

resource "aws_ecs_task_definition" "api" {
  family                   = "${local.name_prefix}-eventpro-api"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.ecs_task_cpu
  memory                   = var.ecs_task_memory
  execution_role_arn       = aws_iam_role.ecs_execution.arn
  task_role_arn            = aws_iam_role.ecs_task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "eventpro-api"
    image     = local.image_uri
    essential = true

    portMappings = [{
      containerPort = var.ecs_container_port
      hostPort      = var.ecs_container_port
      protocol      = "tcp"
    }]

    mountPoints = []
    volumesFrom = []

    environment = concat(
      [
        { name = "SPRING_PROFILES_ACTIVE", value = local.workspace },
        { name = "DB_HOST", value = data.terraform_remote_state.shared_infra.outputs.rds_runtime_host },
        { name = "DB_PORT", value = tostring(data.terraform_remote_state.shared_infra.outputs.rds_port) },
        { name = "DB_NAME", value = data.terraform_remote_state.shared_infra.outputs.rds_name },
        { name = "AWS_REGION", value = data.aws_region.current.id },
        { name = "DB_SECRET_ARN", value = data.terraform_remote_state.shared_infra.outputs.db_master_user_secret_arn },
        { name = "S3_BUCKET_NAME", value = data.terraform_remote_state.shared_infra.outputs.s3_images_bucket_id },
        { name = "ORDER_QUEUE_URL", value = data.terraform_remote_state.shared_infra.outputs.order_queue_url },
        { name = "PAYMENT_QUEUE_URL", value = data.terraform_remote_state.shared_infra.outputs.payment_queue_url },
        { name = "NOTIFICATION_QUEUE_URL", value = data.terraform_remote_state.shared_infra.outputs.notification_queue_url },
        { name = "JWT_ISSUER", value = var.jwt_issuer },
        { name = "JWT_ACCESS_TTL_SECONDS", value = tostring(var.jwt_access_ttl_seconds) },
        { name = "EVENTPRO_CSRF_ENABLED", value = tostring(var.csrf_enabled) }
      ],
      local.cors_environment_variables,
      var.use_localstack ? [
        { name = "AWS_ACCESS_KEY_ID", value = "test" },
        { name = "AWS_SECRET_ACCESS_KEY", value = "test" },
        { name = "AWS_ENDPOINT_URL", value = var.localstack_runtime_endpoint },
        { name = "AWS_S3_PUBLIC_ENDPOINT", value = "https://localhost.localstack.cloud:4566" },
        { name = "AWS_SECRETS_MANAGER_ENDPOINT", value = var.localstack_runtime_endpoint },
        { name = "SQS_ENDPOINT", value = var.localstack_runtime_endpoint },
        { name = "SES_ENDPOINT", value = var.localstack_runtime_endpoint },
        { name = "NEW_RELIC_AGENT_ENABLED", value = "false" },
        { name = "SPRING_JPA_HIBERNATE_DDL_AUTO", value = "none" },
        { name = "SPRING_JPA_PROPERTIES_HIBERNATE_BOOT_ALLOW_JDBC_METADATA_ACCESS", value = "false" },
        {
          name = "SPRING_APPLICATION_JSON"
          value = jsonencode({
            spring = {
              jpa = {
                hibernate = {
                  "ddl-auto" = "none"
                }
                properties = {
                  "hibernate.boot.allow_jdbc_metadata_access" = "false"
                  "hibernate.temp.use_jdbc_metadata_defaults" = "false"
                }
              }
            }
          })
        }
      ] : [],
      [
        for k, v in {
          STRIPE_SECRET_KEY               = var.stripe_secret_key
          STRIPE_PUBLISHABLE_KEY          = var.stripe_publishable_key
          STRIPE_WEBHOOK_SECRET           = var.stripe_webhook_secret
          STRIPE_PRICE_PRO_MONTHLY        = var.stripe_price_pro_monthly
          STRIPE_PRICE_PRO_YEARLY         = var.stripe_price_pro_yearly
          STRIPE_PRICE_ENTERPRISE_MONTHLY = var.stripe_price_enterprise_monthly
          STRIPE_PRICE_ENTERPRISE_YEARLY  = var.stripe_price_enterprise_yearly
          JWT_PUBLIC_KEY                  = var.jwt_public_key
          JWT_PRIVATE_KEY                 = var.jwt_private_key
        } : { name = k, value = v } if v != ""
      ],
      var.new_relic_license_key != "" ? [
        { name = "NEW_RELIC_APP_NAME", value = "eventpro-site-${local.workspace}" },
        { name = "NEW_RELIC_LICENSE_KEY", value = var.new_relic_license_key },
        { name = "NEW_RELIC_AGENT_ENABLED", value = "true" },
        { name = "NEW_RELIC_DISTRIBUTED_TRACING_ENABLED", value = "true" },
        { name = "NEW_RELIC_LOG_LEVEL", value = "info" },
        { name = "NEW_RELIC_LOG_FILE_NAME", value = "STDOUT" },
        { name = "NEW_RELIC_LABELS", value = "env:${local.workspace};service:eventpro-api" }
      ] : []
    )

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.api.name
        "awslogs-region"        = data.aws_region.current.id
        "awslogs-stream-prefix" = "ecs"
      }
    }

    healthCheck = {
      command     = ["CMD-SHELL", "curl -f http://localhost:${var.ecs_container_port}/actuator/health || exit 1"]
      interval    = 30
      timeout     = 5
      retries     = 3
      startPeriod = 60
    }
  }])

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eventpro-api-task" })
}

resource "aws_ecs_service" "api" {
  name                  = "${local.name_prefix}-eventpro-api"
  cluster               = aws_ecs_cluster.main.id
  task_definition       = aws_ecs_task_definition.api.arn
  desired_count         = var.ecs_desired_count
  launch_type           = "FARGATE"
  platform_version      = "LATEST"
  wait_for_steady_state = !var.use_localstack

  network_configuration {
    subnets          = data.terraform_remote_state.shared_infra.outputs.service_subnet_ids
    security_groups  = [data.terraform_remote_state.shared_infra.outputs.app_security_group_id]
    assign_public_ip = true # Default VPC subnets are typically public
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "eventpro-api"
    container_port   = var.ecs_container_port
  }

  health_check_grace_period_seconds = var.use_localstack ? 0 : 60

  deployment_maximum_percent         = 200
  deployment_minimum_healthy_percent = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  deployment_controller {
    type = "ECS"
  }

  enable_execute_command = var.ecs_enable_execute_command

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eventpro-api" })

  lifecycle {
    ignore_changes = [desired_count]
  }
}

# Auto-scaling
resource "aws_appautoscaling_target" "api" {
  count = var.ecs_enable_auto_scaling ? 1 : 0

  max_capacity       = var.ecs_autoscaling_max_capacity
  min_capacity       = var.ecs_autoscaling_min_capacity
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.api.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"

  tags = merge(local.common_tags, { Name = "${local.name_prefix}-eventpro-api-autoscaling-target" })
}

resource "aws_appautoscaling_policy" "api_cpu" {
  count = var.ecs_enable_auto_scaling && var.ecs_autoscaling_cpu_target_value != null ? 1 : 0

  name               = "${local.name_prefix}-eventpro-api-cpu-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value       = var.ecs_autoscaling_cpu_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    disable_scale_in   = false
  }
}

resource "aws_appautoscaling_policy" "api_memory" {
  count = var.ecs_enable_auto_scaling && var.ecs_autoscaling_memory_target_value != null ? 1 : 0

  name               = "${local.name_prefix}-eventpro-api-memory-autoscaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.api[0].resource_id
  scalable_dimension = aws_appautoscaling_target.api[0].scalable_dimension
  service_namespace  = aws_appautoscaling_target.api[0].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageMemoryUtilization"
    }
    target_value       = var.ecs_autoscaling_memory_target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
    disable_scale_in   = false
  }
}

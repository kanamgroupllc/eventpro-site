# Lambda Secret Rotation Module - Outputs

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.secret_rotation.arn
}

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.secret_rotation.function_name
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "security_group_id" {
  description = "ID of the Lambda security group (if VPC is configured)"
  value       = var.vpc_config != null ? aws_security_group.lambda[0].id : null
}


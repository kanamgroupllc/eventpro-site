# Lambda Order Processor Module - Outputs

output "lambda_function_name" {
  description = "Name of the Lambda function"
  value       = aws_lambda_function.order_processor.function_name
}

output "lambda_function_arn" {
  description = "ARN of the Lambda function"
  value       = aws_lambda_function.order_processor.arn
}

output "lambda_function_invoke_arn" {
  description = "Invoke ARN of the Lambda function"
  value       = aws_lambda_function.order_processor.invoke_arn
}

output "lambda_role_arn" {
  description = "ARN of the Lambda execution role"
  value       = aws_iam_role.lambda.arn
}

output "event_source_mapping_id" {
  description = "ID of the SQS event source mapping"
  value       = aws_lambda_event_source_mapping.order_queue.id
}

output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.lambda.name
}


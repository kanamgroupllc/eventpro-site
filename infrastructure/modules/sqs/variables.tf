# SQS Module - Variables

variable "queue_name" {
  description = "Name of the SQS queue"
  type        = string
}

variable "queue_purpose" {
  description = "Purpose description of the queue (for tagging)"
  type        = string
  default     = "Message queue"
}

variable "message_retention_seconds" {
  description = "Number of seconds Amazon SQS retains a message (60 to 1209600, default 345600 = 4 days)"
  type        = number
  default     = 345600
}

variable "visibility_timeout_seconds" {
  description = "Visibility timeout for the queue in seconds (0 to 43200, default 30)"
  type        = number
  default     = 30
}

variable "receive_wait_time_seconds" {
  description = "Time for which a ReceiveMessage call will wait for a message to arrive (long polling) in seconds (0 to 20, default 0)"
  type        = number
  default     = 20
}

variable "delay_seconds" {
  description = "Time in seconds that the delivery of all messages in the queue will be delayed (0 to 900, default 0)"
  type        = number
  default     = 0
}

variable "max_message_size" {
  description = "Limit of how many bytes a message can contain (1024 to 1048576, default 262144 = 256 KiB)"
  type        = number
  default     = 262144
}

variable "sqs_managed_sse_enabled" {
  description = "Boolean to enable server-side encryption (SSE) of message content with SQS-owned encryption keys"
  type        = bool
  default     = true
}

variable "kms_master_key_id" {
  description = "ID of an AWS-managed customer master key (CMK) for Amazon SQS or a custom CMK. If not provided, SQS-managed SSE is used."
  type        = string
  default     = null
}

variable "kms_data_key_reuse_period_seconds" {
  description = "Length of time, in seconds, for which Amazon SQS can reuse a data key to encrypt or decrypt messages before calling AWS KMS again (60 to 86400, default 300)"
  type        = number
  default     = 300
}

variable "dead_letter_queue_arn" {
  description = "ARN of the dead-letter queue (optional, overrides enable_dlq)"
  type        = string
  default     = null
}

variable "enable_dlq" {
  description = "Enable automatic creation of a dead-letter queue"
  type        = bool
  default     = true
}

variable "dlq_message_retention_seconds" {
  description = "Message retention for DLQ in seconds (default: 14 days)"
  type        = number
  default     = 1209600
}

variable "max_receive_count" {
  description = "Maximum number of times a message can be received before being moved to the dead-letter queue"
  type        = number
  default     = 3
}

variable "tags" {
  description = "Map of tags to assign to the queue"
  type        = map(string)
  default     = {}
}


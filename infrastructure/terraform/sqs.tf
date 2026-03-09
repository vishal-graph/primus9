# ===========================================
# TatvaOps Vision - SQS Queues Configuration
# ===========================================

# ===========================================
# Floor Plan Analysis Queue
# ===========================================

resource "aws_sqs_queue" "floorplan_analysis_dlq" {
  name                       = "${local.name_prefix}-floorplan-analysis-dlq"
  message_retention_seconds  = 1209600 # 14 days
  visibility_timeout_seconds = 300

  tags = {
    Name = "${local.name_prefix}-floorplan-analysis-dlq"
    Type = "DLQ"
  }
}

resource "aws_sqs_queue" "floorplan_analysis" {
  name                       = "${local.name_prefix}-floorplan-analysis"
  delay_seconds              = 0
  max_message_size           = 262144 # 256 KB
  message_retention_seconds  = 345600 # 4 days
  visibility_timeout_seconds = 300    # 5 minutes
  receive_wait_time_seconds  = 20     # Long polling

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.floorplan_analysis_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name    = "${local.name_prefix}-floorplan-analysis"
    JobType = "FLOORPLAN_ANALYSIS"
  }
}

# ===========================================
# Moodboard Generation Queue
# ===========================================

resource "aws_sqs_queue" "moodboard_generation_dlq" {
  name                       = "${local.name_prefix}-moodboard-generation-dlq"
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 300

  tags = {
    Name = "${local.name_prefix}-moodboard-generation-dlq"
    Type = "DLQ"
  }
}

resource "aws_sqs_queue" "moodboard_generation" {
  name                       = "${local.name_prefix}-moodboard-generation"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 300
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.moodboard_generation_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name    = "${local.name_prefix}-moodboard-generation"
    JobType = "MOODBOARD"
  }
}

# ===========================================
# Interior View Generation Queue
# ===========================================

resource "aws_sqs_queue" "interior_view_generation_dlq" {
  name                       = "${local.name_prefix}-interior-view-generation-dlq"
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 300

  tags = {
    Name = "${local.name_prefix}-interior-view-generation-dlq"
    Type = "DLQ"
  }
}

resource "aws_sqs_queue" "interior_view_generation" {
  name                       = "${local.name_prefix}-interior-view-generation"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 300
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.interior_view_generation_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name    = "${local.name_prefix}-interior-view-generation"
    JobType = "INTERIOR"
  }
}

# ===========================================
# Component Update Queue
# ===========================================

resource "aws_sqs_queue" "component_update_dlq" {
  name                       = "${local.name_prefix}-component-update-dlq"
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 300

  tags = {
    Name = "${local.name_prefix}-component-update-dlq"
    Type = "DLQ"
  }
}

resource "aws_sqs_queue" "component_update" {
  name                       = "${local.name_prefix}-component-update"
  delay_seconds              = 0
  max_message_size           = 262144
  message_retention_seconds  = 345600
  visibility_timeout_seconds = 300
  receive_wait_time_seconds  = 20

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.component_update_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name    = "${local.name_prefix}-component-update"
    JobType = "COMPONENT_UPDATE"
  }
}

# ===========================================
# Notification Queue
# ===========================================

resource "aws_sqs_queue" "notification_dlq" {
  name                       = "${local.name_prefix}-notification-dlq"
  message_retention_seconds  = 1209600
  visibility_timeout_seconds = 60

  tags = {
    Name = "${local.name_prefix}-notification-dlq"
    Type = "DLQ"
  }
}

resource "aws_sqs_queue" "notification" {
  name                       = "${local.name_prefix}-notification"
  delay_seconds              = 0
  max_message_size           = 65536 # 64 KB
  message_retention_seconds  = 86400 # 1 day
  visibility_timeout_seconds = 60    # 1 minute
  receive_wait_time_seconds  = 10

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.notification_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name    = "${local.name_prefix}-notification"
    JobType = "NOTIFICATION"
  }
}

# ===========================================
# CloudWatch Alarms for SQS
# ===========================================

resource "aws_cloudwatch_metric_alarm" "sqs_dlq_messages" {
  for_each = {
    floorplan   = aws_sqs_queue.floorplan_analysis_dlq.name
    moodboard   = aws_sqs_queue.moodboard_generation_dlq.name
    interior    = aws_sqs_queue.interior_view_generation_dlq.name
    component   = aws_sqs_queue.component_update_dlq.name
    notification = aws_sqs_queue.notification_dlq.name
  }

  alarm_name          = "${local.name_prefix}-${each.key}-dlq-messages"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Sum"
  threshold           = 0
  alarm_description   = "Messages in ${each.key} DLQ"
  treat_missing_data  = "notBreaching"

  dimensions = {
    QueueName = each.value
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${local.name_prefix}-${each.key}-dlq-messages"
  }
}

resource "aws_cloudwatch_metric_alarm" "sqs_queue_depth" {
  for_each = {
    floorplan   = aws_sqs_queue.floorplan_analysis.name
    moodboard   = aws_sqs_queue.moodboard_generation.name
    interior    = aws_sqs_queue.interior_view_generation.name
    component   = aws_sqs_queue.component_update.name
  }

  alarm_name          = "${local.name_prefix}-${each.key}-queue-depth"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  metric_name         = "ApproximateNumberOfMessagesVisible"
  namespace           = "AWS/SQS"
  period              = 300
  statistic           = "Average"
  threshold           = 100
  alarm_description   = "High queue depth for ${each.key}"

  dimensions = {
    QueueName = each.value
  }

  alarm_actions = [aws_sns_topic.alerts.arn]

  tags = {
    Name = "${local.name_prefix}-${each.key}-queue-depth"
  }
}


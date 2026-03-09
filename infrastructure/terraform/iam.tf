# ===========================================
# TatvaOps Vision - IAM Configuration
# ===========================================

# ===========================================
# EC2 Instance Profile for Application Servers
# ===========================================

resource "aws_iam_role" "application" {
  name = "${local.name_prefix}-application-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-application-role"
  }
}

resource "aws_iam_instance_profile" "application" {
  name = "${local.name_prefix}-application-profile"
  role = aws_iam_role.application.name

  tags = {
    Name = "${local.name_prefix}-application-profile"
  }
}

# Application server permissions
resource "aws_iam_role_policy" "application" {
  name = "${local.name_prefix}-application-policy"
  role = aws_iam_role.application.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 Access
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.floorplans.arn,
          "${aws_s3_bucket.floorplans.arn}/*",
          aws_s3_bucket.moodboards.arn,
          "${aws_s3_bucket.moodboards.arn}/*",
          aws_s3_bucket.renders.arn,
          "${aws_s3_bucket.renders.arn}/*",
          aws_s3_bucket.exports.arn,
          "${aws_s3_bucket.exports.arn}/*"
        ]
      },
      # SQS Send Messages (Producer)
      {
        Sid    = "SQSSendMessages"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes"
        ]
        Resource = [
          aws_sqs_queue.floorplan_analysis.arn,
          aws_sqs_queue.moodboard_generation.arn,
          aws_sqs_queue.interior_view_generation.arn,
          aws_sqs_queue.component_update.arn,
          aws_sqs_queue.notification.arn
        ]
      },
      # Secrets Manager (Database credentials)
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn
        ]
      },
      # SES Send Email
      {
        Sid    = "SESSendEmail"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      # CloudWatch Logs
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/tatvaops-vision/*"
      }
    ]
  })
}

# ===========================================
# EC2 Instance Profile for Worker Servers
# ===========================================

resource "aws_iam_role" "worker" {
  name = "${local.name_prefix}-worker-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${local.name_prefix}-worker-role"
  }
}

resource "aws_iam_instance_profile" "worker" {
  name = "${local.name_prefix}-worker-profile"
  role = aws_iam_role.worker.name

  tags = {
    Name = "${local.name_prefix}-worker-profile"
  }
}

# Worker server permissions
resource "aws_iam_role_policy" "worker" {
  name = "${local.name_prefix}-worker-policy"
  role = aws_iam_role.worker.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 Full Access (workers store AI outputs)
      {
        Sid    = "S3Access"
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:ListBucket",
          "s3:GetBucketLocation"
        ]
        Resource = [
          aws_s3_bucket.floorplans.arn,
          "${aws_s3_bucket.floorplans.arn}/*",
          aws_s3_bucket.moodboards.arn,
          "${aws_s3_bucket.moodboards.arn}/*",
          aws_s3_bucket.renders.arn,
          "${aws_s3_bucket.renders.arn}/*",
          aws_s3_bucket.exports.arn,
          "${aws_s3_bucket.exports.arn}/*"
        ]
      },
      # SQS Consume Messages (Consumer)
      {
        Sid    = "SQSConsumeMessages"
        Effect = "Allow"
        Action = [
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueUrl",
          "sqs:GetQueueAttributes",
          "sqs:ChangeMessageVisibility"
        ]
        Resource = [
          aws_sqs_queue.floorplan_analysis.arn,
          aws_sqs_queue.moodboard_generation.arn,
          aws_sqs_queue.interior_view_generation.arn,
          aws_sqs_queue.component_update.arn,
          aws_sqs_queue.notification.arn
        ]
      },
      # SQS Send to notification queue (workers can trigger notifications)
      {
        Sid    = "SQSSendNotification"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = [
          aws_sqs_queue.notification.arn
        ]
      },
      # Secrets Manager (Database + API keys)
      {
        Sid    = "SecretsManagerRead"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db_password.arn
        ]
      },
      # SES Send Email (for notification worker)
      {
        Sid    = "SESSendEmail"
        Effect = "Allow"
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail"
        ]
        Resource = "*"
      },
      # CloudWatch Logs
      {
        Sid    = "CloudWatchLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = "arn:aws:logs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:log-group:/tatvaops-vision/*"
      }
    ]
  })
}

# ===========================================
# IAM User for CI/CD (optional)
# ===========================================

resource "aws_iam_user" "cicd" {
  name = "${local.name_prefix}-cicd"
  
  tags = {
    Name = "${local.name_prefix}-cicd"
  }
}

resource "aws_iam_user_policy" "cicd" {
  name = "${local.name_prefix}-cicd-policy"
  user = aws_iam_user.cicd.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # ECR (if using container registry)
      {
        Sid    = "ECRAccess"
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
          "ecr:PutImage",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload"
        ]
        Resource = "*"
      },
      # S3 for deployment artifacts
      {
        Sid    = "S3DeployAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          "arn:aws:s3:::${local.name_prefix}-deployments",
          "arn:aws:s3:::${local.name_prefix}-deployments/*"
        ]
      }
    ]
  })
}

# ===========================================
# Outputs for IAM
# ===========================================

output "application_instance_profile_arn" {
  description = "ARN of the application instance profile"
  value       = aws_iam_instance_profile.application.arn
}

output "worker_instance_profile_arn" {
  description = "ARN of the worker instance profile"
  value       = aws_iam_instance_profile.worker.arn
}


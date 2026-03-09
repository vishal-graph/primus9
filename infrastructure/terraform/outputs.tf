# ===========================================
# TatvaOps Vision - Terraform Outputs
# ===========================================

# ===========================================
# VPC Outputs
# ===========================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "public_subnet_ids" {
  description = "IDs of public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "IDs of private subnets"
  value       = aws_subnet.private[*].id
}

output "database_subnet_ids" {
  description = "IDs of database subnets"
  value       = aws_subnet.database[*].id
}

# ===========================================
# RDS Outputs
# ===========================================

output "rds_endpoint" {
  description = "RDS PostgreSQL endpoint"
  value       = aws_db_instance.main.endpoint
}

output "rds_address" {
  description = "RDS PostgreSQL address (hostname only)"
  value       = aws_db_instance.main.address
}

output "rds_port" {
  description = "RDS PostgreSQL port"
  value       = aws_db_instance.main.port
}

output "rds_database_name" {
  description = "RDS database name"
  value       = aws_db_instance.main.db_name
}

output "rds_secret_arn" {
  description = "ARN of the Secrets Manager secret containing DB credentials"
  value       = aws_secretsmanager_secret.db_password.arn
}

output "database_url" {
  description = "PostgreSQL connection URL (retrieve password from Secrets Manager)"
  value       = "postgresql://${var.db_username}:PASSWORD@${aws_db_instance.main.endpoint}/${var.db_name}"
  sensitive   = true
}

# ===========================================
# ElastiCache Outputs
# ===========================================

output "redis_endpoint" {
  description = "ElastiCache Redis endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "redis_port" {
  description = "ElastiCache Redis port"
  value       = aws_elasticache_cluster.main.cache_nodes[0].port
}

output "redis_url" {
  description = "Redis connection URL"
  value       = "redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.cache_nodes[0].port}"
}

# ===========================================
# SQS Outputs
# ===========================================

output "sqs_queue_urls" {
  description = "SQS queue URLs"
  value = {
    floorplan_analysis     = aws_sqs_queue.floorplan_analysis.url
    moodboard_generation   = aws_sqs_queue.moodboard_generation.url
    interior_view_generation = aws_sqs_queue.interior_view_generation.url
    component_update       = aws_sqs_queue.component_update.url
    notification           = aws_sqs_queue.notification.url
  }
}

output "sqs_dlq_urls" {
  description = "SQS Dead Letter Queue URLs"
  value = {
    floorplan_analysis     = aws_sqs_queue.floorplan_analysis_dlq.url
    moodboard_generation   = aws_sqs_queue.moodboard_generation_dlq.url
    interior_view_generation = aws_sqs_queue.interior_view_generation_dlq.url
    component_update       = aws_sqs_queue.component_update_dlq.url
    notification           = aws_sqs_queue.notification_dlq.url
  }
}

# ===========================================
# S3 Outputs
# ===========================================

output "s3_bucket_names" {
  description = "S3 bucket names"
  value = {
    floorplans = aws_s3_bucket.floorplans.bucket
    moodboards = aws_s3_bucket.moodboards.bucket
    renders    = aws_s3_bucket.renders.bucket
    exports    = aws_s3_bucket.exports.bucket
  }
}

output "s3_bucket_arns" {
  description = "S3 bucket ARNs"
  value = {
    floorplans = aws_s3_bucket.floorplans.arn
    moodboards = aws_s3_bucket.moodboards.arn
    renders    = aws_s3_bucket.renders.arn
    exports    = aws_s3_bucket.exports.arn
  }
}

# ===========================================
# Security Group Outputs
# ===========================================

output "security_group_ids" {
  description = "Security group IDs"
  value = {
    alb         = aws_security_group.alb.id
    application = aws_security_group.application.id
    worker      = aws_security_group.worker.id
    rds         = aws_security_group.rds.id
    redis       = aws_security_group.redis.id
    bastion     = aws_security_group.bastion.id
  }
}

# ===========================================
# EC2 / ALB Outputs
# ===========================================

output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer"
  value       = aws_lb.main.dns_name
}

output "alb_zone_id" {
  description = "Zone ID of the Application Load Balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "ARN of the Application Load Balancer"
  value       = aws_lb.main.arn
}

output "bastion_public_ip" {
  description = "Public IP of the bastion host"
  value       = var.create_bastion ? aws_eip.bastion[0].public_ip : null
}

output "application_asg_name" {
  description = "Name of the application Auto Scaling Group"
  value       = aws_autoscaling_group.application.name
}

output "worker_asg_name" {
  description = "Name of the worker Auto Scaling Group"
  value       = aws_autoscaling_group.worker.name
}

# ===========================================
# Environment Variables Output
# ===========================================

output "env_vars_backend" {
  description = "Environment variables for backend service"
  value = <<-EOT
# Database
DATABASE_URL=postgresql://${var.db_username}:YOUR_PASSWORD@${aws_db_instance.main.endpoint}/${var.db_name}

# Redis
REDIS_URL=redis://${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.cache_nodes[0].port}

# SQS Queues
SQS_QUEUE_FLOORPLAN_ANALYSIS=${aws_sqs_queue.floorplan_analysis.url}
SQS_QUEUE_MOODBOARD_GENERATION=${aws_sqs_queue.moodboard_generation.url}
SQS_QUEUE_INTERIOR_VIEW_GENERATION=${aws_sqs_queue.interior_view_generation.url}
SQS_QUEUE_COMPONENT_UPDATE=${aws_sqs_queue.component_update.url}
SQS_QUEUE_NOTIFICATION=${aws_sqs_queue.notification.url}

# SQS DLQs
SQS_DLQ_FLOORPLAN_ANALYSIS=${aws_sqs_queue.floorplan_analysis_dlq.url}
SQS_DLQ_MOODBOARD_GENERATION=${aws_sqs_queue.moodboard_generation_dlq.url}
SQS_DLQ_INTERIOR_VIEW_GENERATION=${aws_sqs_queue.interior_view_generation_dlq.url}
SQS_DLQ_COMPONENT_UPDATE=${aws_sqs_queue.component_update_dlq.url}
SQS_DLQ_NOTIFICATION=${aws_sqs_queue.notification_dlq.url}

# S3 Buckets
S3_BUCKET_FLOORPLANS=${aws_s3_bucket.floorplans.bucket}
S3_BUCKET_MOODBOARDS=${aws_s3_bucket.moodboards.bucket}
S3_BUCKET_RENDERS=${aws_s3_bucket.renders.bucket}
S3_BUCKET_EXPORTS=${aws_s3_bucket.exports.bucket}
EOT
  sensitive = true
}

output "application_url" {
  description = "URL to access the application"
  value       = "http://${aws_lb.main.dns_name}"
}

# ===========================================
# Route 53 / DNS Outputs
# ===========================================

output "domain_url" {
  description = "Custom domain URL (HTTPS)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : null
}

output "nameservers" {
  description = "Route 53 nameservers (update at your domain registrar)"
  value       = var.domain_name != "" ? aws_route53_zone.main[0].name_servers : null
}

output "certificate_arn" {
  description = "ACM certificate ARN"
  value       = var.domain_name != "" ? aws_acm_certificate.main[0].arn : null
}


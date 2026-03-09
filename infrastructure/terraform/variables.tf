# ===========================================
# TatvaOps Vision - Terraform Variables
# ===========================================

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name (dev, staging, production)"
  type        = string
  default     = "production"

  validation {
    condition     = contains(["dev", "staging", "production"], var.environment)
    error_message = "Environment must be dev, staging, or production."
  }
}

# ===========================================
# VPC Variables
# ===========================================

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_cidrs" {
  description = "CIDR blocks for public subnets"
  type        = list(string)
  default     = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
}

variable "private_subnet_cidrs" {
  description = "CIDR blocks for private subnets"
  type        = list(string)
  default     = ["10.0.11.0/24", "10.0.12.0/24", "10.0.13.0/24"]
}

variable "database_subnet_cidrs" {
  description = "CIDR blocks for database subnets"
  type        = list(string)
  default     = ["10.0.21.0/24", "10.0.22.0/24", "10.0.23.0/24"]
}

# ===========================================
# RDS PostgreSQL Variables
# ===========================================

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.medium"
}

variable "db_allocated_storage" {
  description = "Allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum allocated storage for autoscaling in GB"
  type        = number
  default     = 100
}

variable "db_engine_version" {
  description = "PostgreSQL engine version"
  type        = string
  # Use major version to allow AWS to manage minor upgrades (Best Practice)
  default     = "15"
}

variable "db_name" {
  description = "Name of the database"
  type        = string
  default     = "tatvaops_vision"
}

variable "db_username" {
  description = "Master username for the database"
  type        = string
  default     = "tatvaops_admin"
}

variable "db_backup_retention_period" {
  description = "Number of days to retain backups"
  type        = number
  default     = 7
}

variable "db_backup_window" {
  description = "Preferred backup window (UTC)"
  type        = string
  default     = "03:00-04:00"
}

variable "db_maintenance_window" {
  description = "Preferred maintenance window"
  type        = string
  default     = "Mon:04:00-Mon:05:00"
}

variable "db_multi_az" {
  description = "Enable Multi-AZ deployment (auto-disabled for dev/staging to save costs)"
  type        = bool
  default     = true
}

variable "db_deletion_protection" {
  description = "Enable deletion protection (auto-disabled for dev/staging)"
  type        = bool
  default     = true
}

variable "db_performance_insights_enabled" {
  description = "Enable Performance Insights"
  type        = bool
  default     = true
}

# ===========================================
# ElastiCache Redis Variables
# ===========================================

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "Number of cache nodes"
  type        = number
  default     = 1
}

variable "redis_engine_version" {
  description = "Redis engine version"
  type        = string
  default     = "7.0"
}

# ===========================================
# EC2 Variables
# ===========================================

variable "ssh_public_key" {
  description = "SSH public key for EC2 access"
  type        = string
  default     = ""
}

# Application Server
variable "app_instance_type" {
  description = "EC2 instance type for application servers"
  type        = string
  default     = "t3.medium"
}

variable "app_desired_capacity" {
  description = "Desired number of application instances"
  type        = number
  default     = 1
}

variable "app_min_capacity" {
  description = "Minimum number of application instances"
  type        = number
  default     = 1
}

variable "app_max_capacity" {
  description = "Maximum number of application instances"
  type        = number
  default     = 3
}

# Worker Server
variable "worker_instance_type" {
  description = "EC2 instance type for worker servers"
  type        = string
  default     = "t3.medium"
}

variable "worker_desired_capacity" {
  description = "Desired number of worker instances"
  type        = number
  default     = 1
}

variable "worker_min_capacity" {
  description = "Minimum number of worker instances"
  type        = number
  default     = 1
}

variable "worker_max_capacity" {
  description = "Maximum number of worker instances"
  type        = number
  default     = 5
}

# Bastion Host
variable "create_bastion" {
  description = "Create a bastion host for SSH access"
  type        = bool
  default     = true
}

# ===========================================
# Domain Variables
# ===========================================

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = ""
}


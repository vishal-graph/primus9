# ===========================================
# TatvaOps Vision - AWS Infrastructure
# Main Terraform Configuration
# ===========================================

terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }

  # Backend configuration for state management
  # Uncomment and configure for production
  # backend "s3" {
  #   bucket         = "tatvaops-terraform-state"
  #   key            = "vision/terraform.tfstate"
  #   region         = "ap-south-1"
  #   encrypt        = true
  #   dynamodb_table = "terraform-locks"
  # }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "TatvaOps-Vision"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# ===========================================
# Data Sources
# ===========================================

data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

# ===========================================
# Local Values
# ===========================================

locals {
  name_prefix = "tatvaops-vision-${var.environment}"
  
  common_tags = {
    Project     = "TatvaOps-Vision"
    Environment = var.environment
  }

  azs = slice(data.aws_availability_zones.available.names, 0, 3)
}


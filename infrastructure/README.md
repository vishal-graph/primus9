# TatvaOps Vision - AWS Infrastructure

This directory contains Terraform configurations for deploying TatvaOps Vision infrastructure on AWS.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              AWS Cloud (ap-south-1)                         │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                           VPC (10.0.0.0/16)                           │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │  │
│  │  │ Public      │  │ Public      │  │ Public      │                   │  │
│  │  │ Subnet AZ-a │  │ Subnet AZ-b │  │ Subnet AZ-c │                   │  │
│  │  │ 10.0.1.0/24 │  │ 10.0.2.0/24 │  │ 10.0.3.0/24 │                   │  │
│  │  │   ┌─────┐   │  │   ┌─────┐   │  │   ┌─────┐   │                   │  │
│  │  │   │ ALB │   │  │   │ NAT │   │  │   │     │   │                   │  │
│  │  │   └──┬──┘   │  │   └──┬──┘   │  │   └─────┘   │                   │  │
│  │  └──────┼──────┘  └──────┼──────┘  └─────────────┘                   │  │
│  │         │                │                                            │  │
│  │  ┌──────┼────────────────┼─────────────────────────┐                 │  │
│  │  │      ▼                ▼                         │                 │  │
│  │  │  ┌─────────────┐  ┌─────────────┐              │ Private          │  │
│  │  │  │ EC2         │  │ EC2         │              │ Subnets          │  │
│  │  │  │ Frontend +  │  │ Worker      │              │ 10.0.11-13.0/24  │  │
│  │  │  │ Backend API │  │ Service     │              │                 │  │
│  │  │  └──────┬──────┘  └──────┬──────┘              │                 │  │
│  │  └─────────┼────────────────┼─────────────────────┘                 │  │
│  │            │                │                                        │  │
│  │            │                │                                        │  │
│  │  ┌─────────┼────────────────┼─────────────────────┐                 │  │
│  │  │         ▼                ▼                     │ Database        │  │
│  │  │  ┌─────────────┐  ┌─────────────┐              │ Subnets         │  │
│  │  │  │ RDS         │  │ ElastiCache │              │ 10.0.21-23.0/24 │  │
│  │  │  │ PostgreSQL  │  │ Redis       │              │                 │  │
│  │  │  │ (Multi-AZ)  │  │             │              │                 │  │
│  │  │  └─────────────┘  └─────────────┘              │                 │  │
│  │  └────────────────────────────────────────────────┘                 │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐                    │
│  │ S3       │  │ SQS      │  │ SES      │  │ CloudWatch│                    │
│  │ Buckets  │  │ Queues   │  │ Email    │  │ Logs      │                    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Resources Created

### Networking
- **VPC** with DNS support
- **3 Public Subnets** across availability zones
- **3 Private Subnets** for application servers
- **3 Database Subnets** (isolated, no internet access)
- **Internet Gateway** for public subnet internet access
- **NAT Gateway** for private subnet outbound access
- **VPC Endpoints** for S3 and SQS (private access)

### Database
- **RDS PostgreSQL 15** with:
  - Multi-AZ deployment (production)
  - Encrypted storage (KMS)
  - Performance Insights
  - Automated backups (7 days retention)
  - Parameter group with optimized settings
  - Secrets Manager for credentials

### Cache
- **ElastiCache Redis 7** with:
  - Parameter group with eviction policy
  - Snapshot backups
  - CloudWatch monitoring

### Queues
- **5 SQS Queues** for async processing:
  - Floor Plan Analysis
  - Moodboard Generation
  - Interior View Generation
  - Component Update
  - Notification
- **5 Dead Letter Queues** for failed messages

### Storage
- **4 S3 Buckets** with:
  - Versioning enabled
  - Server-side encryption
  - Public access blocked
  - CORS configuration
  - Lifecycle rules (exports)

### Security
- **Security Groups** for:
  - ALB (public HTTP/HTTPS)
  - Application servers
  - Worker servers
  - RDS (PostgreSQL)
  - Redis
  - Bastion host

### Monitoring
- **CloudWatch Alarms** for:
  - RDS CPU, storage, connections
  - Redis CPU, memory
  - SQS queue depth, DLQ messages
- **SNS Topic** for alerts

## Prerequisites

1. **AWS CLI** installed and configured
2. **Terraform** >= 1.5.0 installed
3. **AWS Account** with appropriate permissions

## Quick Start

### 1. Initialize Terraform

```bash
cd infrastructure/terraform
terraform init
```

### 2. Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values
```

### 3. Plan Changes

```bash
terraform plan -out=tfplan
```

### 4. Apply Changes

```bash
terraform apply tfplan
```

### 5. Get Outputs

```bash
# Get all outputs
terraform output

# Get database URL
terraform output database_url

# Get environment variables for backend
terraform output env_vars_backend
```

## Cost Estimation (ap-south-1)

| Resource | Instance Type | Estimated Monthly Cost |
|----------|---------------|----------------------|
| RDS PostgreSQL | db.t3.medium (Multi-AZ) | ~$75 |
| ElastiCache Redis | cache.t3.micro | ~$15 |
| NAT Gateway | - | ~$35 |
| S3 (100GB) | - | ~$3 |
| SQS (1M requests) | - | ~$0.50 |
| **Total** | | **~$130/month** |

*Note: Costs vary based on usage. Use AWS Cost Calculator for accurate estimates.*

## Environment Configuration

After running Terraform, update your `.env` files with the outputs:

```bash
# Get the generated environment variables
terraform output -raw env_vars_backend > ../../backend/.env.aws

# Retrieve database password from Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id "tatvaops-vision-production/database/master-password" \
  --query 'SecretString' \
  --output text | jq -r '.password'
```

## Security Considerations

1. **Database Access**: RDS is only accessible from application/worker security groups
2. **Encryption**: All data at rest is encrypted (RDS, S3)
3. **SSL/TLS**: RDS requires SSL connections
4. **Secrets**: Database credentials stored in Secrets Manager
5. **Public Access**: All S3 buckets block public access
6. **VPC Isolation**: Database subnets have no internet access

## Scaling

### RDS
- Enable read replicas (uncomment in `rds.tf`)
- Increase instance class
- Enable storage autoscaling (configured up to 100GB)

### Redis
- Increase node type
- Enable cluster mode with multiple nodes

### Application
- Add more EC2 instances behind ALB
- Use Auto Scaling Groups

## Disaster Recovery

1. **RDS Backups**: Automated daily backups, 7-day retention
2. **RDS Snapshots**: Manual snapshots before major changes
3. **S3 Versioning**: Enabled on all buckets except exports
4. **Multi-AZ**: RDS deployed across multiple AZs

## Cleanup

⚠️ **Warning**: This will destroy all resources including data!

```bash
# Disable deletion protection first (if enabled)
terraform apply -var="db_deletion_protection=false"

# Destroy all resources
terraform destroy
```

## Troubleshooting

### Cannot connect to RDS
- Check security group allows inbound from your source
- Verify you're connecting from within the VPC
- Ensure SSL certificate is configured

### SQS messages not being processed
- Check DLQ for failed messages
- Verify worker has correct IAM permissions
- Check visibility timeout settings

### High Redis memory usage
- Review eviction policy
- Increase node type
- Implement TTL on cached items


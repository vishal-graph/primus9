#!/bin/bash
# ===========================================
# TatvaOps Vision - Verify Infrastructure
# ===========================================
#
# This script verifies that all AWS infrastructure is properly set up
#
# Usage:
#   ./verify-infrastructure.sh
#
# ===========================================

set -e

echo "🔍 Verifying TatvaOps Vision AWS Infrastructure..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Check function
check() {
    local name=$1
    local command=$2
    
    if eval "$command" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $name"
        return 0
    else
        echo -e "${RED}✗${NC} $name"
        ((ERRORS++))
        return 1
    fi
}

warn() {
    local name=$1
    echo -e "${YELLOW}⚠${NC} $name"
    ((WARNINGS++))
}

# ===========================================
# Check Prerequisites
# ===========================================

echo "📋 Checking Prerequisites..."

check "AWS CLI installed" "command -v aws"
check "Terraform installed" "command -v terraform"
check "jq installed" "command -v jq"
check "psql installed" "command -v psql"

echo ""

# ===========================================
# Check AWS Credentials
# ===========================================

echo "🔐 Checking AWS Credentials..."

if aws sts get-caller-identity > /dev/null 2>&1; then
    ACCOUNT_ID=$(aws sts get-caller-identity --query 'Account' --output text)
    echo -e "${GREEN}✓${NC} AWS credentials configured (Account: $ACCOUNT_ID)"
else
    echo -e "${RED}✗${NC} AWS credentials not configured"
    ((ERRORS++))
fi

echo ""

# ===========================================
# Check VPC
# ===========================================

echo "🌐 Checking VPC..."

VPC_ID=$(aws ec2 describe-vpcs \
    --filters "Name=tag:Name,Values=*tatvaops-vision*" \
    --query 'Vpcs[0].VpcId' --output text 2>/dev/null || echo "None")

if [ "$VPC_ID" != "None" ] && [ -n "$VPC_ID" ]; then
    echo -e "${GREEN}✓${NC} VPC found: $VPC_ID"
else
    echo -e "${RED}✗${NC} VPC not found"
    ((ERRORS++))
fi

echo ""

# ===========================================
# Check RDS
# ===========================================

echo "🗄️  Checking RDS PostgreSQL..."

RDS_STATUS=$(aws rds describe-db-instances \
    --db-instance-identifier "tatvaops-vision-production-postgres" \
    --query 'DBInstances[0].DBInstanceStatus' --output text 2>/dev/null || echo "not-found")

if [ "$RDS_STATUS" == "available" ]; then
    echo -e "${GREEN}✓${NC} RDS PostgreSQL is available"
    
    RDS_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "tatvaops-vision-production-postgres" \
        --query 'DBInstances[0].Endpoint.Address' --output text)
    echo "   Endpoint: $RDS_ENDPOINT"
elif [ "$RDS_STATUS" == "not-found" ]; then
    echo -e "${RED}✗${NC} RDS instance not found"
    ((ERRORS++))
else
    warn "RDS PostgreSQL status: $RDS_STATUS"
fi

echo ""

# ===========================================
# Check ElastiCache Redis
# ===========================================

echo "📦 Checking ElastiCache Redis..."

REDIS_STATUS=$(aws elasticache describe-cache-clusters \
    --cache-cluster-id "tatvaops-vision-production-redis" \
    --query 'CacheClusters[0].CacheClusterStatus' --output text 2>/dev/null || echo "not-found")

if [ "$REDIS_STATUS" == "available" ]; then
    echo -e "${GREEN}✓${NC} ElastiCache Redis is available"
elif [ "$REDIS_STATUS" == "not-found" ]; then
    echo -e "${RED}✗${NC} ElastiCache Redis not found"
    ((ERRORS++))
else
    warn "ElastiCache Redis status: $REDIS_STATUS"
fi

echo ""

# ===========================================
# Check S3 Buckets
# ===========================================

echo "📁 Checking S3 Buckets..."

BUCKETS=("floorplans" "moodboards" "renders" "exports")
for bucket in "${BUCKETS[@]}"; do
    BUCKET_NAME="tatvaops-vision-production-$bucket"
    if aws s3api head-bucket --bucket "$BUCKET_NAME" 2>/dev/null; then
        echo -e "${GREEN}✓${NC} S3 bucket exists: $BUCKET_NAME"
    else
        echo -e "${RED}✗${NC} S3 bucket not found: $BUCKET_NAME"
        ((ERRORS++))
    fi
done

echo ""

# ===========================================
# Check SQS Queues
# ===========================================

echo "📬 Checking SQS Queues..."

QUEUES=("floorplan-analysis" "moodboard-generation" "interior-view-generation" "component-update" "notification")
for queue in "${QUEUES[@]}"; do
    QUEUE_NAME="tatvaops-vision-production-$queue"
    if aws sqs get-queue-url --queue-name "$QUEUE_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} SQS queue exists: $QUEUE_NAME"
    else
        echo -e "${RED}✗${NC} SQS queue not found: $QUEUE_NAME"
        ((ERRORS++))
    fi
done

echo ""

# ===========================================
# Check Secrets Manager
# ===========================================

echo "🔒 Checking Secrets Manager..."

SECRET_NAME="tatvaops-vision-production/database/master-password"
if aws secretsmanager describe-secret --secret-id "$SECRET_NAME" > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Database secret exists"
else
    echo -e "${RED}✗${NC} Database secret not found"
    ((ERRORS++))
fi

echo ""

# ===========================================
# Check IAM Roles
# ===========================================

echo "👤 Checking IAM Roles..."

ROLES=("application-role" "worker-role")
for role in "${ROLES[@]}"; do
    ROLE_NAME="tatvaops-vision-production-$role"
    if aws iam get-role --role-name "$ROLE_NAME" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} IAM role exists: $ROLE_NAME"
    else
        echo -e "${RED}✗${NC} IAM role not found: $ROLE_NAME"
        ((ERRORS++))
    fi
done

echo ""

# ===========================================
# Summary
# ===========================================

echo "================================================="
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ All infrastructure checks passed!${NC}"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Infrastructure verified with $WARNINGS warning(s)${NC}"
else
    echo -e "${RED}❌ Infrastructure verification failed with $ERRORS error(s)${NC}"
fi

echo ""
echo "Errors: $ERRORS"
echo "Warnings: $WARNINGS"
echo ""

exit $ERRORS


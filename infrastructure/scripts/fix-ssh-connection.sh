#!/bin/bash
# ===========================================
# SSH Connection Fix Script
# ===========================================
# This script helps diagnose and fix SSH connection issues between EC2 instances
#
# Usage:
#   ./fix-ssh-connection.sh <source-ip> <target-ip> [region]
#
# Example:
#   ./fix-ssh-connection.sh 10.0.1.228 10.0.13.184 ap-south-1
# ===========================================

set -e

SOURCE_IP="${1:-10.0.1.228}"
TARGET_IP="${2:-10.0.13.184}"
REGION="${3:-ap-south-1}"

echo "==========================================="
echo "SSH Connection Diagnostic & Fix Script"
echo "==========================================="
echo "Source IP: $SOURCE_IP"
echo "Target IP: $TARGET_IP"
echo "Region: $REGION"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "ℹ $1"
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check AWS credentials
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS credentials not configured. Please run 'aws configure' first."
    exit 1
fi

print_info "Step 1: Finding EC2 instances..."
echo ""

# Get source instance details
SOURCE_INSTANCE=$(aws ec2 describe-instances \
    --filters "Name=private-ip-address,Values=$SOURCE_IP" \
    --region $REGION \
    --query 'Reservations[0].Instances[0]' \
    --output json 2>/dev/null)

if [ "$SOURCE_INSTANCE" == "null" ] || [ -z "$SOURCE_INSTANCE" ]; then
    print_error "Source instance with IP $SOURCE_IP not found in region $REGION"
    exit 1
fi

SOURCE_INSTANCE_ID=$(echo $SOURCE_INSTANCE | jq -r '.InstanceId')
SOURCE_SG_ID=$(echo $SOURCE_INSTANCE | jq -r '.SecurityGroups[0].GroupId')
SOURCE_SG_NAME=$(echo $SOURCE_INSTANCE | jq -r '.SecurityGroups[0].GroupName')
SOURCE_STATE=$(echo $SOURCE_INSTANCE | jq -r '.State.Name')
SOURCE_VPC=$(echo $SOURCE_INSTANCE | jq -r '.VpcId')

print_success "Source instance found: $SOURCE_INSTANCE_ID"
print_info "  - Security Group: $SOURCE_SG_NAME ($SOURCE_SG_ID)"
print_info "  - State: $SOURCE_STATE"
print_info "  - VPC: $SOURCE_VPC"
echo ""

# Get target instance details
TARGET_INSTANCE=$(aws ec2 describe-instances \
    --filters "Name=private-ip-address,Values=$TARGET_IP" \
    --region $REGION \
    --query 'Reservations[0].Instances[0]' \
    --output json 2>/dev/null)

if [ "$TARGET_INSTANCE" == "null" ] || [ -z "$TARGET_INSTANCE" ]; then
    print_error "Target instance with IP $TARGET_IP not found in region $REGION"
    exit 1
fi

TARGET_INSTANCE_ID=$(echo $TARGET_INSTANCE | jq -r '.InstanceId')
TARGET_SG_ID=$(echo $TARGET_INSTANCE | jq -r '.SecurityGroups[0].GroupId')
TARGET_SG_NAME=$(echo $TARGET_INSTANCE | jq -r '.SecurityGroups[0].GroupName')
TARGET_STATE=$(echo $TARGET_INSTANCE | jq -r '.State.Name')
TARGET_VPC=$(echo $TARGET_INSTANCE | jq -r '.VpcId')

print_success "Target instance found: $TARGET_INSTANCE_ID"
print_info "  - Security Group: $TARGET_SG_NAME ($TARGET_SG_ID)"
print_info "  - State: $TARGET_STATE"
print_info "  - VPC: $TARGET_VPC"
echo ""

# Check if instances are in the same VPC
if [ "$SOURCE_VPC" != "$TARGET_VPC" ]; then
    print_error "Instances are in different VPCs!"
    print_info "  Source VPC: $SOURCE_VPC"
    print_info "  Target VPC: $TARGET_VPC"
    print_warning "You need VPC Peering or Transit Gateway to connect instances in different VPCs."
    exit 1
fi

# Check instance states
if [ "$SOURCE_STATE" != "running" ]; then
    print_error "Source instance is not running (state: $SOURCE_STATE)"
    exit 1
fi

if [ "$TARGET_STATE" != "running" ]; then
    print_error "Target instance is not running (state: $TARGET_STATE)"
    exit 1
fi

print_info "Step 2: Checking security group rules..."
echo ""

# Check if target security group allows SSH from source security group
SSH_RULE_EXISTS=$(aws ec2 describe-security-groups \
    --group-ids $TARGET_SG_ID \
    --region $REGION \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`22\` && ToPort==\`22\` && IpProtocol==\`tcp\`]" \
    --output json 2>/dev/null)

# Check for security group reference
SG_REF_EXISTS=$(echo $SSH_RULE_EXISTS | jq -r ".[] | select(.UserIdGroupPairs[0].GroupId == \"$SOURCE_SG_ID\")" 2>/dev/null || echo "")

# Check for VPC CIDR
VPC_CIDR=$(aws ec2 describe-vpcs --vpc-ids $TARGET_VPC --region $REGION --query 'Vpcs[0].CidrBlock' --output text)
CIDR_RULE_EXISTS=$(echo $SSH_RULE_EXISTS | jq -r ".[] | select(.IpRanges[0].CidrIp == \"$VPC_CIDR\")" 2>/dev/null || echo "")

if [ -n "$SG_REF_EXISTS" ] && [ "$SG_REF_EXISTS" != "null" ]; then
    print_success "Security group rule exists: SSH allowed from source security group"
elif [ -n "$CIDR_RULE_EXISTS" ] && [ "$CIDR_RULE_EXISTS" != "null" ]; then
    print_warning "SSH allowed from VPC CIDR ($VPC_CIDR), but not specifically from source security group"
    print_info "Adding security group-based rule for better security..."
    
    # Add security group rule
    if aws ec2 authorize-security-group-ingress \
        --group-id $TARGET_SG_ID \
        --protocol tcp \
        --port 22 \
        --source-group $SOURCE_SG_ID \
        --region $REGION \
        --description "SSH from $SOURCE_SG_NAME" 2>/dev/null; then
        print_success "Added SSH rule allowing from source security group"
    else
        print_warning "Rule might already exist or there was an error"
    fi
else
    print_error "No SSH rule found allowing connection from source"
    print_info "Adding SSH rule to allow connection from source security group..."
    
    # Add security group rule
    if aws ec2 authorize-security-group-ingress \
        --group-id $TARGET_SG_ID \
        --protocol tcp \
        --port 22 \
        --source-group $SOURCE_SG_ID \
        --region $REGION \
        --description "SSH from $SOURCE_SG_NAME" 2>/dev/null; then
        print_success "Added SSH rule allowing from source security group"
    else
        print_error "Failed to add security group rule"
        print_info "Trying to add VPC CIDR rule instead..."
        
        if aws ec2 authorize-security-group-ingress \
            --group-id $TARGET_SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr $VPC_CIDR \
            --region $REGION \
            --description "SSH from VPC" 2>/dev/null; then
            print_success "Added SSH rule allowing from VPC CIDR"
        else
            print_error "Failed to add security group rule. Please check manually."
            exit 1
        fi
    fi
fi

echo ""
print_info "Step 3: Verifying security group rules..."
echo ""

# List all SSH rules
aws ec2 describe-security-groups \
    --group-ids $TARGET_SG_ID \
    --region $REGION \
    --query "SecurityGroups[0].IpPermissions[?FromPort==\`22\` && ToPort==\`22\` && IpProtocol==\`tcp\`]" \
    --output table

echo ""
print_success "Security group configuration complete!"
echo ""
print_info "You can now try SSH connection:"
echo "  ssh -i ~/.ssh/deploy-key.pem ec2-user@$TARGET_IP"
echo ""
print_info "If connection still fails, check:"
echo "  1. Network ACLs (they can override security groups)"
echo "  2. SSH service status on target instance"
echo "  3. Route tables for proper routing"
echo "  4. Instance is accessible via AWS Systems Manager Session Manager"
echo ""







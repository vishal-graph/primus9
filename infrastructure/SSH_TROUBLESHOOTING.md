# SSH Connection Troubleshooting Guide

## Problem: SSH Connection Timeout Between EC2 Instances

When trying to SSH from one EC2 instance to another:
```bash
ssh -i ~/.ssh/deploy-key.pem ec2-user@10.0.13.184
# Error: ssh: connect to host 10.0.13.184 port 22: Connection timed out
```

## Common Causes & Solutions

### 1. Security Group Rules

The target instance's security group must allow SSH (port 22) from the source instance.

#### Check Current Security Groups

```bash
# On source instance (10.0.1.228)
aws ec2 describe-instances --instance-ids $(ec2-metadata --instance-id | cut -d " " -f 2) \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].GroupId' --output text

# On target instance (10.0.13.184) - if you can access it via AWS Console
# Or use AWS CLI from your local machine:
aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=10.0.13.184" \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName}' \
  --output table
```

#### Solution A: Allow SSH from Source Security Group (Recommended)

This is more secure than allowing from entire VPC CIDR:

```bash
# Get source instance security group ID
SOURCE_SG=$(aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=10.0.1.228" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Get target instance security group ID
TARGET_SG=$(aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=10.0.13.184" \
  --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
  --output text)

# Add SSH rule to target security group allowing from source security group
aws ec2 authorize-security-group-ingress \
  --group-id $TARGET_SG \
  --protocol tcp \
  --port 22 \
  --source-group $SOURCE_SG \
  --region ap-south-1
```

#### Solution B: Allow SSH from VPC CIDR

If instances are in the same VPC:

```bash
# Get VPC CIDR
VPC_CIDR=$(aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=*vision*vpc" \
  --query 'Vpcs[0].CidrBlock' \
  --output text)

# Add SSH rule
aws ec2 authorize-security-group-ingress \
  --group-id $TARGET_SG \
  --protocol tcp \
  --port 22 \
  --cidr $VPC_CIDR \
  --region ap-south-1
```

#### Solution C: Allow SSH from Specific IP

If you know the source IP:

```bash
aws ec2 authorize-security-group-ingress \
  --group-id $TARGET_SG \
  --protocol tcp \
  --port 22 \
  --cidr 10.0.1.228/32 \
  --region ap-south-1
```

### 2. Network ACLs

Network ACLs can block traffic even if security groups allow it.

```bash
# Check Network ACL rules
aws ec2 describe-network-acls \
  --filters "Name=vpc-id,Values=<vpc-id>" \
  --query 'NetworkAcls[*].{NetworkAclId:NetworkAclId,Entries:Entries}' \
  --output json
```

Ensure Network ACLs allow:
- Inbound: TCP port 22 from source subnet
- Outbound: TCP port 22 to destination subnet

### 3. Instances in Different VPCs

If instances are in different VPCs, you need:
- VPC Peering Connection
- Transit Gateway
- VPN Connection

Check VPC IDs:
```bash
# Source instance VPC
aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=10.0.1.228" \
  --query 'Reservations[0].Instances[0].VpcId' \
  --output text

# Target instance VPC
aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=10.0.13.184" \
  --query 'Reservations[0].Instances[0].VpcId' \
  --output text
```

### 4. Instance State

Verify target instance is running:

```bash
aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=10.0.13.184" \
  --query 'Reservations[0].Instances[0].State.Name' \
  --output text
```

### 5. SSH Service Status

If you can access the target instance via another method (AWS Systems Manager Session Manager, console, etc.):

```bash
# Check if SSH service is running
sudo systemctl status sshd
# or
sudo systemctl status ssh

# Check SSH configuration
sudo cat /etc/ssh/sshd_config | grep -E "Port|ListenAddress|PermitRootLogin"
```

### 6. Route Tables

Verify routing between subnets:

```bash
# Get route tables for both subnets
aws ec2 describe-route-tables \
  --filters "Name=association.subnet-id,Values=<subnet-id>" \
  --query 'RouteTables[*].Routes' \
  --output json
```

## Quick Diagnostic Script

Run this on the source instance:

```bash
#!/bin/bash
SOURCE_IP="10.0.1.228"
TARGET_IP="10.0.13.184"

echo "=== Network Connectivity Test ==="
echo "Testing connectivity to $TARGET_IP:22"

# Test basic connectivity
ping -c 3 $TARGET_IP

# Test port 22
nc -zv -w 5 $TARGET_IP 22

# Test with telnet
timeout 5 telnet $TARGET_IP 22

# Check security groups
echo -e "\n=== Security Group Check ==="
aws ec2 describe-instances \
  --filters "Name=private-ip-address,Values=$TARGET_IP" \
  --query 'Reservations[0].Instances[0].SecurityGroups[*].{GroupId:GroupId,GroupName:GroupName}' \
  --output table
```

## Terraform Fix

Update `security-groups.tf` to allow SSH between security groups:

```hcl
# Add to application security group
ingress {
  from_port       = 22
  to_port         = 22
  protocol        = "tcp"
  security_groups = [aws_security_group.application.id, aws_security_group.worker.id]
  description     = "SSH from other application/worker instances"
}

# Add to worker security group
ingress {
  from_port       = 22
  to_port         = 22
  protocol        = "tcp"
  security_groups = [aws_security_group.application.id, aws_security_group.worker.id]
  description     = "SSH from other application/worker instances"
}
```

Then apply:
```bash
cd infrastructure/terraform
terraform plan
terraform apply
```

## Alternative: Use AWS Systems Manager Session Manager

If SSH is not working, use SSM Session Manager (no SSH needed):

```bash
# Install SSM agent (usually pre-installed on Amazon Linux 2023)
sudo systemctl status amazon-ssm-agent

# Connect via Session Manager
aws ssm start-session --target <instance-id>
```

## Verification

After fixing security groups:

```bash
# Test SSH connection
ssh -i ~/.ssh/deploy-key.pem -v ec2-user@10.0.13.184

# If connection works, you should see:
# "Authenticated to 10.0.13.184 ([10.0.13.184]:22)"
```

## Common Mistakes

1. **Wrong security group**: Instance might have multiple security groups, check all of them
2. **Wrong region**: Ensure you're checking security groups in the correct AWS region
3. **Instance in stopped state**: Verify instance is running
4. **Wrong IP address**: Double-check the target IP is correct
5. **SSH key permissions**: Ensure key has correct permissions: `chmod 400 ~/.ssh/deploy-key.pem`







#!/bin/bash

# Create SQS Queues for TatvaOps Vision - 3D Walkthrough System
# Run this script to set up required SQS queues

set -e

REGION="ap-south-1"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Creating SQS Queues for TatvaOps Vision"
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo ""

# ============================================
# PART 1: SENSE LAYER - Sense Inference Queue
# ============================================

QUEUE_NAME="tatvaops-vision-sense-inference"
DLQ_NAME="tatvaops-vision-sense-inference-dlq"

echo "📦 Creating Dead Letter Queue: $DLQ_NAME"
DLQ_URL=$(aws sqs create-queue \
  --queue-name "$DLQ_NAME" \
  --region "$REGION" \
  --attributes '{
    "MessageRetentionPeriod": "1209600",
    "VisibilityTimeout": "300"
  }' \
  --query 'QueueUrl' \
  --output text 2>/dev/null || aws sqs get-queue-url --queue-name "$DLQ_NAME" --region "$REGION" --query 'QueueUrl' --output text)

echo "✅ DLQ Created/Found: $DLQ_URL"

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
  --queue-url "$DLQ_URL" \
  --attribute-names QueueArn \
  --region "$REGION" \
  --query 'Attributes.QueueArn' \
  --output text)

echo "📦 Creating Main Queue: $QUEUE_NAME"
QUEUE_URL=$(aws sqs create-queue \
  --queue-name "$QUEUE_NAME" \
  --region "$REGION" \
  --attributes "{
    \"MessageRetentionPeriod\": \"1209600\",
    \"VisibilityTimeout\": \"300\",
    \"ReceiveMessageWaitTimeSeconds\": \"20\",
    \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
  }" \
  --query 'QueueUrl' \
  --output text 2>/dev/null || aws sqs get-queue-url --queue-name "$QUEUE_NAME" --region "$REGION" --query 'QueueUrl' --output text)

echo "✅ Main Queue Created/Found: $QUEUE_URL"
echo ""

# ============================================
# DISPLAY QUEUE INFORMATION
# ============================================

echo "📋 Queue Configuration Summary"
echo "================================"
echo ""
echo "SENSE INFERENCE QUEUE:"
echo "  Name: $QUEUE_NAME"
echo "  URL: $QUEUE_URL"
echo "  Region: $REGION"
echo ""
echo "DEAD LETTER QUEUE:"
echo "  Name: $DLQ_NAME"
echo "  URL: $DLQ_URL"
echo ""

# ============================================
# GENERATE .ENV ENTRIES
# ============================================

echo "📝 Add these to your .env files:"
echo "================================"
echo ""
echo "# Backend .env"
echo "SQS_QUEUE_SENSE_INFERENCE=$QUEUE_URL"
echo ""
echo "# Worker .env"
echo "SQS_QUEUE_SENSE_INFERENCE=$QUEUE_URL"
echo ""

# ============================================
# OPTIONAL: VERIFY EXISTING QUEUES
# ============================================

echo "📋 All TatvaOps Vision Queues:"
echo "================================"
aws sqs list-queues --region "$REGION" --queue-name-prefix "tatvaops-vision" --output table 2>/dev/null || echo "No queues found with prefix 'tatvaops-vision'"
echo ""

echo "✅ SQS Queue Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Copy the .env entries above to backend/.env and worker/.env"
echo "2. Restart backend and worker services"
echo "3. Test with: npm run test:sense-layer"

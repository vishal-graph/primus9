# Create SQS Queues for TatvaOps Vision - 3D Walkthrough System
# PowerShell version for Windows

$ErrorActionPreference = "Stop"

$REGION = "ap-south-1"
$ACCOUNT_ID = (aws sts get-caller-identity --query Account --output text)

Write-Host "🚀 Creating SQS Queues for TatvaOps Vision" -ForegroundColor Green
Write-Host "Region: $REGION"
Write-Host "Account: $ACCOUNT_ID"
Write-Host ""

# ============================================
# PART 1: SENSE LAYER - Sense Inference Queue
# ============================================

$QUEUE_NAME = "tatvaops-vision-sense-inference"
$DLQ_NAME = "tatvaops-vision-sense-inference-dlq"

Write-Host "📦 Creating Dead Letter Queue: $DLQ_NAME" -ForegroundColor Yellow

try {
    $DLQ_URL = aws sqs create-queue `
        --queue-name $DLQ_NAME `
        --region $REGION `
        --attributes '{\"MessageRetentionPeriod\":\"1209600\",\"VisibilityTimeout\":\"300\"}' `
        --query 'QueueUrl' `
        --output text
} catch {
    $DLQ_URL = aws sqs get-queue-url --queue-name $DLQ_NAME --region $REGION --query 'QueueUrl' --output text
}

Write-Host "✅ DLQ Created/Found: $DLQ_URL" -ForegroundColor Green

# Get DLQ ARN
$DLQ_ARN = aws sqs get-queue-attributes `
    --queue-url $DLQ_URL `
    --attribute-names QueueArn `
    --region $REGION `
    --query 'Attributes.QueueArn' `
    --output text

Write-Host "📦 Creating Main Queue: $QUEUE_NAME" -ForegroundColor Yellow

$RedrivePolicy = "{`\`"deadLetterTargetArn`\`":`\`"$DLQ_ARN`\`",`\`"maxReceiveCount`\`":`\`"3`\`"}"
$Attributes = @{
    MessageRetentionPeriod = "1209600"
    VisibilityTimeout = "300"
    ReceiveMessageWaitTimeSeconds = "20"
    RedrivePolicy = $RedrivePolicy
} | ConvertTo-Json -Compress

try {
    $QUEUE_URL = aws sqs create-queue `
        --queue-name $QUEUE_NAME `
        --region $REGION `
        --attributes $Attributes `
        --query 'QueueUrl' `
        --output text
} catch {
    $QUEUE_URL = aws sqs get-queue-url --queue-name $QUEUE_NAME --region $REGION --query 'QueueUrl' --output text
}

Write-Host "✅ Main Queue Created/Found: $QUEUE_URL" -ForegroundColor Green
Write-Host ""

# ============================================
# DISPLAY QUEUE INFORMATION
# ============================================

Write-Host "📋 Queue Configuration Summary" -ForegroundColor Cyan
Write-Host "================================"
Write-Host ""
Write-Host "SENSE INFERENCE QUEUE:"
Write-Host "  Name: $QUEUE_NAME"
Write-Host "  URL: $QUEUE_URL"
Write-Host "  Region: $REGION"
Write-Host ""
Write-Host "DEAD LETTER QUEUE:"
Write-Host "  Name: $DLQ_NAME"
Write-Host "  URL: $DLQ_URL"
Write-Host ""

# ============================================
# GENERATE .ENV ENTRIES
# ============================================

Write-Host "📝 Add these to your .env files:" -ForegroundColor Cyan
Write-Host "================================"
Write-Host ""
Write-Host "# Backend .env"
Write-Host "SQS_QUEUE_SENSE_INFERENCE=$QUEUE_URL" -ForegroundColor Yellow
Write-Host ""
Write-Host "# Worker .env"
Write-Host "SQS_QUEUE_SENSE_INFERENCE=$QUEUE_URL" -ForegroundColor Yellow
Write-Host ""

# ============================================
# OPTIONAL: VERIFY EXISTING QUEUES
# ============================================

Write-Host "📋 All TatvaOps Vision Queues:" -ForegroundColor Cyan
Write-Host "================================"
aws sqs list-queues --region $REGION --queue-name-prefix "tatvaops-vision" --output table
Write-Host ""

Write-Host "✅ SQS Queue Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "1. Copy the .env entries above to backend/.env and worker/.env"
Write-Host "2. Restart backend and worker services"
Write-Host "3. Test the Sense Layer"

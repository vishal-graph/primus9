# AWS Deployment Guide - TatvaOps Vision

## ✅ Code Successfully Pushed to GitHub
Repository: https://github.com/tatvaops/tatvaops-vision

## 🚀 AWS Deployment Steps

### Pre-Deployment Checklist

#### 1. **Update Production Environment Variables**

You need to set these in your AWS environment (EC2 Parameter Store, Secrets Manager, or directly in EC2):

**Backend Production `.env`:**
```env
# Database
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/tatvaops_vision

# Redis
REDIS_URL=redis://your-elasticache-endpoint:6379

# Clerk
CLERK_SECRET_KEY=sk_live_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-south-1

# S3 Buckets
S3_BUCKET_FLOORPLANS=tatvaops-floorplans-prod
S3_BUCKET_MOODBOARDS=tatvaops-moodboards-prod
S3_BUCKET_RENDERS=tatvaops-renders-prod
S3_BUCKET_EXPORTS=tatvaops-exports-prod

# SQS Queues (get from Terraform outputs)
SQS_QUEUE_FLOORPLAN_ANALYSIS=https://sqs.ap-south-1.amazonaws.com/xxx/floorplan-analysis-prod
SQS_QUEUE_MOODBOARD_GENERATION=https://sqs.ap-south-1.amazonaws.com/xxx/moodboard-generation-prod
SQS_QUEUE_INTERIOR_VIEW_GENERATION=https://sqs.ap-south-1.amazonaws.com/xxx/interior-view-generation-prod
SQS_QUEUE_COMPONENT_UPDATE=https://sqs.ap-south-1.amazonaws.com/xxx/component-update-prod
SQS_QUEUE_NOTIFICATION=https://sqs.ap-south-1.amazonaws.com/xxx/notification-prod

# Gemini
GEMINI_API_KEY=xxx

# Razorpay (PRODUCTION KEYS)
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=<get_from_razorpay_dashboard>

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE
```

**Frontend Production `.env`:**
```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE
```

---

### 2. **Database Migration**

SSH into your production EC2 instance and run:

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to backend
cd /opt/tatvaops-vision/backend

# Run database migration
npx prisma db push

# Seed credit packs
npx tsx prisma/seed-credits.ts

# Grant welcome credits to existing users
npx tsx scripts/grant-welcome-credits.ts
```

**IMPORTANT**: Update credit pack prices in `prisma/seed-credits.ts` before seeding:
- Change ₹9 → ₹999 (Growth pack)
- Change ₹18 → ₹1899 (Scale pack)
- Or keep testing prices if desired

---

### 3. **Razorpay Webhook Configuration (Production)**

1. Go to: https://dashboard.razorpay.com/app/webhooks

2. Create new webhook with:
   - **URL**: `https://api.yourdomain.com/api/webhooks/razorpay`
   - **Secret**: Generate a strong secret
   - **Events**:
     - ✅ `payment.captured`
     - ✅ `payment.failed`
     - ✅ `payment.authorized`
     - ✅ `subscription.activated`
     - ✅ `subscription.cancelled`

3. Copy the webhook secret

4. Add to production environment variables:
   ```env
   RAZORPAY_WEBHOOK_SECRET=whsec_production_secret_here
   ```

---

### 4. **AWS Deployment Options**

#### Option A: Manual Docker Deployment (Recommended for testing)

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Navigate to project
cd /opt/tatvaops-vision

# Pull latest code
git pull origin main

# Build and restart services
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
docker-compose -f docker-compose.prod.yml logs -f worker
```

#### Option B: AWS CodeDeploy (Automated)

If you have CodeDeploy configured:

```bash
# From your local machine
cd tatvaops-vision

# Create deployment
aws deploy create-deployment \
  --application-name tatvaops-vision \
  --deployment-group-name production \
  --github-location repository=tatvaops/tatvaops-vision,commitId=$(git rev-parse HEAD) \
  --region ap-south-1
```

Or push a tag to trigger GitHub Actions:

```bash
git tag -a v1.0.0 -m "Credit system, Razorpay payments, user profiles"
git push origin v1.0.0
```

#### Option C: Terraform + Docker

```bash
cd infrastructure/terraform

# Initialize Terraform (if not done)
terraform init

# Plan deployment
terraform plan -var-file="environments/production.tfvars"

# Apply changes (creates/updates AWS resources)
terraform apply -var-file="environments/production.tfvars"
```

---

### 5. **Verify Deployment**

#### Health Checks
```bash
# Backend health
curl https://api.yourdomain.com/health

# Frontend
curl https://yourdomain.com

# Check worker logs
ssh -i your-key.pem ubuntu@your-ec2-ip
cd /opt/tatvaops-vision
docker logs tatvaops-worker
```

#### Database Verification
```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Connect to PostgreSQL
psql -h your-rds-endpoint -U username -d tatvaops_vision

# Check new tables
\dt

# Verify credit packs
SELECT * FROM "CreditPack";

# Check user wallets
SELECT * FROM "UserWallet";
```

#### API Endpoint Tests
```bash
# Get credit packs
curl https://api.yourdomain.com/api/credits/packs

# Health check with auth (replace with your token)
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://api.yourdomain.com/api/credits/balance
```

---

### 6. **DNS & SSL Configuration**

#### Route53 Setup
```bash
# Ensure your domain points to:
# - api.yourdomain.com → EC2/Load Balancer (Backend)
# - yourdomain.com → EC2/CloudFront (Frontend)
```

#### SSL Certificates
```bash
# If using AWS Certificate Manager
# 1. Request certificate in ACM
# 2. Validate via DNS
# 3. Attach to Load Balancer/CloudFront
```

---

### 7. **Post-Deployment Monitoring**

#### CloudWatch Logs
```bash
# View backend logs
aws logs tail /tatvaops/vision/backend --follow

# View worker logs
aws logs tail /tatvaops/vision/worker --follow
```

#### Application Metrics
- **Credits**: Monitor credit transactions in database
- **Payments**: Check Razorpay dashboard for successful payments
- **Webhooks**: Monitor webhook delivery in Razorpay dashboard
- **API**: CloudWatch API Gateway metrics

#### Database Monitoring
```sql
-- Credit usage by user
SELECT 
  u.email, 
  w.balance, 
  w.totalEarned, 
  w.totalSpent
FROM "User" u
JOIN "UserWallet" w ON w."userId" = u.id
ORDER BY w.totalSpent DESC
LIMIT 10;

-- Recent payments
SELECT 
  p.id,
  u.email,
  p.credits,
  p.amount,
  p.status,
  p."createdAt"
FROM "Payment" p
JOIN "User" u ON u.id = p."userId"
ORDER BY p."createdAt" DESC
LIMIT 10;

-- TatvaOps user usage
SELECT 
  u.email,
  COUNT(t.id) as transactions,
  SUM(ABS(t.amount)) as total_credits_used
FROM "User" u
JOIN "UserWallet" w ON w."userId" = u.id
JOIN "CreditTransaction" t ON t."walletId" = w.id
WHERE u.email LIKE '%@tatvaops.com'
  AND t.amount < 0
GROUP BY u.email
ORDER BY total_credits_used DESC;
```

---

### 8. **Rollback Plan**

If something goes wrong:

```bash
# SSH to EC2
ssh -i your-key.pem ubuntu@your-ec2-ip

# Rollback to previous version
cd /opt/tatvaops-vision
git log --oneline  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Or use specific image versions
docker-compose -f docker-compose.prod.yml pull
```

---

### 9. **Security Considerations**

#### Before Going Live:

1. **Change Credit Pack Prices**:
   - Update from ₹9/₹18 to production prices (₹999/₹1899)
   - Re-run seed script

2. **Webhook Security**:
   - Ensure RAZORPAY_WEBHOOK_SECRET is set
   - Test webhook signature verification

3. **Environment Variables**:
   - Never commit production .env files
   - Use AWS Secrets Manager for sensitive data

4. **CORS**:
   - Update CORS_ORIGINS to production domain
   - Remove localhost origins

5. **Rate Limiting**:
   - Verify rate limits are appropriate for production
   - Monitor for abuse

---

### 10. **Testing in Production**

1. **Create Test User**: Sign up with test email
2. **Test Onboarding**: Complete profile with location
3. **Test Credit Purchase**:
   - Go to /pricing
   - Select a pack
   - Complete Razorpay checkout
   - Verify credits added
   - Check webhook delivery
4. **Test AI Features**:
   - Upload floor plan
   - Generate moodboards
   - Verify credit deduction
5. **Test TatvaOps User**:
   - Sign up with @tatvaops.com email
   - Verify unlimited credits
   - Monitor usage warnings

---

## 📊 Infrastructure Costs (Estimated)

With this credit system:
- **EC2 (t3.medium)**: ~$30/month
- **RDS PostgreSQL (db.t3.micro)**: ~$15/month
- **ElastiCache Redis**: ~$15/month
- **S3 Storage**: ~$5-20/month (depends on usage)
- **CloudWatch**: ~$5/month
- **Data Transfer**: ~$10/month

**Total**: ~$80-100/month

---

## 🔍 Troubleshooting Common Issues

### Payment Not Completing
- Check Razorpay webhook logs
- Verify webhook secret matches
- Check backend logs for webhook errors

### Credits Not Deducting
- Check CreditWorkerService logs
- Verify job status in database
- Check for pre-check failures

### Database Migration Failing
- Check PostgreSQL version compatibility
- Verify database user has CREATE/ALTER privileges
- Run migrations manually with --force-reset (⚠️ dangerous)

### TatvaOps User Not Getting Unlimited Credits
- Verify email domain check in `isTatvaOpsUser()`
- Check wallet initialization
- Verify auth middleware populating user email

---

## 📞 Support

- **Infrastructure Issues**: Check CloudWatch logs
- **Payment Issues**: Razorpay dashboard
- **Database Issues**: RDS CloudWatch metrics
- **Application Logs**: `/opt/tatvaops-vision/logs/`

---

**Status**: ✅ Code pushed to GitHub, ready for AWS deployment
**Last Updated**: 2025-12-27



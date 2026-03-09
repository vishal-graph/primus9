# TatvaOps Vision - Deployment Summary

## ✅ Git Push Completed

All changes have been successfully pushed to GitHub:
- **Repository**: https://github.com/tatvaops/tatvaops-vision
- **Branch**: main
- **Latest Commit**: feat: Complete credit system, Razorpay payments, user profiles & TatvaOps unlimited credits

### Changes Deployed
- 75 files changed, 8784 insertions(+)
- Complete credit system with ledger-based accounting
- Razorpay payment integration
- User profiles and onboarding
- Location picker with Google Maps
- Discount pricing (₹9/₹18 for testing)
- TatvaOps unlimited credits with monitoring
- Comprehensive documentation

---

## 🏗️ AWS Infrastructure Status

### Existing Infrastructure (Already Deployed)

Your AWS infrastructure is **ALREADY LIVE** with the following resources:

#### Networking
- **VPC ID**: `vpc-07cf1852608a103a4`
- **Public Subnets**: 3 subnets across AZs
- **Private Subnets**: 3 subnets for applications
- **Database Subnets**: 3 isolated subnets

#### Application
- **Load Balancer**: `tatvaops-vision-production-alb`
  - **DNS**: `tatvaops-vision-production-alb-189193662.ap-south-1.elb.amazonaws.com`
  - **Domain**: `https://vision.tatvaops.com`
- **SSL Certificate**: Configured (ARN: `arn:aws:acm:...`)
- **Auto Scaling Groups**: 
  - Application ASG
  - Worker ASG

#### Database
- **RDS PostgreSQL 15**
  - **Endpoint**: `tatvaops-vision-production-postgres.cdg208s82gly.ap-south-1.rds.amazonaws.com:5432`
  - **Database**: `tatvaops_vision`
  - **Multi-AZ**: Enabled
  - **Backup**: 7-day retention

#### Cache
- **Redis (ElastiCache)**
  - **Endpoint**: `tatvaops-vision-production-redis.kkzk9l.0001.aps1.cache.amazonaws.com:6379`

#### Storage (S3 Buckets)
- `tatvaops-vision-production-floorplans`
- `tatvaops-vision-production-moodboards`
- `tatvaops-vision-production-renders`
- `tatvaops-vision-production-exports`

#### Message Queues (SQS)
- `tatvaops-vision-production-floorplan-analysis`
- `tatvaops-vision-production-moodboard-generation`
- `tatvaops-vision-production-interior-view-generation`
- `tatvaops-vision-production-component-update`
- `tatvaops-vision-production-notification`
- All with corresponding Dead Letter Queues

#### Bastion Host
- **Public IP**: `13.204.4.41`

---

## 🚀 Next Steps: Deploy Application Code

### Option 1: SSH Deployment (Manual, Fast)

1. **Connect to Bastion Host**:
```bash
# Get the SSH key from your secure location
ssh -i /path/to/tatvaops-vision.pem ubuntu@13.204.4.41
```

2. **From Bastion, Connect to Application Server**:
```bash
# Get application server private IP from AWS console or:
aws ec2 describe-instances \
  --filters "Name=tag:Role,Values=application" "Name=instance-state-name,Values=running" \
  --query "Reservations[*].Instances[*].[PrivateIpAddress]" \
  --output text

# SSH to application server
ssh ubuntu@<private-ip>
```

3. **Update Application Code**:
```bash
# Navigate to application directory
cd /opt/tatvaops-vision

# Pull latest code
git pull origin main

# Update backend
cd backend
npm install
npx prisma generate
npx prisma db push

# Seed credit packs (IMPORTANT: Update prices first!)
# Edit prisma/seed-credits.ts to change ₹9→₹999, ₹18→₹1899
npx tsx prisma/seed-credits.ts

# Grant welcome credits to existing users
npx tsx scripts/grant-welcome-credits.ts

# Update frontend
cd ../frontend
npm install

# Update worker
cd ../worker
npm install
npx prisma generate

# Restart services
cd ..
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

4. **Verify Deployment**:
```bash
# Check running containers
docker ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f worker

# Test health endpoint
curl http://localhost:4000/health
```

---

### Option 2: CodeDeploy (Automated, Recommended)

If CodeDeploy is set up:

```bash
# From your local machine
cd tatvaops-vision

# Create deployment
aws deploy create-deployment \
  --application-name tatvaops-vision \
  --deployment-group-name production \
  --github-location repository=tatvaops/tatvaops-vision,commitId=$(git rev-parse HEAD) \
  --region ap-south-1 \
  --deployment-config-name CodeDeployDefault.AllAtOnce

# Monitor deployment
aws deploy get-deployment \
  --deployment-id <deployment-id-from-above> \
  --region ap-south-1
```

---

### Option 3: GitHub Actions (If Configured)

Push a tag to trigger automatic deployment:

```bash
git tag -a v1.0.0 -m "Credit system, Razorpay, user profiles"
git push origin v1.0.0
```

---

## 🔧 Critical Production Updates

### 1. Update Environment Variables

SSH to application server and update `/opt/tatvaops-vision/backend/.env`:

```env
# Add Razorpay keys (if not already there)
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=<configure_in_razorpay_dashboard>

# Add Google Maps key
GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE
```

Update frontend `.env`:
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE
```

### 2. Configure Razorpay Webhook (IMPORTANT!)

1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Create webhook:
   - **URL**: `https://vision.tatvaops.com/api/webhooks/razorpay`
   - **Events**: `payment.captured`, `payment.failed`
   - **Secret**: Generate and save
3. Add secret to backend `.env`:
   ```env
   RAZORPAY_WEBHOOK_SECRET=whsec_production_secret_here
   ```

### 3. Update Credit Pack Prices (Production)

Before running seed script, edit `backend/prisma/seed-credits.ts`:

```typescript
// Change from testing prices:
priceInr: 900,  // ₹9
priceInr: 1800, // ₹18

// To production prices:
priceInr: 99900,  // ₹999
priceInr: 189900, // ₹1899
```

Then run:
```bash
npx tsx prisma/seed-credits.ts
```

---

## ✅ Post-Deployment Verification

### 1. Health Checks
```bash
# Backend
curl https://vision.tatvaops.com/api/health
# or
curl https://tatvaops-vision-production-alb-189193662.ap-south-1.elb.amazonaws.com/api/health

# Frontend
curl https://vision.tatvaops.com
```

### 2. Database Check
```bash
# From application server
psql -h tatvaops-vision-production-postgres.cdg208s82gly.ap-south-1.rds.amazonaws.com \
     -U tatvaops_admin \
     -d tatvaops_vision

# Check new tables
\dt

# Verify credit packs
SELECT * FROM "CreditPack";

# Check user wallets
SELECT COUNT(*) FROM "UserWallet";
```

### 3. Test Features
1. Visit: `https://vision.tatvaops.com`
2. Sign up/login
3. Complete onboarding
4. Go to `/pricing` - verify credit packs show with discount badges
5. Test payment (use small amount first!)
6. Verify webhook received
7. Check credits added to wallet

---

## 📊 Monitoring

### CloudWatch Logs
```bash
# Backend logs
aws logs tail /tatvaops/vision/backend --follow --region ap-south-1

# Worker logs
aws logs tail /tatvaops/vision/worker --follow --region ap-south-1
```

### Application Logs
```bash
# SSH to application server
ssh -i tatvaops-vision.pem ubuntu@13.204.4.41
ssh ubuntu@<app-server-private-ip>

# View logs
cd /opt/tatvaops-vision
docker-compose -f docker-compose.prod.yml logs -f
```

### Database Monitoring
```sql
-- Credit usage
SELECT 
  u.email, 
  w.balance, 
  w."totalEarned", 
  w."totalSpent"
FROM "User" u
JOIN "UserWallet" w ON w."userId" = u.id
ORDER BY w."totalSpent" DESC
LIMIT 10;

-- Recent payments
SELECT 
  u.email,
  p.credits,
  p.amount,
  p.status,
  p."createdAt"
FROM "Payment" p
JOIN "User" u ON u.id = p."userId"
ORDER BY p."createdAt" DESC
LIMIT 10;
```

---

## 🔐 Security Reminders

### Before Going Live:
- [ ] Update credit pack prices to production values
- [ ] Configure Razorpay production webhook
- [ ] Verify all environment variables set
- [ ] Test payment flow end-to-end
- [ ] Enable HTTPS redirect
- [ ] Review CORS settings
- [ ] Check rate limits
- [ ] Enable CloudWatch alarms
- [ ] Set up SNS notifications for errors
- [ ] Test rollback procedure
- [ ] Document access credentials securely

---

## 🆘 Rollback Plan

If deployment fails:

```bash
# SSH to application server
cd /opt/tatvaops-vision

# Revert to previous commit
git log --oneline
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📝 Summary

✅ **Code Pushed**: All changes in GitHub  
✅ **Infrastructure**: Already deployed and running  
⏳ **Application Deployment**: Choose Option 1, 2, or 3 above  
⏳ **Database Migration**: Run Prisma migrations  
⏳ **Razorpay Webhook**: Configure in dashboard  
⏳ **Testing**: Verify all features work  

**Estimated Deployment Time**: 15-30 minutes  
**Current URL**: https://vision.tatvaops.com  
**Load Balancer**: tatvaops-vision-production-alb-189193662.ap-south-1.elb.amazonaws.com

---

**Need Help?**
- Infrastructure issues: Check Terraform outputs
- Application logs: Docker Compose logs
- Database: RDS CloudWatch metrics
- Payment: Razorpay dashboard

**Last Updated**: 2025-12-27



# Production Environment Variables Setup

## 🚨 Critical: Fix Payment Error

The payment error is likely due to missing or incorrect `NEXT_PUBLIC_API_URL` environment variable.

---

## Frontend Environment Variables

### Required for Production

SSH to your production server and update `/opt/tatvaops-vision/frontend/.env.local` or `.env.production`:

```env
# API Configuration (CRITICAL - Must be set correctly!)
NEXT_PUBLIC_API_URL=https://vision.tatvaops.com

# OR if backend is on a different subdomain:
# NEXT_PUBLIC_API_URL=https://api.vision.tatvaops.com

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_xxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/entry

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE

# Application URL
NEXT_PUBLIC_APP_URL=https://vision.tatvaops.com
```

---

## Backend Environment Variables

Update `/opt/tatvaops-vision/backend/.env`:

```env
# Database
DATABASE_URL=postgresql://username:password@your-rds-endpoint:5432/tatvaops_vision

# Redis
REDIS_URL=redis://your-elasticache-endpoint:6379

# Clerk
CLERK_SECRET_KEY=sk_live_xxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxx

# AWS
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=ap-south-1

# S3 Buckets
S3_BUCKET_FLOORPLANS=tatvaops-vision-production-floorplans
S3_BUCKET_MOODBOARDS=tatvaops-vision-production-moodboards
S3_BUCKET_RENDERS=tatvaops-vision-production-renders
S3_BUCKET_EXPORTS=tatvaops-vision-production-exports

# SQS Queues
SQS_QUEUE_FLOORPLAN_ANALYSIS=https://sqs.ap-south-1.amazonaws.com/xxx/floorplan-analysis-prod
SQS_QUEUE_MOODBOARD_GENERATION=https://sqs.ap-south-1.amazonaws.com/xxx/moodboard-generation-prod
SQS_QUEUE_INTERIOR_VIEW_GENERATION=https://sqs.ap-south-1.amazonaws.com/xxx/interior-view-generation-prod
SQS_QUEUE_COMPONENT_UPDATE=https://sqs.ap-south-1.amazonaws.com/xxx/component-update-prod
SQS_QUEUE_NOTIFICATION=https://sqs.ap-south-1.amazonaws.com/xxx/notification-prod

# Gemini
GEMINI_API_KEY=xxx

# Razorpay
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=whsec_your_webhook_secret_from_razorpay_dashboard

# Google Maps
GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE

# CORS (Important - must include your domain)
CORS_ORIGINS=https://vision.tatvaops.com,https://www.vision.tatvaops.com

# Node Environment
NODE_ENV=production
PORT=4000
```

---

## Quick Fix Steps

### 1. SSH to Production Server

```bash
ssh -i your-key.pem ubuntu@your-ec2-ip
```

### 2. Update Frontend Environment

```bash
cd /opt/tatvaops-vision/frontend

# Edit or create .env.production
nano .env.production
```

Add:
```env
NEXT_PUBLIC_API_URL=https://vision.tatvaops.com
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIzaSyBKmPxBMomVgWR5r5eKJoImpjUCu4NcUAE
```

### 3. Update Backend Environment

```bash
cd /opt/tatvaops-vision/backend

# Edit .env
nano .env
```

Ensure these are set:
```env
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here
CORS_ORIGINS=https://vision.tatvaops.com
```

### 4. Restart Services

```bash
cd /opt/tatvaops-vision

# If using Docker Compose
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build frontend
docker-compose -f docker-compose.prod.yml up -d

# Or restart individually
docker-compose -f docker-compose.prod.yml restart frontend
docker-compose -f docker-compose.prod.yml restart backend
```

### 5. Verify

```bash
# Check frontend logs
docker logs tatvaops-frontend -f

# Check backend logs
docker logs tatvaops-backend -f

# Test API endpoint
curl https://vision.tatvaops.com/api/health
```

---

## Troubleshooting Payment Error

### Error: "Failed to create order"

**Possible Causes:**
1. `NEXT_PUBLIC_API_URL` not set or incorrect
2. Backend API not accessible
3. CORS issue
4. Authentication token missing

**Debug Steps:**

1. **Check Browser Console:**
   - Open DevTools (F12)
   - Go to Console tab
   - Look for `[createCreditOrder]` logs
   - Check the API URL being used

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Try to checkout
   - Look for failed requests to `/api/credits/order`
   - Check response status and error message

3. **Verify API URL:**
   ```bash
   # From production server
   curl https://vision.tatvaops.com/api/health
   # Should return: {"status":"ok"}
   ```

4. **Check Backend Logs:**
   ```bash
   docker logs tatvaops-backend | grep -i "credits/order"
   ```

5. **Test API Directly:**
   ```bash
   # Get auth token from browser (DevTools → Application → Cookies)
   curl -H "Authorization: Bearer YOUR_TOKEN" \
        -H "Content-Type: application/json" \
        -X POST https://vision.tatvaops.com/api/credits/order \
        -d '{"packId":"pack-id-here"}'
   ```

---

## Environment Variable Priority

Next.js uses this priority order:
1. `.env.production.local` (highest priority, not committed to git)
2. `.env.production`
3. `.env.local`
4. `.env`

**Best Practice:** Use `.env.production` for production-specific values.

---

## Docker Environment Variables

If using Docker Compose, you can also set env vars in `docker-compose.prod.yml`:

```yaml
services:
  frontend:
    environment:
      - NEXT_PUBLIC_API_URL=https://vision.tatvaops.com
      - NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
    env_file:
      - .env.production
```

---

## Verification Checklist

After updating environment variables:

- [ ] `NEXT_PUBLIC_API_URL` is set to `https://vision.tatvaops.com`
- [ ] Frontend service restarted
- [ ] Backend service restarted
- [ ] Browser console shows correct API URL in logs
- [ ] `/api/health` endpoint returns 200 OK
- [ ] Payment checkout works without errors
- [ ] Razorpay popup opens successfully

---

**Last Updated:** 2025-12-27  
**Domain:** vision.tatvaops.com


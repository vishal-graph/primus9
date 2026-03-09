# Razorpay Webhook Setup - Production (vision.tatvaops.com)

## 🎯 Production Webhook Configuration

Your production website is: **vision.tatvaops.com**

### Webhook URL
```
https://vision.tatvaops.com/api/webhooks/razorpay
```

---

## 📋 Step-by-Step Setup Instructions

### 1. Go to Razorpay Dashboard
Visit: https://dashboard.razorpay.com/app/webhooks

### 2. Click "Create New Webhook"

### 3. Configure Webhook Settings

**Webhook URL:**
```
https://vision.tatvaops.com/api/webhooks/razorpay
```

**Active:** ✅ Enabled

**Secret:** 
- Click "Generate Secret" or enter a custom secret
- **IMPORTANT:** Copy this secret - you'll need it for your backend `.env`

### 4. Select Events to Subscribe

Select the following events:

#### Payment Events (Required)
- ✅ `payment.captured` - When payment is successfully completed
- ✅ `payment.failed` - When payment fails
- ✅ `payment.authorized` - When payment is authorized (optional)

#### Subscription Events (If using subscriptions)
- ✅ `subscription.activated` - When subscription is activated
- ✅ `subscription.charged` - When recurring payment is charged
- ✅ `subscription.cancelled` - When subscription is cancelled
- ✅ `subscription.paused` - When subscription is paused
- ✅ `subscription.resumed` - When subscription is resumed

**Minimum Required Events:**
- `payment.captured` (most important)
- `payment.failed`

### 5. Save Webhook Configuration

Click "Create Webhook" or "Save"

---

## 🔐 Backend Configuration

### Update Production Environment Variables

SSH to your production server and update `/opt/tatvaops-vision/backend/.env`:

```bash
# SSH to production server
ssh -i your-key.pem ubuntu@your-ec2-ip

# Edit backend .env
nano /opt/tatvaops-vision/backend/.env
```

Add or update:
```env
# Razorpay Production Keys
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_from_razorpay_dashboard
```

**⚠️ IMPORTANT:** 
- Replace `whsec_your_secret_from_razorpay_dashboard` with the actual secret from Razorpay dashboard
- Never commit this secret to git
- Restart backend service after updating

### Restart Backend Service

```bash
# If using Docker Compose
cd /opt/tatvaops-vision
docker-compose -f docker-compose.prod.yml restart backend

# Or if using systemd
sudo systemctl restart tatvaops-backend
```

---

## ✅ Verify Webhook Setup

### 1. Test Webhook Delivery

In Razorpay Dashboard:
1. Go to **Webhooks** → Your webhook
2. Click **"Send Test Webhook"**
3. Select event: `payment.captured`
4. Check backend logs:

```bash
# View backend logs
docker logs tatvaops-backend -f
# or
tail -f /opt/tatvaops-vision/logs/backend.log
```

You should see:
```
Razorpay webhook received: payment.captured
Payment captured and credits added
```

### 2. Test with Real Payment

1. Go to: https://vision.tatvaops.com/pricing
2. Select a credit pack
3. Complete test payment (use Razorpay test mode or small amount)
4. Verify:
   - Payment appears in Razorpay dashboard
   - Webhook is delivered (check "Webhook Logs" in Razorpay)
   - Credits are added to user wallet
   - Transaction appears in `/credits` page

### 3. Check Webhook Logs in Razorpay

1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Click on your webhook
3. View "Webhook Logs" tab
4. Check delivery status:
   - ✅ **200 OK** = Success
   - ❌ **400/500** = Error (check backend logs)

---

## 🔍 Troubleshooting

### Webhook Not Receiving Events

**Check 1: Webhook URL is accessible**
```bash
curl https://vision.tatvaops.com/api/webhooks/razorpay
# Should return 400 (missing signature) not 404
```

**Check 2: Backend is running**
```bash
curl https://vision.tatvaops.com/api/health
# Should return {"status":"ok"}
```

**Check 3: SSL Certificate is valid**
```bash
curl -I https://vision.tatvaops.com
# Should return 200 OK
```

**Check 4: Firewall/Security Groups**
- Ensure port 443 (HTTPS) is open
- Check ALB security group allows inbound HTTPS
- Verify backend can receive POST requests

### Signature Verification Failing

**Error:** `Invalid signature` in backend logs

**Solution:**
1. Verify `RAZORPAY_WEBHOOK_SECRET` in backend `.env` matches Razorpay dashboard
2. Ensure secret doesn't have extra spaces or quotes
3. Restart backend after updating secret
4. Check webhook secret in Razorpay dashboard matches exactly

### Payment Captured but Credits Not Added

**Check 1: Backend logs**
```bash
docker logs tatvaops-backend | grep -i "payment\|credit"
```

**Check 2: Database**
```sql
-- Check payment record
SELECT * FROM "Payment" 
WHERE "razorpayPaymentId" = 'pay_xxx'
ORDER BY "createdAt" DESC;

-- Check credit transaction
SELECT * FROM "CreditTransaction" 
WHERE "type" = 'PURCHASE'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check user wallet
SELECT * FROM "UserWallet" 
WHERE "userId" = 'user-id-here';
```

**Check 3: Webhook handler**
- Verify `handlePaymentCaptured` function is being called
- Check for errors in transaction processing
- Verify user_id is in payment notes

---

## 📊 Monitoring Webhook Health

### Razorpay Dashboard
- **Webhook Logs**: View delivery status and response codes
- **Retry History**: See failed deliveries and retries
- **Event Timeline**: Track all webhook events

### Backend Logs
Monitor for:
- `Razorpay webhook received: payment.captured`
- `Payment captured and credits added`
- `Razorpay webhook signature mismatch` (error)
- `Payment already processed, skipping` (idempotency working)

### Database Queries
```sql
-- Recent webhook-processed payments
SELECT 
  p.id,
  p."razorpayPaymentId",
  p.status,
  p.credits,
  p."createdAt",
  u.email
FROM "Payment" p
JOIN "User" u ON u.id = p."userId"
WHERE p.status = 'COMPLETED'
ORDER BY p."createdAt" DESC
LIMIT 20;

-- Failed payments
SELECT 
  p.id,
  p."razorpayPaymentId",
  p.status,
  p."createdAt"
FROM "Payment" p
WHERE p.status = 'FAILED'
ORDER BY p."createdAt" DESC
LIMIT 10;
```

---

## 🔄 Webhook Retry Policy

Razorpay automatically retries failed webhooks:
- **First retry**: 5 minutes after failure
- **Second retry**: 15 minutes after failure
- **Third retry**: 1 hour after failure
- **Max retries**: 3 attempts

**Best Practice:** Ensure your webhook handler is idempotent (already implemented in our code).

---

## 🚨 Security Checklist

- [ ] Webhook URL uses HTTPS (not HTTP)
- [ ] Webhook secret is stored securely (not in git)
- [ ] Backend verifies webhook signature (already implemented)
- [ ] Rate limiting is configured (webhooks should bypass rate limits)
- [ ] SSL certificate is valid and not expired
- [ ] Firewall allows inbound HTTPS from Razorpay IPs

---

## 📝 Quick Reference

**Production Webhook URL:**
```
https://vision.tatvaops.com/api/webhooks/razorpay
```

**Required Events:**
- `payment.captured`
- `payment.failed`

**Backend Environment Variable:**
```env
RAZORPAY_WEBHOOK_SECRET=whsec_your_secret_here
```

**Test Command:**
```bash
curl -X POST https://vision.tatvaops.com/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "X-Razorpay-Signature: test" \
  -d '{"event":"payment.captured"}'
# Should return 400 (invalid signature) - this confirms endpoint is accessible
```

---

## ✅ Setup Complete Checklist

- [ ] Webhook created in Razorpay dashboard
- [ ] Webhook URL: `https://vision.tatvaops.com/api/webhooks/razorpay`
- [ ] Events selected: `payment.captured`, `payment.failed`
- [ ] Webhook secret copied from Razorpay
- [ ] `RAZORPAY_WEBHOOK_SECRET` added to backend `.env`
- [ ] Backend service restarted
- [ ] Test webhook sent from Razorpay dashboard
- [ ] Backend logs show successful webhook receipt
- [ ] Real payment test completed
- [ ] Credits added to user wallet after payment

---

**Last Updated:** 2025-12-27  
**Production Domain:** vision.tatvaops.com  
**Webhook Endpoint:** `/api/webhooks/razorpay`


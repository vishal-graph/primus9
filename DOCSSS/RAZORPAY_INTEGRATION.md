# Razorpay Payment Integration - Complete Guide

## ✅ Integration Status: FUNCTIONALLY READY

### 1. API Keys Configuration

#### Backend (.env)
```bash
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=<to_be_configured_in_razorpay_dashboard>
```

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
```

---

## 2. Architecture Overview

### Payment Flow
```
User (Frontend) → Create Order (Backend) → Razorpay Checkout → Payment Success → Webhook → Credit Wallet Updated
```

### Components

#### Backend
- **`/backend/src/config/index.ts`**: Reads Razorpay keys from env
- **`/backend/src/api/credits.ts`**: 
  - `POST /api/credits/order` - Creates Razorpay order
  - `POST /api/credits/verify` - Verifies payment signature
- **`/backend/src/api/webhooks/razorpay.ts`**: 
  - Handles `payment.captured` webhook
  - Handles `payment.failed` webhook
  - Handles subscription events
- **`/backend/src/services/credit-service.ts`**: 
  - Manages credit wallet
  - Atomic credit addition

#### Frontend
- **`/frontend/src/app/(app)/pricing/page.tsx`**: 
  - Displays credit packs
  - Loads Razorpay SDK dynamically
  - Initiates checkout
- **`/frontend/src/lib/actions/credits.ts`**: 
  - `createCreditOrder()` - Backend API call
  - `verifyCreditPayment()` - Backend verification

---

## 3. Credit Packs (Database Seeded)

| Pack | Credits | Price (INR) | Popular |
|------|---------|-------------|---------|
| Growth | 100 | ₹999 | ✓ |
| Scale | 200 | ₹1,899 | |
| Enterprise | Custom | Contact Sales | |

**Seed Script**: `/backend/prisma/seed-credits.ts`

---

## 4. Payment Flow (Step-by-Step)

### Step 1: User Selects Pack
```typescript
// Frontend: pricing/page.tsx
const handleSelect = (pack: CreditPack) => {
  setSelectedPack(pack);
};
```

### Step 2: Create Razorpay Order
```typescript
// Frontend → Backend API
const orderResult = await createCreditOrder({ packId: pack.id });
// Returns: { orderId, amount, currency, credits, keyId }
```

### Step 3: Open Razorpay Checkout
```typescript
const razorpay = new window.Razorpay({
  key: keyId,
  amount,
  currency,
  order_id: orderId,
  handler: async (response) => {
    // On successful payment
    await verifyCreditPayment({
      razorpay_order_id: response.razorpay_order_id,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    });
  },
});
razorpay.open();
```

### Step 4: Payment Verification
```typescript
// Backend: /api/credits/verify
const isValid = razorpay.utility.verifyPaymentSignature({
  order_id: razorpay_order_id,
  payment_id: razorpay_payment_id,
  signature: razorpay_signature,
});

if (isValid) {
  // Update payment status
  // Add credits to user wallet
  await CreditService.addCredits(userId, credits, paymentId);
}
```

### Step 5: Webhook Backup (Async)
```typescript
// Backend: /api/webhooks/razorpay
// Razorpay sends payment.captured event
await handlePaymentCaptured(payment);
// Idempotency check prevents duplicate credits
```

---

## 5. Database Models

### Payment Model
```prisma
model Payment {
  id                String   @id @default(uuid())
  userId            String
  provider          String   // "razorpay"
  razorpayOrderId   String?  @unique
  razorpayPaymentId String?  @unique
  amount            Int      // Amount in paise
  currency          String   @default("INR")
  credits           Int      // Credits purchased
  status            String   // PENDING, COMPLETED, FAILED
  invoiceId         String?
  metadata          Json?
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  user              User     @relation(fields: [userId], references: [id])
  invoice           Invoice? @relation(fields: [invoiceId], references: [id])
}
```

### CreditTransaction Model
```prisma
model CreditTransaction {
  id            String   @id @default(uuid())
  userId        String
  walletId      String
  
  amount        Int      // +credit for purchase
  balanceAfter  Int
  
  type          CreditTransactionType  // PURCHASE, GENERATION, etc.
  status        CreditTransactionStatus // SUCCESS, FAILED
  
  description   String?
  resourceId    String?
  metadata      Json?
  
  createdAt     DateTime @default(now())
  
  wallet        UserWallet @relation(fields: [walletId], references: [id])
}
```

---

## 6. Razorpay Dashboard Configuration

### Webhook Setup (REQUIRED)
1. Go to: https://dashboard.razorpay.com/app/webhooks
2. Add Webhook URL: `https://your-domain.com/api/webhooks/razorpay`
3. Select Events:
   - ✓ `payment.captured`
   - ✓ `payment.failed`
   - ✓ `subscription.activated`
   - ✓ `subscription.cancelled`
4. Copy Webhook Secret → Add to backend `.env`:
   ```
   RAZORPAY_WEBHOOK_SECRET=whsec_xxxxxxxxxx
   ```

### Test Mode vs Live Mode
- **Test Keys**: `rzp_test_xxx` (for development)
- **Live Keys**: `rzp_live_RwXqwBgTpuPevt` ✅ (already configured)

**Current Environment**: LIVE MODE (production keys)

---

## 7. Security Features

### Signature Verification
```typescript
// Frontend verification (immediate)
razorpay.utility.verifyPaymentSignature({
  order_id, payment_id, signature
});

// Webhook verification (async backup)
const expectedSignature = crypto
  .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
  .update(payload)
  .digest('hex');
```

### Idempotency Protection
```typescript
// Prevents duplicate credit additions
const existingPayment = await prisma.payment.findUnique({
  where: { razorpayPaymentId },
});
if (existingPayment?.status === 'COMPLETED') {
  return; // Already processed
}
```

---

## 8. Testing Checklist

### Pre-Production
- [x] Keys configured in backend `.env`
- [x] Keys configured in frontend `.env.local`
- [ ] Webhook secret added (after Razorpay dashboard setup)
- [x] Credit packs seeded (`npm run seed:credits`)
- [x] Database migrations applied

### Live Testing
- [ ] Test small transaction (₹1 test)
- [ ] Verify webhook receives event
- [ ] Check credit wallet updated
- [ ] Verify transaction ledger entry
- [ ] Test failed payment scenario
- [ ] Test duplicate webhook handling

---

## 9. Monitoring & Analytics

### Key Metrics
- **Revenue**: `SELECT SUM(amount) FROM Payment WHERE status = 'COMPLETED'`
- **Credits Sold**: `SELECT SUM(credits) FROM Payment WHERE status = 'COMPLETED'`
- **Conversion Rate**: `(COMPLETED / TOTAL) * 100`
- **Average Transaction Value**: `AVG(amount) WHERE status = 'COMPLETED'`

### Logs to Monitor
```bash
# Backend logs
grep "Razorpay order created" backend.log
grep "Payment verified" backend.log
grep "Credits added" backend.log
grep "Razorpay webhook" backend.log
```

---

## 10. Error Handling

### Common Errors

#### Payment Failed
```typescript
razorpay.on('payment.failed', (response) => {
  // Log error
  logger.error('Payment failed', response.error);
  // Show user-friendly message
  setError(response.error.description);
});
```

#### Webhook Signature Mismatch
```typescript
if (signature !== expectedSignature) {
  logger.error('Razorpay webhook signature mismatch');
  return res.status(400).json({ error: 'Invalid signature' });
}
```

#### Duplicate Payment
```typescript
// Idempotency check
if (existingPayment) {
  logger.warn('Duplicate payment attempt', { paymentId });
  return; // Silently skip
}
```

---

## 11. API Endpoints Summary

### Credits API (`/api/credits`)
- `GET /balance` - Get user wallet balance
- `GET /transactions` - Get credit transaction history
- `GET /packs` - Get available credit packs
- `POST /order` - Create Razorpay order
- `POST /verify` - Verify payment signature
- `GET /invoices` - Get user invoices

### Webhooks (`/api/webhooks`)
- `POST /razorpay` - Razorpay payment events (webhook)

---

## 12. TatvaOps Users Exception

Users with `@tatvaops.com` email:
- ✅ Unlimited credits (balance: 999999)
- ✅ No payment required
- ✅ Usage tracked for analytics
- ⚠️ Warnings logged if overuse detected:
  - Daily: >1000 credits
  - Weekly: >5000 credits
  - Hourly: >50 jobs
  - Daily: >200 jobs

---

## 13. Next Steps

1. **Configure Webhook Secret**:
   - Set up webhook in Razorpay dashboard
   - Add secret to backend `.env`

2. **Test Transaction**:
   - Use Razorpay test cards
   - Verify end-to-end flow

3. **Go Live**:
   - Switch to live keys (already configured)
   - Monitor first few transactions closely

4. **Optional Enhancements**:
   - Add subscription support
   - Implement refund workflow
   - Add invoice PDF generation
   - Set up payment failure retry logic

---

## 14. Support & Documentation

- **Razorpay Docs**: https://razorpay.com/docs/
- **Webhook Guide**: https://razorpay.com/docs/webhooks/
- **Test Cards**: https://razorpay.com/docs/payments/payments/test-card-details/

---

**Status**: ✅ READY FOR PRODUCTION (Pending webhook secret configuration)
**Last Updated**: 2025-12-27



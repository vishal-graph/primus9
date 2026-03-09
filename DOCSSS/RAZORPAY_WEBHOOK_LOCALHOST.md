# Razorpay Webhook Setup for Localhost

## 🔧 Testing Webhooks Locally with ngrok

Since Razorpay webhooks require a public HTTPS URL, you need to use **ngrok** to tunnel your localhost.

### Step 1: Install ngrok

**Windows:**
```bash
choco install ngrok
```

**Or download from:** https://ngrok.com/download

### Step 2: Start Your Backend Server
```bash
cd tatvaops-vision/backend
npm run dev
```
Your backend should be running on `http://localhost:4000`

### Step 3: Start ngrok Tunnel
Open a new terminal and run:
```bash
ngrok http 4000
```

You'll see output like:
```
Forwarding    https://abc123.ngrok-free.app -> http://localhost:4000
```

**Copy the `https://` URL** (e.g., `https://abc123.ngrok-free.app`)

### Step 4: Configure Razorpay Webhook

1. Go to [Razorpay Dashboard → Webhooks](https://dashboard.razorpay.com/app/webhooks)

2. Click **"+ New Webhook"**

3. Fill in:
   - **Webhook URL**: `https://abc123.ngrok-free.app/api/webhooks/razorpay`
   - **Secret**: (Generate a random string, e.g., `whsec_test_1234567890`)
   - **Events**:
     - ✅ `payment.captured`
     - ✅ `payment.failed`
     - ✅ `payment.authorized`
     - ✅ `subscription.activated`
     - ✅ `subscription.cancelled`

4. Click **"Create Webhook"**

5. Copy the **Webhook Secret**

### Step 5: Add Webhook Secret to Backend .env

```bash
cd tatvaops-vision/backend
```

Add to `.env`:
```env
RAZORPAY_WEBHOOK_SECRET=whsec_test_1234567890
```

Restart your backend server.

---

## 🧪 Testing Payment Flow Locally

### Frontend (Port 3000)
```bash
cd tatvaops-vision/frontend
npm run dev
```

### Backend (Port 4000 → ngrok)
```bash
cd tatvaops-vision/backend
npm run dev
```

### ngrok Tunnel
```bash
ngrok http 4000
```

### Test Transaction
1. Go to `http://localhost:3000/pricing`
2. Select a credit pack
3. Click "Buy credits"
4. Use Razorpay test card:
   - **Card Number**: `4111 1111 1111 1111`
   - **Expiry**: Any future date (e.g., `12/25`)
   - **CVV**: Any 3 digits (e.g., `123`)
   - **Name**: Any name
5. Complete payment
6. Check ngrok console for webhook POST request
7. Verify credits added to your wallet

---

## 📊 Monitoring Webhook Calls

### ngrok Web Interface
Visit: `http://localhost:4040` (when ngrok is running)
- See all HTTP requests/responses
- Replay webhooks for debugging

### Backend Logs
```bash
# Watch backend logs
cd tatvaops-vision/backend
npm run dev
```
Look for:
```
Razorpay webhook received
Payment verified and credits added
```

---

## 🚨 Common Issues

### 1. Webhook not receiving events
- ✅ Check ngrok is running
- ✅ Verify webhook URL in Razorpay dashboard matches ngrok URL
- ✅ Restart backend after adding webhook secret

### 2. Signature mismatch error
- ✅ Ensure `RAZORPAY_WEBHOOK_SECRET` matches Razorpay dashboard
- ✅ Restart backend server after changing .env

### 3. ngrok URL changes on restart
- Each time you restart ngrok, the URL changes
- Update Razorpay webhook URL accordingly
- **OR** use ngrok paid plan for static URLs

---

## 📝 Current Configuration

### Pricing (Testing Discount)
- **Growth Pack**: 100 credits for **₹9** (was ₹999) - **99% OFF**
- **Scale Pack**: 200 credits for **₹18** (was ₹1,899) - **99% OFF**

### Environment Variables

**Backend `.env`:**
```env
RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
RAZORPAY_KEY_SECRET=IYx0EeAcdzV03DAM1vJ2wR8p
RAZORPAY_WEBHOOK_SECRET=<your_webhook_secret_from_dashboard>
```

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_RwXqwBgTpuPevt
```

---

## ⚠️ Important Notes

1. **Live Keys in Test Mode**: You're using live Razorpay keys (`rzp_live_xxx`). For testing, consider using test keys (`rzp_test_xxx`) to avoid real transactions.

2. **ngrok Free Tier**: URL changes on restart. For persistent URL, upgrade to ngrok paid plan.

3. **Webhook Secret**: Keep it secret! Never commit to git.

4. **Production**: Replace ngrok URL with actual production domain before going live.

---

## ✅ Quick Checklist

- [ ] ngrok installed
- [ ] Backend running on port 4000
- [ ] ngrok tunnel running (`ngrok http 4000`)
- [ ] Razorpay webhook configured with ngrok URL
- [ ] Webhook secret added to backend `.env`
- [ ] Backend server restarted
- [ ] Test payment successful
- [ ] Webhook event received (check ngrok console)
- [ ] Credits added to wallet

---

**Status**: Ready for local testing with ngrok! 🎉


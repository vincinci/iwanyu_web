# PawaPay Callback URLs - Vercel Deployment

## 🚀 Your Production URLs

**Production Domain:** `https://www.iwanyu.store`  
**Vercel Domain:** `https://iwanyu-marketplace.vercel.app`

## 📍 PawaPay Webhook Configuration

### Main Webhook URL (Primary)
Configure this URL in your PawaPay Dashboard for **all payment callbacks**:

```
https://www.iwanyu.store/api/pawapay-webhook
```

This single endpoint handles:
- ✅ Deposit confirmations (wallet deposits)
- ✅ Payment confirmations (order payments)
- ✅ Payout confirmations (withdrawals)
- ✅ All failure/rejection callbacks

---

## 🔗 Complete API Endpoints

### 1. Deposit Endpoint
**URL:** `https://www.iwanyu.store/api/pawapay-deposit`  
**Method:** `POST`  
**Purpose:** Initiate wallet deposit via mobile money

### 2. Withdrawal Endpoint
**URL:** `https://www.iwanyu.store/api/pawapay-withdrawal`  
**Method:** `POST`  
**Purpose:** Withdraw funds to mobile money account

### 3. Payment Endpoint
**URL:** `https://www.iwanyu.store/api/pawapay-payment`  
**Method:** `POST`  
**Purpose:** Pay for an order via mobile money

### 4. Status Check Endpoint
**URL:** `https://www.iwanyu.store/api/pawapay-status?transactionId={id}`  
**Method:** `GET`  
**Purpose:** Check transaction status

### 5. Webhook Callback (Configure in PawaPay Dashboard)
**URL:** `https://www.iwanyu.store/api/pawapay-webhook`  
**Method:** `POST`  
**Purpose:** Receive real-time payment updates from PawaPay

---

## 🔧 PawaPay Dashboard Configuration

### Step 1: Login to PawaPay Dashboard
1. Go to: https://dashboard.pawapay.io (or your PawaPay portal)
2. Login with your credentials

### Step 2: Configure Webhook URL
1. Navigate to **Settings** → **Webhooks** (or **API Configuration**)
2. Set the webhook URL to:
   ```
   https://www.iwanyu.store/api/pawapay-webhook
   ```
3. Enable webhook for these events:
   - ✅ Deposit Completed
   - ✅ Deposit Failed
   - ✅ Payout Completed
   - ✅ Payout Failed

### Step 3: Save Configuration
Click **Save** or **Update Webhook Settings**

---

## 🧪 Testing Your Deployment

### Test Webhook Locally (Development)
```bash
# Terminal 1: Start Vercel dev server
vercel dev

# Terminal 2: Use ngrok to expose local server
ngrok http 3000

# Use ngrok URL for testing:
# https://abc123.ngrok.io/api/pawapay-webhook
```

### Test Production Webhook
```bash
# Test with curl (requires valid auth token)
curl -X POST https://www.iwanyu.store/api/pawapay-deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "amount": 1000,
    "phoneNumber": "+250788123456",
    "correspondent": "MTN_MOMO_RWA"
  }'
```

### Verify Webhook Reception
```bash
# Check Vercel logs
vercel logs --follow

# Or visit Vercel Dashboard:
# https://vercel.com/your-team/iwanyu-marketplace/logs
```

---

## 📦 Deployment Commands

### Deploy to Production
```bash
# Deploy with automatic build
vercel --prod

# Deploy with yes to all prompts
vercel --prod --yes

# Deploy and follow logs
vercel --prod && vercel logs --follow
```

### Check Current Deployment
```bash
# List recent deployments
vercel ls

# Get current production URL
vercel inspect --prod
```

### Set Environment Variables (if not already set)
```bash
# Set Supabase credentials
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production

# Set PawaPay API key
vercel env add PAWAPAY_API_KEY production

# Redeploy after setting env vars
vercel --prod
```

---

## ✅ Verification Checklist

After deployment, verify:

- [x] Production URL is accessible: https://www.iwanyu.store
- [ ] API endpoints respond (test with `/api/marketplace?type=products`)
- [ ] PawaPay webhook URL configured in dashboard: `https://www.iwanyu.store/api/pawapay-webhook`
- [ ] Environment variables set in Vercel dashboard
- [ ] Test deposit transaction works
- [ ] Webhook callback updates database
- [ ] Test withdrawal transaction works

---

## 🔐 Environment Variables Required

Make sure these are set in Vercel Dashboard:

| Variable | Description | Where to Find |
|----------|-------------|---------------|
| `SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (secret) | Supabase Dashboard → Settings → API |
| `SUPABASE_ANON_KEY` | Anonymous key (public) | Supabase Dashboard → Settings → API |
| `PAWAPAY_API_KEY` | PawaPay API key | PawaPay Dashboard → API Keys |
| `VITE_SUPABASE_URL` | (Optional) Client-side URL | Same as SUPABASE_URL |
| `VITE_SUPABASE_ANON_KEY` | (Optional) Client-side key | Same as SUPABASE_ANON_KEY |

---

## 🐛 Troubleshooting

### Webhook Not Receiving Callbacks

1. **Check PawaPay Dashboard:**
   - Verify webhook URL is correctly configured
   - Check webhook event logs in PawaPay dashboard

2. **Check Vercel Logs:**
   ```bash
   vercel logs --follow
   ```

3. **Test Webhook Manually:**
   ```bash
   curl -X POST https://www.iwanyu.store/api/pawapay-webhook \
     -H "Content-Type: application/json" \
     -d '{
       "depositId": "test_123",
       "status": "COMPLETED",
       "amount": "1000",
       "currency": "RWF"
     }'
   ```

### API Returns 500 Error

1. Check environment variables are set:
   ```bash
   vercel env ls
   ```

2. Check Vercel function logs:
   - Visit: https://vercel.com/your-team/iwanyu-marketplace/logs
   - Look for error messages

3. Redeploy with fresh environment:
   ```bash
   vercel --prod --force
   ```

### Authentication Errors

1. Verify Supabase keys are correct
2. Check token expiration
3. Verify user has correct permissions in database

---

## 📞 Support Resources

- **PawaPay Docs:** https://docs.pawapay.io
- **PawaPay Support:** support@pawapay.io
- **Vercel Docs:** https://vercel.com/docs
- **Vercel Support:** https://vercel.com/support

---

## 🎉 Quick Reference

**Main Webhook URL for PawaPay Dashboard:**
```
https://www.iwanyu.store/api/pawapay-webhook
```

**Production API Base:**
```
https://www.iwanyu.store/api/
```

**Backup Vercel URL:**
```
https://iwanyu-marketplace.vercel.app/api/
```

**Local Development:**
```
http://localhost:3000/api/
```

Copy the webhook URL above and paste it into your PawaPay Dashboard! 🚀

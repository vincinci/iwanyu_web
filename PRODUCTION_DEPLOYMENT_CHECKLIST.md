# 🚀 Production Deployment Checklist

**Date**: April 28, 2026  
**Status**: ✅ API Credentials Configured  
**Next**: Deploy Edge Functions → Configure PawaPay Webhooks → Test

---

## ✅ Phase 1: API Credentials (COMPLETE)

- [x] PAWAPAY_API_KEY set in Supabase secrets
- [x] PAWAPAY_ENDPOINT set to `https://api.pawapay.cloud`
- [x] Credentials verified in `supabase secrets list`

---

## 📋 Phase 2: Deploy Edge Functions (NEXT)

### Step 1: Deploy Functions to Production

```bash
cd /Users/davy/Live_bid/iwanyu_web

# Deploy deposit callback (updated from Phase 1)
supabase functions deploy wallet-deposit-callback

# Deploy new deposit initialization function
supabase functions deploy pawapay-deposit-init

# Deploy seller withdrawal function (updated with PawaPay)
supabase functions deploy seller-withdrawal-callback

# Deploy new seller payout callback (NEW)
supabase functions deploy seller-payout-callback

# Deploy refund function (updated comment only, no logic changes)
supabase functions deploy wallet-refund-callback
```

### Step 2: Verify Deployments

```bash
# Check all functions are ACTIVE
supabase functions list | grep -E "wallet|seller|pawapay"

# Expected output:
# ✅ wallet-deposit-callback         ACTIVE
# ✅ pawapay-deposit-init            ACTIVE
# ✅ seller-withdrawal-callback      ACTIVE
# ✅ seller-payout-callback          ACTIVE
# ✅ wallet-refund-callback          ACTIVE
```

### Step 3: Verify Function Secrets

```bash
# Check that functions can access PAWAPAY_API_KEY
# Do a test call to verify secrets are available
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/pawapay-deposit-init \
  -H "Authorization: Bearer test-token" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 10000,
    "currency": "RWF",
    "country": "RW",
    "correlationId": "test-001"
  }'

# Should return HTTP 400 (invalid token, but proves function is live)
# NOT 500 (which would indicate missing secrets)
```

---

## 📊 Phase 3: PawaPay Dashboard Configuration

### Step 1: Log In to PawaPay Dashboard

1. Go to: https://dashboard.pawapay.cloud
2. Log in with your credentials
3. Navigate to: **System Configuration** → **Callback URLs**

### Step 2: Configure Deposit Callback

1. **Event Type**: Select "Deposit" or "Payment Completion"
2. **URL**: Paste exactly:
   ```
   https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback
   ```
3. **Method**: POST
4. **Headers**: Leave default
5. **Click**: "Introduce Callback URL" or "Test Webhook"
6. **Verify**: Should return HTTP 200 OK

### Step 3: Configure Payout Callback

1. **Event Type**: Select "Payout" or "Payout Completion"
2. **URL**: Paste exactly:
   ```
   https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-payout-callback
   ```
3. **Method**: POST
4. **Save** configuration
5. **Test** webhook delivery

### Step 4: Whitelist IPs (if enabled)

**Production IP Ranges** (from PawaPay):
```
18.192.208.15/32
18.195.113.136/32
3.72.212.107/32
54.73.125.42/32
54.155.38.214/32
54.73.130.113/32
```

---

## 🧪 Phase 4: Integration Testing

### Quick Smoke Test (5 minutes)

#### Test 1: Verify Deposit Endpoint
```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/pawapay-deposit-init \
  -H "Authorization: Bearer eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjI3MTMiLCJtYXYiOiIxIiwiZXhwIjoyMDkyOTkzNDc1LCJpYXQiOjE3NzczNzQyNzUsInBtIjoiREFGLFBBRiIsImp0aSI6Ijc3MzhjZTk2LTgwY2UtNDM1Ni1hM2ZjLTU2YTU1ZmI2OWNiMyJ9.SAl3CiZgprdILRfrRPJm97p15EoWoqwgGIJoNwlV0Si5y7LbPr1-lxNFlnowYQK_TnnHN2b_vuEdY3HaUjI0Uw" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 50000,
    "currency": "RWF",
    "country": "RW",
    "correlationId": "test-deposit-001",
    "accountIdentifier": "+250788123456"
  }'
```

**Expected Response** (HTTP 200):
```json
{
  "success": true,
  "depositId": "uuid-from-pawapay",
  "status": "INITIATED",
  "requestedAmount": 50000,
  "currency": "RWF",
  "authenticationUrl": "https://pawapay.cloud/authenticate/...",
  "country": "RW"
}
```

#### Test 2: Verify Webhook Endpoint
```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -d '{
    "depositId": "test-deposit-001",
    "status": "COMPLETED",
    "requestedAmount": 50000,
    "currency": "RWF",
    "country": "RW"
  }'
```

**Expected Response** (HTTP 200):
```json
{
  "success": true,
  "depositId": "test-deposit-001"
}
```

#### Test 3: Verify Payout Endpoint
```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "test-payout-001",
    "status": "COMPLETED",
    "amount": 100000,
    "currency": "RWF",
    "country": "RW"
  }'
```

**Expected Response** (HTTP 200):
```json
{
  "success": true,
  "payoutId": "test-payout-001"
}
```

### Comprehensive Testing

Use scenarios from [PAWAPAY_E2E_TESTING.md](./PAWAPAY_E2E_TESTING.md):
- ✅ Test 1: User Wallet Deposit
- ✅ Test 2: Wallet Payment (instant)
- ✅ Test 3: Wallet Refund
- ✅ Test 4: Seller Withdrawal
- ✅ Test 5: Failed Payout & Refund
- ✅ Test 6: Duplicate Callback Handling

---

## 🔍 Phase 5: Verification Checklist

### Database Verification
```sql
-- Check wallet transactions
SELECT COUNT(*) FROM wallet_transactions;

-- Check seller withdrawals
SELECT COUNT(*) FROM seller_withdrawals;

-- Check migration status
SELECT name, executed_at FROM supabase_migrations_remote 
WHERE name LIKE '%wallet%' OR name LIKE '%seller%'
ORDER BY executed_at;
```

### Function Health Check
```bash
# Check function logs for errors
supabase functions logs wallet-deposit-callback --tail
supabase functions logs seller-payout-callback --tail
supabase functions logs pawapay-deposit-init --tail

# All should show ACTIVE status
supabase functions list
```

### API Connectivity Test
```bash
# Test PawaPay API is reachable with current credentials
curl -H "Authorization: Bearer eyJraWQiOiIxIiwiYWxnIjoiRVMyNTYifQ.eyJ0dCI6IkFBVCIsInN1YiI6IjI3MTMiLCJtYXYiOiIxIiwiZXhwIjoyMDkyOTkzNDc1LCJpYXQiOjE3NzczNzQyNzUsInBtIjoiREFGLFBBRiIsImp0aSI6Ijc3MzhjZTk2LTgwY2UtNDM1Ni1hM2ZjLTU2YTU1ZmI2OWNiMyJ9.SAl3CiZgprdILRfrRPJm97p15EoWoqwgGIJoNwlV0Si5y7LbPr1-lxNFlnowYQK_TnnHN2b_vuEdY3HaUjI0Uw" \
  https://api.pawapay.cloud/deposits

# Should return some response (not connection error)
```

---

## 🎯 Phase 6: Go-Live Checklist

Before going live to production:

### Deployment
- [ ] All 5 edge functions deployed
- [ ] Functions ACTIVE status confirmed
- [ ] Database migrations applied
- [ ] PawaPay API credentials set

### Configuration
- [ ] PawaPay Dashboard webhooks configured
- [ ] IP whitelist (if needed) configured
- [ ] Callback URLs tested in PawaPay
- [ ] Environment variables verified

### Testing
- [ ] All 6 test scenarios pass
- [ ] No errors in function logs
- [ ] Database transactions created correctly
- [ ] Balance calculations accurate

### Monitoring
- [ ] Error monitoring configured (Sentry/LogRocket)
- [ ] Database backups enabled
- [ ] Webhook delivery monitored
- [ ] Performance metrics baseline established

### Documentation
- [ ] Support team trained
- [ ] User documentation published
- [ ] Troubleshooting guide available
- [ ] Rollback plan documented

---

## 📞 Rollback Plan

If critical issues occur:

```bash
# Step 1: Disable PawaPay temporarily
supabase secrets set PAWAPAY_API_KEY=""

# Step 2: Investigate
# Check function logs
supabase functions logs wallet-deposit-callback --tail
supabase functions logs pawapay-deposit-init --tail

# Step 3: Fix and redeploy
supabase functions deploy wallet-deposit-callback
supabase functions deploy pawapay-deposit-init

# Step 4: Restore credentials
supabase secrets set PAWAPAY_API_KEY="new-key"

# Step 5: Test again
# Run Test 1 from PAWAPAY_E2E_TESTING.md
```

---

## 📊 Success Metrics

### During Testing
- ✅ 100% test scenario pass rate
- ✅ 0 HTTP errors from endpoints
- ✅ 0 database constraint violations
- ✅ Wallet balances reconcile

### Week 1 Post-Launch
- ✅ > 99% webhook success rate
- ✅ < 1% transaction failure rate
- ✅ < 2s average response time
- ✅ 0 security incidents

### Ongoing
- ✅ > 99.5% uptime
- ✅ < 100ms p95 latency
- ✅ User satisfaction > 95%
- ✅ Monthly revenue tracking

---

## 🚀 Deployment Commands (Ready to Run)

Copy and paste to deploy:

```bash
#!/bin/bash
cd /Users/davy/Live_bid/iwanyu_web

echo "🚀 Deploying PawaPay Edge Functions..."
supabase functions deploy wallet-deposit-callback
supabase functions deploy pawapay-deposit-init
supabase functions deploy seller-withdrawal-callback
supabase functions deploy seller-payout-callback
supabase functions deploy wallet-refund-callback

echo "✅ Deployment complete!"
echo "🔍 Verifying functions..."
supabase functions list | grep -E "wallet|seller|pawapay"

echo "📚 Next steps:"
echo "1. Configure PawaPay Dashboard webhooks (see Phase 3)"
echo "2. Run test scenarios (see PAWAPAY_E2E_TESTING.md)"
echo "3. Monitor logs (supabase functions logs wallet-deposit-callback --tail)"
```

---

## 📁 Reference Documentation

| Document | Purpose |
|----------|---------|
| [CALLBACK_URLS.md](./CALLBACK_URLS.md) | API endpoints and request/response formats |
| [PAWAPAY_WEBHOOK_SETUP.md](./PAWAPAY_WEBHOOK_SETUP.md) | PawaPay Dashboard configuration |
| [PAWAPAY_PAYOUTS_IMPLEMENTATION.md](./PAWAPAY_PAYOUTS_IMPLEMENTATION.md) | Seller withdrawal workflow |
| [PAWAPAY_E2E_TESTING.md](./PAWAPAY_E2E_TESTING.md) | Complete test scenarios |
| [PAWAPAY_DEPLOYMENT.md](./PAWAPAY_DEPLOYMENT.md) | General deployment guide |

---

## 🎉 Status

| Phase | Status | Date |
|-------|--------|------|
| 1. API Credentials | ✅ COMPLETE | 2026-04-28 |
| 2. Deploy Functions | ⏳ PENDING | — |
| 3. Configure Webhooks | ⏳ PENDING | — |
| 4. Run Tests | ⏳ PENDING | — |
| 5. Monitor & Verify | ⏳ PENDING | — |

**Current**: Ready to deploy edge functions to production  
**Time to Launch**: ~30 minutes (deployment + testing)

---

**Last Updated**: 2026-04-28  
**Version**: 1.0  
**Prepared By**: GitHub Copilot

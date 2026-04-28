# Phase 5: End-to-End Testing Guide

## 🎯 Overview

This guide covers testing the complete PawaPay integration for deposits, refunds, and seller withdrawals.

---

## 📋 Pre-Testing Checklist

Before starting tests, verify:

- [ ] All migrations applied successfully
- [ ] All edge functions deployed (3 deposit/refund, 2 payout)
- [ ] Supabase service role key configured
- [ ] PAWAPAY_API_KEY set in function secrets
- [ ] PawaPay webhooks configured and tested
- [ ] Web build succeeds (no TypeScript errors)
- [ ] Database accessible and populated
- [ ] Seller has payout_balance_rwf > 0

---

## 🧪 Test 1: User Wallet Deposit (Deposit Flow)

### Objective
Verify that a user can initiate a mobile money deposit and receive wallet credit.

### Prerequisites
- User account created and authenticated
- Empty or low wallet balance
- PawaPay account with sandbox access

### Steps

**Step 1: Open Checkout Page**
```
1. Navigate to http://localhost:3000/checkout (or production URL)
2. Add items to cart if needed
3. Select "Mobile Money" payment method
4. Fill in email, phone, address
```

**Step 2: Initiate Deposit**
```
5. Click "Pay" button
6. System calls pawapay-deposit-init edge function
7. PawaPay returns depositId and authenticationUrl
8. Browser redirects to PawaPay authentication
```

**Step 3: Verify Database Entry**
```bash
# In Supabase SQL editor
SELECT id, user_id, type, amount_rwf, status, external_transaction_id 
FROM wallet_transactions 
WHERE type = 'deposit' 
ORDER BY created_at DESC LIMIT 1;

# Should show:
# - type: 'deposit'
# - status: 'pending'
# - external_transaction_id: depositId from PawaPay
# - payment_method: 'pawapay_momo'
```

**Step 4: Simulate PawaPay Callback**
```bash
# Get the depositId from above query result
DEPOSIT_ID="uuid-from-query"

curl -X POST http://localhost:54321/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -d '{
    "depositId": "'$DEPOSIT_ID'",
    "status": "COMPLETED",
    "requestedAmount": "50000",
    "currency": "RWF",
    "country": "RW"
  }'
```

**Step 5: Verify Wallet Credit**
```bash
# Query wallet balance
SELECT wallet_balance_rwf FROM profiles 
WHERE id = 'user-uuid' LIMIT 1;

# Should show balance increased by 50000

# Verify transaction status updated
SELECT status FROM wallet_transactions 
WHERE external_transaction_id = '$DEPOSIT_ID';

# Should show status: 'completed'
```

### Expected Outcome
✅ User wallet balance increased
✅ Transaction record created with COMPLETED status
✅ Order moves to "Paid" status

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Deposit callback returns 404 | Verify external_transaction_id matches depositId |
| Wallet not credited | Check wallet_transactions table has user_id |
| Transaction status unchanged | Verify callback HTTP 200 response received |

---

## 🧪 Test 2: Wallet Payment (Instant Payment)

### Objective
Verify that a user can pay directly from their wallet without mobile money.

### Prerequisites
- User wallet has sufficient balance (e.g., 100,000 RWF)
- Test order total < wallet balance

### Steps

**Step 1: Add to Cart and Checkout**
```
1. Add items to cart (total: 50,000 RWF)
2. Navigate to checkout page
3. Enter shipping details
```

**Step 2: Select Wallet Payment**
```
4. Click "Wallet" payment button
5. Verify balance shown (should be >= total)
6. Click "Pay" button
```

**Step 3: Verify Immediate Processing**
```bash
# Check order status
SELECT status FROM orders WHERE id = 'order-uuid';
# Should show: 'Paid' or 'Processing'

# Check wallet transactions
SELECT * FROM wallet_transactions 
WHERE type = 'purchase' 
ORDER BY created_at DESC LIMIT 1;

# Should show:
# - type: 'purchase'
# - status: 'completed'
# - amount_rwf: 50000 (debited)
```

**Step 4: Verify Wallet Deduction**
```bash
# Calculate expected balance
# previous_balance - amount_rwf = new_balance_rwf

SELECT wallet_balance_rwf FROM profiles WHERE id = 'user-uuid';
# Verify balance reduced by order total
```

### Expected Outcome
✅ Order created and marked as "Paid"
✅ Wallet deducted immediately
✅ No payment provider involvement
✅ User navigated to order confirmation

---

## 🧪 Test 3: Wallet Refund (Order Cancellation)

### Objective
Verify that refunds are correctly credited back to user's wallet.

### Prerequisites
- User has a completed order
- Wallet refund function deployed

### Steps

**Step 1: Admin Initiates Refund**
```bash
# Admin calls refund endpoint with JWT token
ADMIN_JWT="admin-jwt-token"
ORDER_UUID="completed-order-id"
USER_UUID="customer-user-id"

curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-refund-callback \
  -H "Authorization: Bearer $ADMIN_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'$USER_UUID'",
    "amountRwf": 50000,
    "orderId": "'$ORDER_UUID'",
    "reason": "Order cancelled by admin",
    "reference": "'$ORDER_UUID'"
  }'
```

**Step 2: Verify Refund Processing**
```bash
# Expected response:
# {
#   "success": true,
#   "refundedAmount": 50000,
#   "newBalance": 150000
# }
```

**Step 3: Check Database**
```bash
# Verify transaction recorded
SELECT * FROM wallet_transactions 
WHERE type = 'refund' AND user_id = 'user-uuid'
ORDER BY created_at DESC LIMIT 1;

# Should show:
# - type: 'refund'
# - amount_rwf: 50000
# - status: 'completed'
# - previous_balance_rwf + amount_rwf = new_balance_rwf

# Verify order status updated
SELECT status FROM orders WHERE id = 'order-uuid';
# Should show: 'Refunded'

# Verify wallet credited
SELECT wallet_balance_rwf FROM profiles WHERE id = 'user-uuid';
# Should show balance increased by 50000
```

### Expected Outcome
✅ Transaction recorded with type 'refund'
✅ Wallet balance increased
✅ Order status changed to 'Refunded'
✅ HTTP 200 response with refund amount

---

## 🧪 Test 4: Seller Withdrawal (Payout to Mobile Money)

### Objective
Verify that sellers can withdraw their earnings to mobile money.

### Prerequisites
- Seller account with vendor
- vendor.payout_balance_rwf > 0 (e.g., 500,000 RWF)
- PawaPay payout endpoint configured

### Steps

**Step 1: Seller Initiates Withdrawal**
```bash
# Get seller JWT token
SELLER_JWT="seller-jwt-token"
VENDOR_ID="vendor-uuid"

curl -X POST http://localhost:54321/functions/v1/seller-withdrawal-callback \
  -H "Authorization: Bearer $SELLER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "'$VENDOR_ID'",
    "amountRwf": 100000,
    "mobileNetwork": "MTN",
    "phoneNumber": "+250788123456",
    "reason": "Weekly sales withdrawal"
  }'
```

**Step 2: Verify Withdrawal Created**
```bash
# Expected response:
# {
#   "success": true,
#   "withdrawalId": "withdrawal-uuid",
#   "amountRwf": 100000,
#   "newBalance": 400000,
#   "status": "pending"
# }

# Check database
SELECT status FROM seller_withdrawals 
WHERE vendor_id = 'vendor-uuid' 
ORDER BY created_at DESC LIMIT 1;

# Should show: status = 'pending'
```

**Step 3: Verify Balance Deduction**
```bash
SELECT payout_balance_rwf FROM vendors WHERE id = 'vendor-uuid';
# Should show: 400000 (500000 - 100000)

# Check transaction recorded
SELECT * FROM seller_withdrawal_transactions 
WHERE vendor_id = 'vendor-uuid' 
ORDER BY created_at DESC LIMIT 1;

# Should show:
# - amount_rwf: 100000
# - previous_balance_rwf: 500000
# - new_balance_rwf: 400000
```

**Step 4: Simulate PawaPay Payout Callback (Success)**
```bash
WITHDRAWAL_ID="withdrawal-uuid-from-above"

curl -X POST http://localhost:54321/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "'$WITHDRAWAL_ID'",
    "status": "COMPLETED",
    "amount": "100000",
    "currency": "RWF",
    "country": "RW"
  }'
```

**Step 5: Verify Payout Completed**
```bash
# Check withdrawal status
SELECT status, completed_at FROM seller_withdrawals 
WHERE id = 'withdrawal-uuid';

# Should show:
# - status: 'completed'
# - completed_at: recent timestamp

# Verify transaction updated
SELECT status FROM seller_withdrawal_transactions 
WHERE withdrawal_id = 'withdrawal-uuid';

# Should show: 'completed'
```

### Expected Outcome
✅ Withdrawal created with PENDING status
✅ Vendor balance immediately deducted
✅ Transaction recorded
✅ PawaPay receives payout request
✅ Webhook updates status to COMPLETED
✅ Seller receives funds in mobile money

---

## 🧪 Test 5: Failed Payout and Refund

### Objective
Verify that failed payouts refund the amount back to seller.

### Steps

**Step 1: Initiate Withdrawal** (same as Test 4, Steps 1-3)

**Step 2: Simulate Failed Payout Callback**
```bash
WITHDRAWAL_ID="withdrawal-uuid"

curl -X POST http://localhost:54321/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "'$WITHDRAWAL_ID'",
    "status": "FAILED",
    "amount": "100000",
    "currency": "RWF",
    "country": "RW"
  }'
```

**Step 3: Verify Refund**
```bash
# Check withdrawal status
SELECT status FROM seller_withdrawals WHERE id = 'withdrawal-uuid';
# Should show: 'failed'

# Check balance refunded
SELECT payout_balance_rwf FROM vendors WHERE id = 'vendor-uuid';
# Should show: 500000 (amount refunded back)

# Verify transaction status
SELECT status, new_balance_rwf FROM seller_withdrawal_transactions 
WHERE withdrawal_id = 'withdrawal-uuid';

# Should show:
# - status: 'failed'
# - new_balance_rwf: 500000 (refunded)
```

### Expected Outcome
✅ Withdrawal status changed to FAILED
✅ Amount refunded to vendor balance
✅ Transaction marked as failed
✅ Seller can retry withdrawal

---

## 🧪 Test 6: Duplicate Callback Handling (Idempotency)

### Objective
Verify that duplicate callbacks don't double-charge or duplicate credits.

### Steps

**Step 1: Send Deposit Callback**
```bash
DEPOSIT_ID="test-deposit-001"

curl -X POST http://localhost:54321/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -d '{
    "depositId": "'$DEPOSIT_ID'",
    "status": "COMPLETED",
    "requestedAmount": "50000",
    "currency": "RWF",
    "country": "RW"
  }'

# Response: HTTP 200 with success: true
```

**Step 2: Send Same Callback Again**
```bash
# Send exact same payload

curl -X POST http://localhost:54321/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -d '{
    "depositId": "'$DEPOSIT_ID'",
    "status": "COMPLETED",
    "requestedAmount": "50000",
    "currency": "RWF",
    "country": "RW"
  }'

# Response: HTTP 200 with success: true (idempotent)
```

**Step 3: Verify No Double Credit**
```bash
# Count transactions with this depositId
SELECT COUNT(*) as count FROM wallet_transactions 
WHERE external_transaction_id = 'test-deposit-001';

# Should show: count = 1 (not 2)

# Verify balance increased only once
SELECT wallet_balance_rwf FROM profiles WHERE id = 'user-uuid';
# Should show balance increased by 50000 (not 100000)
```

### Expected Outcome
✅ Both callbacks return HTTP 200 OK
✅ Only one transaction created in database
✅ Wallet credited exactly once
✅ True idempotency achieved

---

## 📊 Test Coverage Matrix

| Feature | Test Case | Status |
|---------|-----------|--------|
| Deposit | Callback received & wallet credited | Test 1 |
| Deposit | Duplicate callbacks handled | Test 6 |
| Wallet | Instant debit on purchase | Test 2 |
| Wallet | Refund credited to wallet | Test 3 |
| Payout | Initiated successfully | Test 4 |
| Payout | Completed via callback | Test 4 |
| Payout | Failed and refunded | Test 5 |
| Payout | Duplicate callbacks handled | Test 6 |

---

## 🔍 Manual Verification Queries

### Check All User Transactions
```sql
SELECT 
  id,
  type,
  amount_rwf,
  status,
  payment_method,
  created_at
FROM wallet_transactions
WHERE user_id = 'user-uuid'
ORDER BY created_at DESC;
```

### Check All Seller Withdrawals
```sql
SELECT 
  w.id,
  w.vendor_id,
  w.amount_rwf,
  w.status,
  w.phone_number,
  w.mobile_network,
  w.created_at,
  w.completed_at
FROM seller_withdrawals w
WHERE w.vendor_id = 'vendor-uuid'
ORDER BY w.created_at DESC;
```

### Verify Wallet Accuracy
```sql
-- Calculate balance from transactions
SELECT 
  user_id,
  SUM(CASE WHEN type = 'deposit' THEN amount_rwf ELSE 0 END) as total_deposits,
  SUM(CASE WHEN type = 'refund' THEN amount_rwf ELSE 0 END) as total_refunds,
  SUM(CASE WHEN type = 'purchase' THEN -amount_rwf ELSE 0 END) as total_purchases,
  SUM(CASE WHEN type = 'withdrawal' THEN -amount_rwf ELSE 0 END) as total_withdrawals,
  SUM(amount_rwf) as net_balance
FROM wallet_transactions
WHERE user_id = 'user-uuid' AND status = 'completed'
GROUP BY user_id;

-- Compare with actual balance
SELECT wallet_balance_rwf FROM profiles WHERE id = 'user-uuid';
```

### Check Function Logs
```bash
# Monitor wallet-deposit-callback
supabase functions logs wallet-deposit-callback --tail

# Monitor seller-payout-callback
supabase functions logs seller-payout-callback --tail
```

---

## ✅ Go-Live Checklist

Before deploying to production:

- [ ] All 5 test scenarios pass
- [ ] No database errors in logs
- [ ] Wallet balances audit matches expected
- [ ] PawaPay webhooks configured and tested
- [ ] Edge functions deployed to production
- [ ] Migrations applied to production database
- [ ] Environment variables set correctly
- [ ] HTTPS SSL certificates valid
- [ ] Rate limiting configured
- [ ] Error monitoring set up (Sentry/LogRocket)
- [ ] Database backups enabled
- [ ] Load testing performed (concurrent users)
- [ ] Security audit completed
- [ ] User documentation published
- [ ] Support team trained on troubleshooting
- [ ] Rollback plan documented

---

## 📞 Support & Escalation

### Common Issues & Fixes

| Issue | Root Cause | Fix |
|-------|-----------|-----|
| Deposit stuck in pending | Webhook not fired | Check PawaPay dashboard webhook logs |
| Wallet not credited | Transaction lookup failed | Verify external_transaction_id |
| Payout failed silently | API key expired | Rotate PAWAPAY_API_KEY |
| Duplicate balances | Transaction counting error | Audit wallet_transactions |
| Balance mismatch | Race condition | Use database transactions |

### Escalation Contacts

- **PawaPay Support**: support@pawapay.cloud
- **Supabase Support**: support@supabase.com
- **Internal Dev Team**: [your-team-slack]

---

## 📈 Post-Launch Monitoring

### Daily Checks (0:00 UTC)
- [ ] Webhook success rate > 99%
- [ ] Average response time < 2s
- [ ] Database transaction count normal
- [ ] No critical errors in logs

### Weekly Reviews
- [ ] Failed transaction analysis
- [ ] User complaints/feedback
- [ ] Performance metrics
- [ ] Security audit logs

### Monthly Reports
- [ ] Total revenue processed
- [ ] Withdrawal success rate
- [ ] Network breakdown (MTN/Airtel/Orange)
- [ ] Top issues and resolutions

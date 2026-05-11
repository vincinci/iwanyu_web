# PawaPay Testing Guide

Complete guide for testing all payment flows on iwanyu.store using PawaPay Rwanda test numbers.

## Table of Contents
- [Test Environment Setup](#test-environment-setup)
- [PawaPay Rwanda Test Numbers](#pawapay-rwanda-test-numbers)
- [Automated Tests](#automated-tests)
- [Manual Testing Flows](#manual-testing-flows)
- [Webhook Testing](#webhook-testing)

---

## Test Environment Setup

### Prerequisites
- Access to Supabase project: `ygpnvjfxxuabnrpvnfdq`
- PawaPay sandbox account (dashboard.sandbox.pawapay.io)
- Node.js installed for running test scripts

### Environment Variables

For **SANDBOX** testing (recommended for development):
```bash
npx supabase secrets set PAWAPAY_ENV=sandbox --project-ref ygpnvjfxxuabnrpvnfdq
npx supabase secrets set PAWAPAY_API_TOKEN=<your_sandbox_token> --project-ref ygpnvjfxxuabnrpvnfdq
```

For **LIVE** testing (production):
```bash
npx supabase secrets set PAWAPAY_ENV=live --project-ref ygpnvjfxxuabnrpvnfdq
npx supabase secrets set PAWAPAY_API_TOKEN=<your_live_token> --project-ref ygpnvjfxxuabnrpvnfdq
```

---

## PawaPay Rwanda Test Numbers

### MTN Mobile Money (MTN_MOMO_RWA)

| Phone Number | Behavior | Use Case |
|-------------|----------|----------|
| `250783456789` | ✅ SUCCESS | Deposits and payouts complete successfully |
| `250783456039` | ❌ FAILED (PAYMENT_NOT_APPROVED) | User cancels/declines USSD prompt |
| `250783456019` | ❌ FAILED (PAYER_LIMIT_REACHED) | Daily/monthly transaction limit exceeded |

### Airtel Money (AIRTEL_RWA)

| Phone Number | Behavior | Use Case |
|-------------|----------|----------|
| `250733456789` | ✅ SUCCESS | Deposits and payouts complete successfully |
| `250733456049` | ❌ FAILED (INSUFFICIENT_BALANCE) | User has insufficient balance |
| `250733456039` | ❌ FAILED (PAYMENT_NOT_APPROVED) | User cancels/declines USSD prompt |

**Important:** These test numbers only work in **sandbox mode**. In live mode, PawaPay will reject them.

---

## Automated Tests

### Run Complete E2E Test Suite

```bash
# Run all automated tests (webhook simulation)
node scripts/test-e2e-pawapay.mjs
```

This tests:
- ✅ Wallet deposits (successful and failed)
- ✅ Webhook callbacks (COMPLETED, FAILED statuses)
- ✅ Balance updates and transaction records
- ✅ Idempotency (duplicate callbacks)
- ⚠️ Withdrawals (limited - requires real deposits)
- ⚠️ Seller payouts (requires function implementation)

### Run Original PawaPay Flow Tests

```bash
# Test all PawaPay integration points
node scripts/test-pawapay-flows.mjs
```

### Run Withdrawal Tests

```bash
# Test withdrawal flows (client refunds + seller payouts)
node scripts/test-withdrawal-flows.mjs
```

---

## Manual Testing Flows

### 1. Wallet Deposit (Top-Up)

**Objective:** Test users depositing money into their wallet via mobile money.

**Steps:**
1. Log in to https://www.iwanyu.store as a customer
2. Navigate to Wallet or Profile page
3. Click "Top Up Wallet" or "Add Money"
4. Enter amount (e.g., 2000 RWF)
5. Select network: MTN or Airtel
6. Enter test phone number: `250783456789` (MTN success)
7. Confirm the transaction

**Expected Behavior:**
- User sees "Transaction initiated" message
- PawaPay sends callback to `wallet-deposit-callback`
- Wallet balance increases by the deposited amount
- Transaction appears in wallet history with status: "completed"

**Test Variations:**
- **Failed deposit:** Use `250733456049` (Airtel insufficient) - balance should NOT change
- **Cancelled deposit:** Use `250783456039` (MTN cancelled) - balance should NOT change

---

### 2. Checkout Payment (Mobile Money)

**Objective:** Test customers paying for orders with mobile money.

**Steps:**
1. Log in as a customer
2. Add products to cart
3. Proceed to checkout
4. Fill in shipping details
5. Select payment method: **Mobile Money**
6. Enter test phone number: `250783456789`
7. Complete order

**Expected Behavior:**
- Order created with status: "Pending"
- PawaPay deposit callback updates order to: "Processing"
- Order appears in customer's order history
- Vendor receives payout record
- Shipping fee applied based on city (Kigali: 2000 RWF, Outside: 5000 RWF)

**Test Variations:**
- **Kigali shipping:** Enter city "Kigali" - shipping = 2000 RWF
- **Outside Kigali:** Enter city "Musanze" - shipping = 5000 RWF

---

### 3. Wallet Payment (Checkout)

**Objective:** Test customers paying with their wallet balance.

**Prerequisites:** Customer must have sufficient wallet balance (deposit first via Test #1).

**Steps:**
1. Log in as a customer with wallet balance
2. Add products to cart
3. Proceed to checkout
4. Select payment method: **Wallet**
5. Complete order

**Expected Behavior:**
- Wallet balance decreases by order total (subtotal + service fee + shipping)
- Order created with status: "Processing" (instant)
- No PawaPay API call (internal transaction)

---

### 4. Wallet Withdrawal (Client Refund)

**Objective:** Test customers withdrawing money from their wallet back to mobile money.

**Prerequisites:** Customer must have:
- Completed at least one deposit (for refund linking)
- Sufficient wallet balance

**Steps:**
1. Log in as a customer
2. Navigate to Wallet page
3. Click "Withdraw"
4. Enter amount (must be ≤ wallet balance)
5. Enter phone number: `250783456789`
6. Confirm withdrawal

**Expected Behavior:**
- Wallet balance immediately decreases
- PawaPay refund initiated (calls `/v2/refunds` API)
- Transaction record created with type: "withdrawal", status: "pending"
- ⚠️ **Note:** Sandbox refunds may be rejected if the original depositId doesn't exist in PawaPay

**Testing in Production:**
- Must have real deposits first
- Refunds link to original deposit transactions (FIFO)

---

### 5. Seller Earnings Withdrawal (Payout with Admin Approval)

**Objective:** Test sellers requesting payouts of their earnings, requiring admin approval.

**Prerequisites:** 
- Seller account with positive `payout_balance_rwf`
- Admin account with approval permissions

**Steps (Seller):**
1. Log in as a seller/vendor
2. Navigate to Seller Dashboard → Earnings
3. Click "Request Withdrawal"
4. Enter amount and phone number
5. Submit request

**Expected Behavior (Seller):**
- Payout request created with status: "pending_approval"
- Balance NOT yet deducted
- Request appears in seller's withdrawal history

**Steps (Admin):**
1. Log in as admin (`bebisdavy@gmail.com`)
2. Navigate to Admin Dashboard → Withdrawal Requests
3. Review the request
4. Click "Approve" or "Reject"

**Expected Behavior (Admin Approval):**
- On **Approve:**
  - PawaPay payout initiated (calls `/v2/payouts` API)
  - Vendor balance deducted
  - Request status: "approved" → "processing" → "completed"
  - Email sent to seller (optional)
  
- On **Reject:**
  - Request status: "rejected"
  - Balance remains unchanged
  - Seller notified (optional)

**PawaPay Integration:**
- Uses PawaPay `/v2/payouts` API (NOT refunds)
- Webhook callback: `seller-payout-callback`

---

## Webhook Testing

### Simulate Deposit Callback (Successful)

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "depositId": "<transaction_id>",
    "status": "COMPLETED",
    "amount": "5000",
    "currency": "RWF",
    "correspondent": "MTN_MOMO_RWA",
    "payer": {
      "type": "MSISDN",
      "address": { "value": "250783456789" }
    }
  }'
```

### Simulate Deposit Callback (Failed)

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "depositId": "<transaction_id>",
    "status": "FAILED",
    "amount": "3000",
    "currency": "RWF",
    "failureReason": {
      "failureCode": "INSUFFICIENT_BALANCE",
      "failureMessage": "Insufficient balance"
    }
  }'
```

### Simulate Refund Callback

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/pawapay-refund-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "refundId": "<refund_transaction_id>",
    "status": "COMPLETED",
    "amount": "2000",
    "currency": "RWF"
  }'
```

### Simulate Payout Callback

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <SUPABASE_ANON_KEY>" \
  -d '{
    "payoutId": "<payout_transaction_id>",
    "status": "COMPLETED",
    "amount": "15000",
    "currency": "RWF"
  }'
```

---

## Test Results Validation

### Database Checks

After each test, verify the database state:

```sql
-- Check wallet balance
SELECT id, email, wallet_balance_rwf 
FROM profiles 
WHERE email = 'test@example.com';

-- Check wallet transactions
SELECT type, amount_rwf, status, created_at, metadata
FROM wallet_transactions
WHERE user_id = '<user_id>'
ORDER BY created_at DESC
LIMIT 10;

-- Check orders
SELECT id, status, total_rwf, shipping_fee_rwf, payment_verified_at
FROM orders
WHERE buyer_user_id = '<user_id>'
ORDER BY created_at DESC;

-- Check vendor payouts
SELECT vendor_id, order_id, amount_rwf, status
FROM vendor_payouts
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Check seller withdrawal requests
SELECT id, vendor_id, amount_rwf, status, phone_number
FROM seller_withdrawal_requests
WHERE status = 'pending_approval'
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Issue: "PawaPay API unavailable" or "sandbox numbers don't work"

**Solution:** Check `PAWAPAY_ENV` setting:
```bash
# View current settings
npx supabase secrets list --project-ref ygpnvjfxxuabnrpvnfdq

# Set to sandbox
npx supabase secrets set PAWAPAY_ENV=sandbox --project-ref ygpnvjfxxuabnrpvnfdq
```

### Issue: "No completed deposits found for refund"

**Cause:** Wallet withdrawal (refund) requires a prior completed deposit.

**Solution:**
1. Complete a successful deposit first (Test #1)
2. Then attempt withdrawal
3. Or test withdrawal webhook simulation instead

### Issue: "DEPOSIT_NOT_FOUND" error on refund

**Cause:** The original deposit doesn't exist in PawaPay's system (test data).

**Solution:**
- Use real deposits in sandbox mode
- Or test refund webhooks via simulation (see Webhook Testing)

### Issue: Webhook not received

**Check:**
1. Edge function is deployed: `npx supabase functions list`
2. Webhook URL is correct in PawaPay dashboard
3. Check function logs: `npx supabase functions logs <function_name> --project-ref ygpnvjfxxuabnrpvnfdq`

---

## Best Practices

1. **Always test in sandbox first** - Never use test numbers in production
2. **Monitor PawaPay dashboard** - Check transaction status in real-time
3. **Check function logs** - Debug issues using `npx supabase functions logs`
4. **Verify database state** - Always check wallet balances and transaction records
5. **Test failure scenarios** - Don't just test happy paths
6. **Clean up test data** - Remove test users and transactions after testing

---

## Quick Reference

| Flow | Function | PawaPay API | Webhook |
|------|----------|------------|---------|
| Wallet Deposit | `wallet-deposit-callback` | `/v2/deposits` | ✅ Required |
| Order Payment | `wallet-deposit-callback` | `/v2/deposits` | ✅ Required |
| Wallet Withdrawal | `wallet-withdrawal` | `/v2/refunds` | ❌ Not supported |
| Seller Payout | `approve-seller-withdrawal` | `/v2/payouts` | ✅ Optional |

---

## Support

- **PawaPay Docs:** https://docs.pawapay.io
- **PawaPay Sandbox:** https://dashboard.sandbox.pawapay.io
- **Supabase Dashboard:** https://supabase.com/dashboard/project/ygpnvjfxxuabnrpvnfdq

For questions or issues, contact the development team.

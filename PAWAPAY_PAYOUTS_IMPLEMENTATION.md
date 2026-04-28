# Phase 4: PawaPay Payouts API - Seller Withdrawals

## 🏦 Architecture Overview

The seller withdrawal system uses two edge functions and PawaPay Payouts API:

```
Seller Dashboard
     ↓
seller-withdrawal-callback (request)
     ↓
PawaPay Payouts API (initiate payout)
     ↓
seller-payout-callback (webhook)
     ↓
seller_withdrawals table (status update)
```

---

## 🔄 Workflow

### Step 1: Seller Initiates Withdrawal

**Endpoint**: `/functions/v1/seller-withdrawal-callback`

**Request**:
```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-withdrawal-callback \
  -H "Authorization: Bearer {{SELLER_JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-uuid",
    "amountRwf": 500000,
    "mobileNetwork": "MTN",
    "phoneNumber": "+250788123456",
    "reason": "Weekly earnings withdrawal"
  }'
```

**Processing**:
1. ✅ Verify JWT authorization
2. ✅ Check seller owns vendor
3. ✅ Validate sufficient payout_balance_rwf
4. ✅ Create seller_withdrawals record with status "pending"
5. ✅ **Deduct immediately** from vendor.payout_balance_rwf
6. ✅ Record seller_withdrawal_transactions entry
7. ✅ Call PawaPay Payouts API (async)
8. ✅ Update status to "processing" if PawaPay accepts

**Response**:
```json
{
  "success": true,
  "withdrawalId": "withdrawal-uuid",
  "amountRwf": 500000,
  "newBalance": 250000,
  "status": "pending",
  "message": "Withdrawal initiated. You will receive the funds shortly."
}
```

### Step 2: PawaPay Initiates Payout

Our function calls PawaPay Payouts API:

```json
{
  "payoutId": "withdrawal-uuid",
  "amount": "500000",
  "currency": "RWF",
  "country": "RW",
  "correspondent": "MTN",
  "accountIdentifier": "+250788123456",
  "description": "Withdrawal to +250788123456",
  "correlationId": "withdrawal_uuid",
  "notificationUrl": "https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-payout-callback"
}
```

**PawaPay Response**:
- If success: Returns payoutId, status will update to "processing"
- If failed: Updates status to "failed", refunds amount back to vendor

### Step 3: Seller Receives Funds

Seller gets USSD prompt or directly receives funds in their mobile money wallet depending on their network:
- **MTN Mobile Money**: Prompt via USSD
- **Airtel Money**: Direct credit
- **Orange Money**: Direct credit

### Step 4: PawaPay Sends Callback

**Endpoint**: `/functions/v1/seller-payout-callback`

When payout completes/fails, PawaPay sends webhook:

```json
{
  "payoutId": "withdrawal-uuid",
  "status": "COMPLETED",
  "amount": "500000",
  "currency": "RWF",
  "country": "RW"
}
```

**Processing**:
1. ✅ Look up withdrawal by payoutId
2. ✅ If status is "COMPLETED":
   - Update seller_withdrawals.status = "completed"
   - Update seller_withdrawal_transactions.status = "completed"
   - Send SMS: "Withdrawal of FRW 500,000 received"
3. ✅ If status is "FAILED":
   - Update seller_withdrawals.status = "failed"
   - Refund amount back to vendor.payout_balance_rwf
   - Send SMS: "Withdrawal failed. Amount returned to your account"
4. ✅ Return HTTP 200 OK for idempotency

---

## 💾 Database Updates

### seller_withdrawals Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK, also used as payoutId |
| vendor_id | TEXT | FK to vendors.id |
| amount_rwf | INTEGER | Withdrawal amount |
| mobile_network | TEXT | MTN, Airtel, Orange |
| phone_number | TEXT | Destination phone |
| status | TEXT | pending → processing → completed/failed |
| reason | TEXT | Why withdrawal requested |
| completed_at | TIMESTAMPTZ | When payout completed |
| created_at | TIMESTAMPTZ | When requested |
| updated_at | TIMESTAMPTZ | Last status update |

### seller_withdrawal_transactions Table

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | PK |
| withdrawal_id | UUID | FK to seller_withdrawals |
| vendor_id | TEXT | FK to vendors |
| amount_rwf | INTEGER | Amount transferred |
| previous_balance_rwf | INTEGER | Balance before |
| new_balance_rwf | INTEGER | Balance after |
| mobile_network | TEXT | Network used |
| phone_number | TEXT | Destination |
| status | TEXT | initiated → completed/failed |
| created_at | TIMESTAMPTZ | When created |
| updated_at | TIMESTAMPTZ | Last update |

### vendors Table Update

```sql
ALTER TABLE vendors ADD COLUMN payout_balance_rwf INTEGER DEFAULT 0;
```

This tracks how much each seller has earned and can withdraw.

---

## 🔌 Configuration

### Environment Variables Required

```env
# PawaPay API
PAWAPAY_API_KEY=your-pawapay-api-key
PAWAPAY_ENDPOINT=https://api.pawapay.cloud  # or sandbox

# Supabase
SUPABASE_URL=https://ygpnvjfxxuabnrpvnfdq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Deploy Edge Functions

```bash
cd iwanyu_web/supabase

# Deploy seller-withdrawal-callback (updated)
supabase functions deploy seller-withdrawal-callback

# Deploy seller-payout-callback (new)
supabase functions deploy seller-payout-callback
```

### Configure PawaPay Dashboard

1. Go to **System Configuration** → **Callback URLs**
2. Add payout callback:
   - **URL**: `https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-payout-callback`
   - **Event Type**: Payout Completion
   - **Save and Test**

---

## 🧪 Testing Workflow

### Test 1: Manual Withdrawal Request

```bash
# Generate seller JWT token (use authenticated seller)
SELLER_JWT=$(curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/auth/v1/token \
  -H "apikey: SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "seller@example.com",
    "password": "password",
    "grant_type": "password"
  }' | jq -r '.access_token')

# Initiate withdrawal
curl -X POST http://localhost:54321/functions/v1/seller-withdrawal-callback \
  -H "Authorization: Bearer $SELLER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-uuid",
    "amountRwf": 100000,
    "mobileNetwork": "MTN",
    "phoneNumber": "+250788123456",
    "reason": "Testing"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "withdrawalId": "withdrawal-uuid",
  "amountRwf": 100000,
  "newBalance": 150000,
  "status": "pending"
}
```

### Test 2: Verify Database Changes

```sql
-- Check withdrawal was created
SELECT id, vendor_id, amount_rwf, status, created_at 
FROM seller_withdrawals 
WHERE vendor_id = 'vendor-uuid' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check transaction was recorded
SELECT id, withdrawal_id, amount_rwf, status 
FROM seller_withdrawal_transactions 
WHERE vendor_id = 'vendor-uuid' 
ORDER BY created_at DESC 
LIMIT 1;

-- Check vendor balance was deducted
SELECT id, payout_balance_rwf 
FROM vendors 
WHERE id = 'vendor-uuid';
```

### Test 3: Simulate Payout Callback (Success)

```bash
curl -X POST http://localhost:54321/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "withdrawal-uuid",
    "status": "COMPLETED",
    "amount": "100000",
    "currency": "RWF",
    "country": "RW"
  }'
```

**Verify in DB**:
```sql
SELECT status, completed_at FROM seller_withdrawals 
WHERE id = 'withdrawal-uuid';
-- Should show: status = 'completed', completed_at = now()
```

### Test 4: Simulate Payout Callback (Failure)

```bash
curl -X POST http://localhost:54321/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "withdrawal-uuid",
    "status": "FAILED",
    "amount": "100000",
    "currency": "RWF",
    "country": "RW"
  }'
```

**Verify in DB**:
```sql
SELECT status FROM seller_withdrawals WHERE id = 'withdrawal-uuid';
-- Should show: status = 'failed'

SELECT payout_balance_rwf FROM vendors WHERE id = 'vendor-uuid';
-- Balance should be refunded back
```

---

## ⚠️ Error Handling

### Scenario 1: Insufficient Balance

**Error**: Seller tries to withdraw more than payout_balance_rwf

**Response** (HTTP 400):
```json
{
  "error": "Insufficient balance. Available: 50000, Requested: 100000"
}
```

### Scenario 2: Invalid Vendor

**Error**: Seller doesn't own the vendor

**Response** (HTTP 403):
```json
{
  "error": "Vendor not found or unauthorized"
}
```

### Scenario 3: PawaPay API Down

**Result**: 
- Withdrawal created with status "pending"
- Amount deducted from balance
- Manual retry needed or callback retry mechanism

**Recovery**:
```bash
# Retry from PawaPay dashboard or
# Manually complete withdrawal via edge function
```

### Scenario 4: Duplicate Callback

**Result**: Withdrawal already has status "completed" or "failed"

**Response**: HTTP 200 OK (idempotent)

---

## 📊 Monitoring

### Key Metrics to Track

1. **Withdrawal Success Rate**
   - (Completed / Total) % per day
   - Target: > 99%

2. **Average Payout Time**
   - From initiation to completion
   - Typical: 1-5 minutes

3. **Failed Payouts**
   - Count and reasons
   - Monitor for patterns

4. **Webhook Delivery**
   - PawaPay callback success rate
   - Retry count and delays

### Alerts to Set Up

- Withdrawal failure rate > 5%
- Webhook delivery failures > 3 in a row
- Large withdrawal amounts (> 10M RWF)
- Unusual phone numbers or networks

---

## 🐛 Troubleshooting

### Payout Never Completes

**Symptoms**: Withdrawal stuck in "processing" for hours

**Checks**:
1. Verify seller-payout-callback webhook is registered in PawaPay
2. Check PawaPay webhook logs for delivery status
3. Verify phone number format (+250XXXXXXXXX)
4. Check network availability (MTN/Airtel/Orange)

**Recovery**:
```bash
# Manually trigger webhook
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-payout-callback \
  -H "Content-Type: application/json" \
  -d '{
    "payoutId": "withdrawal-uuid",
    "status": "COMPLETED",
    "amount": "amount-rwf",
    "currency": "RWF",
    "country": "RW"
  }'
```

### Withdrawal Stuck in "Pending"

**Symptoms**: Status never updates from "pending"

**Checks**:
1. PawaPay API accepting requests?
2. PAWAPAY_API_KEY valid and not expired?
3. Check server logs for errors
4. Phone number format correct?

**Recovery**:
- Update status manually to "failed"
- Refund amount back to vendor
- Create new withdrawal request

### Vendor Balance Inconsistency

**Symptoms**: payout_balance_rwf doesn't match expected

**Recovery**:
```sql
-- Check all withdrawals
SELECT SUM(amount_rwf) FROM seller_withdrawals 
WHERE vendor_id = 'vendor-id' AND status = 'completed';

-- Check pending/processing
SELECT SUM(amount_rwf) FROM seller_withdrawals 
WHERE vendor_id = 'vendor-id' AND status IN ('pending', 'processing');

-- Verify balance calculation
-- payout_balance_rwf should = total_sales - completed_withdrawals - pending_withdrawals
```

---

## 🚀 Future Enhancements

1. **Batch Payouts**: Process multiple withdrawals in one batch
2. **Scheduled Payouts**: Auto-payout on specific days
3. **Minimum Balance**: Set minimum withdrawal amount per network
4. **Fee Structure**: Add withdrawal fees per network
5. **Tax Reporting**: Generate withdrawal reports for tax purposes
6. **SMS Notifications**: Notify sellers of withdrawal status
7. **Retry Logic**: Auto-retry failed payouts
8. **Rate Limiting**: Prevent rapid successive withdrawals
9. **Blacklist**: Block problematic phone numbers/networks
10. **Reconciliation**: Monthly audit of all payouts

---

## 📚 References

- **PawaPay Payouts API**: https://docs.pawapay.cloud/payouts
- **Mobile Money Networks**: MTN Mobile Money, Airtel Money, Orange Money
- **Phone Number Format**: E.164 international format (+250...)
- **Database Schema**: See migrations in supabase/migrations/
- **Error Handling**: RFC 7231 HTTP Status Codes

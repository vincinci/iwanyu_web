# Payment Callbacks Documentation (PawaPay)

## Overview

The iwanyu platform now supports mobile money (MOMO) payments for African markets using **PawaPay**. The system includes three main callback webhooks for:

1. **Wallet Deposits** - Credit wallet when users top up via mobile money
2. **Wallet Refunds** - Debit wallet for cancellations/disputes
3. **Seller Withdrawals** - Payout earnings to sellers' mobile money

---

## 1. Wallet Deposit Callback

**Purpose:** Credit a user's wallet when they successfully deposit money via PawaPay mobile money.

### Callback URL
```
https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback
```

### Incoming Webhook (from PawaPay)

PawaPay sends a POST request when a deposit completes:

```json
{
  "depositId": "f4401bd2-1568-4140-bf2d-eb77d2b2b639",
  "status": "COMPLETED",
  "requestedAmount": "50000",
  "currency": "RWF",
  "country": "RW"
}
```

### Processing Logic

1. ✅ Receive deposit callback with `depositId` and `status`
2. ✅ Only process deposits with status `COMPLETED`
3. ✅ Validate currency is `RWF` (Rwanda Franc)
4. ✅ Check for duplicate transactions (idempotency via `external_transaction_id`)
5. ✅ Look up transaction by `depositId` to find user
6. ✅ Fetch user from `profiles` table
7. ✅ **UPDATE** `profiles.wallet_balance_rwf += requestedAmount`
8. ✅ Update transaction status to `completed`
9. ✅ Return success response

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "depositId": "f4401bd2-1568-4140-bf2d-eb77d2b2b639"
}
```

### Status Values from PawaPay

| Status | Action |
|--------|--------|
| `COMPLETED` | ✅ Process deposit - credit wallet |
| `FAILED` | ⏭️ Skip - deposit failed |
| `PROCESSING` | ⏭️ Skip - still processing (redirect auth providers) |

---

## 2. Wallet Refund Callback

**Purpose:** Debit a user's wallet when issuing refunds (order cancellation, dispute resolution, manual admin refund).

### Callback URL
```
https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-refund-callback
```

### Request Format (Called from backend/admin)

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-refund-callback \
  -H "Authorization: Bearer {{JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "amountRwf": 50000,
    "orderId": "order-uuid",
    "reason": "Order cancelled by customer",
    "reference": "order-uuid-12345"
  }'
```

### Request Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | UUID | ✅ Yes | User receiving refund |
| `amountRwf` | Integer | ✅ Yes | Amount to refund (> 0) |
| `orderId` | UUID | ❌ Optional | Associated order ID |
| `reason` | String | ✅ Yes | Refund reason (e.g., "Order cancelled") |
| `reference` | String | ❌ Optional | External reference ID for tracking |

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "refundedAmount": 50000,
  "newBalance": 150000
}
```

---

## 3. Seller Withdrawal Callback

**Purpose:** Process seller requests to withdraw their earned balance to mobile money via PawaPay.

### Callback URL
```
https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-withdrawal-callback
```

### Request Format (Called from seller dashboard)

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/seller-withdrawal-callback \
  -H "Authorization: Bearer {{JWT_TOKEN}}" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-uuid",
    "amountRwf": 500000,
    "mobileNetwork": "MTN",
    "phoneNumber": "+250788123456",
    "reason": "Weekly earnings withdrawal"
  }'
```

### Request Parameters

| Parameter | Type | Required | Values |
|-----------|------|----------|--------|
| `vendorId` | String | ✅ Yes | Seller's vendor ID |
| `amountRwf` | Integer | ✅ Yes | Amount to withdraw (> 0) |
| `mobileNetwork` | String | ✅ Yes | `MTN`, `Airtel`, `Orange` |
| `phoneNumber` | String | ✅ Yes | E.164 format (+250...) |
| `reason` | String | ❌ Optional | Withdrawal reason |

### Response

**Success (200 OK)**
```json
{
  "success": true,
  "withdrawalId": "withdrawal-uuid",
  "amountRwf": 500000,
  "newBalance": 250000,
  "status": "pending"
}
```

---

## PawaPay Integration Setup

### 1. Dashboard Configuration

1. Log in to PawaPay Dashboard: https://dashboard.pawapay.cloud
2. Navigate to **System Configuration** → **Callback URLs**
3. Configure callback URL for deposits:
   - **URL**: `https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback`
   - Click "Introduce Callback URL"
4. Save and test

### 2. Whitelist IPs (if using IP filtering)

PawaPay callback IPs to whitelist:

**Sandbox**: `3.64.89.224/32`

**Production**:
- `18.192.208.15/32`
- `18.195.113.136/32`
- `3.72.212.107/32`
- `54.73.125.42/32`
- `54.155.38.214/32`
- `54.73.130.113/32`

### 3. Environment Variables

```env
SUPABASE_URL=https://ygpnvjfxxuabnrpvnfdq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
PAWAPAY_API_KEY=your-pawapay-api-key
PAWAPAY_ENDPOINT=https://api.pawapay.cloud
```

---

## Testing

### Test Deposit Callback

```bash
curl -X POST http://localhost:54321/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -d '{
    "depositId": "test-deposit-123",
    "status": "COMPLETED",
    "requestedAmount": "50000",
    "currency": "RWF",
    "country": "RW"
  }'
```

### Test Refund

```bash
curl -X POST http://localhost:54321/functions/v1/wallet-refund-callback \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-uuid",
    "amountRwf": 50000,
    "reason": "Test refund"
  }'
```

### Test Seller Withdrawal

```bash
curl -X POST http://localhost:54321/functions/v1/seller-withdrawal-callback \
  -H "Authorization: Bearer SELLER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "vendorId": "vendor-123",
    "amountRwf": 500000,
    "mobileNetwork": "MTN",
    "phoneNumber": "+250788123456"
  }'
```

---

## Status

✅ All functions deployed and active
✅ Database migrations complete
✅ Ready for PawaPay webhook configuration


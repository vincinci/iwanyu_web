# PawaPay API Integration - Migration Complete

## Overview
Successfully migrated from Supabase Edge Functions (Deno) to Vercel Serverless API routes (Node.js) using **direct PawaPay REST APIs**.

## What Changed

### Before (Supabase Edge Functions)
- Functions located in `supabase/functions/`
- Used Deno runtime
- Called via `VITE_SUPABASE_URL/functions/v1/...`
- Required Supabase CLI deployment

### After (Vercel API Routes)
- Functions located in `api/`
- Uses Node.js runtime (Vercel)
- Called via `/api/pawapay-...`
- Automatically deployed with Vercel

## New API Endpoints

### 1. Wallet Deposits
**Endpoint:** `POST /api/pawapay-deposit`

**PawaPay API Used:** `POST https://api.pawapay.io/deposits`

**Request Body:**
```json
{
  "amount": 5000,
  "phoneNumber": "+250788123456",
  "correspondent": "MTN_MOMO_RWA"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "dep_1234567890_abc123",
  "message": "Deposit initiated. Check your phone to complete payment."
}
```

### 2. Wallet Withdrawals (Payouts)
**Endpoint:** `POST /api/pawapay-withdrawal`

**PawaPay API Used:** `POST https://api.pawapay.io/payouts`

**Request Body:**
```json
{
  "amount": 3000,
  "phoneNumber": "+250788123456",
  "correspondent": "MTN_MOMO_RWA"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "wth_1234567890_abc123",
  "message": "Withdrawal initiated. Funds will be sent to your mobile money account."
}
```

### 3. Order Payments
**Endpoint:** `POST /api/pawapay-payment`

**PawaPay API Used:** `POST https://api.pawapay.io/deposits`

**Request Body:**
```json
{
  "orderId": "order-123",
  "phoneNumber": "+250788123456",
  "correspondent": "MTN_MOMO_RWA"
}
```

**Response:**
```json
{
  "success": true,
  "transactionId": "pay_1234567890_order-123",
  "message": "Payment initiated. Check your phone to complete payment."
}
```

### 4. Transaction Status Check
**Endpoint:** `GET /api/pawapay-status?transactionId={id}`

**PawaPay APIs Used:**
- `GET https://api.pawapay.io/deposits/{depositId}`
- `GET https://api.pawapay.io/payouts/{payoutId}`

**Response:**
```json
{
  "success": true,
  "transactionId": "dep_1234567890_abc123",
  "transactionType": "deposit",
  "pawapayStatus": {
    "depositId": "dep_1234567890_abc123",
    "status": "COMPLETED",
    "amount": "5000",
    "currency": "RWF"
  },
  "dbStatus": {
    "status": "completed",
    "amount_rwf": 5000
  }
}
```

### 5. Webhook Callback
**Endpoint:** `POST /api/pawapay-webhook`

**Purpose:** Receives real-time payment status updates from PawaPay

**Handles:**
- Deposit completions/failures
- Payout completions/failures
- Order payment confirmations
- Automatic wallet balance updates
- Transaction status updates

## PawaPay APIs Integrated

### Core APIs
1. **Deposits API** - `POST https://api.pawapay.io/deposits`
   - Mobile money collection
   - Used for wallet deposits and order payments

2. **Payouts API** - `POST https://api.pawapay.io/payouts`
   - Mobile money disbursement
   - Used for wallet withdrawals

3. **Deposit Status API** - `GET https://api.pawapay.io/deposits/{depositId}`
   - Check payment status

4. **Payout Status API** - `GET https://api.pawapay.io/payouts/{payoutId}`
   - Check payout status

5. **Predict Provider API** - `POST https://api.pawapay.io/predict-provider`
   - Auto-detect mobile money provider from phone number

6. **Availability API** - `GET https://api.pawapay.io/availability`
   - Check if payout is available for a country/provider

### Webhooks
PawaPay sends POST requests to `/api/pawapay-webhook` with payment updates.

## Supported Countries & Providers

| Country | Code | Providers |
|---------|------|-----------|
| **Rwanda** | +250 | MTN Mobile Money, Airtel Money |
| **Kenya** | +254 | M-Pesa |
| **Uganda** | +256 | MTN Mobile Money, Airtel Money |
| **Tanzania** | +255 | Vodacom, Tigo, Airtel, Halotel |
| **Zambia** | +260 | MTN Mobile Money, Zamtel |
| **Ghana** | +233 | MTN Mobile Money, Vodafone |
| **DRC** | +243 | Vodacom M-Pesa, Airtel, Orange |
| **Cameroon** | +237 | MTN Mobile Money, Orange |
| **Senegal** | +221 | Orange, Free |
| **Ivory Coast** | +225 | MTN Mobile Money, Orange |
| **Mozambique** | +258 | Vodacom M-Pesa |
| **Malawi** | +265 | Airtel Money, TNM |

Plus: Burundi, Congo-Brazzaville, Benin, Gabon, Sierra Leone

## Environment Variables Required

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# PawaPay
PAWAPAY_API_KEY=your-pawapay-api-key

# Optional (for client-side fallbacks)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Client Library Usage

The `src/lib/pawapay.ts` library has been updated to use the new API routes:

```typescript
import { PawaPay } from '@/lib/pawapay';

// Deposit funds to wallet
const result = await PawaPay.deposit(5000, '+250788123456', 'MTN_MOMO_RWA');

// Withdraw funds from wallet
const result = await PawaPay.withdraw(3000, '+250788123456', 'MTN_MOMO_RWA');

// Pay for an order
const result = await PawaPay.payOrder('order-123', '+250788123456', 'MTN_MOMO_RWA');

// Check transaction status
const status = await PawaPay.checkStatus('dep_1234567890_abc123');
```

## Utility Functions

Created `api/lib/pawapay-utils.ts` with helper functions:

```typescript
import { 
  checkDepositStatus,
  checkPayoutStatus,
  predictProvider,
  checkAvailability,
  getCorrespondentName,
  getCountryFromPhone,
  formatPhoneNumber,
  isValidPhoneNumber 
} from './api/lib/pawapay-utils';
```

## Transaction Flow

### Deposit Flow
1. User initiates deposit via UI
2. Client calls `POST /api/pawapay-deposit`
3. API creates pending transaction in DB
4. API calls PawaPay Deposits API
5. PawaPay sends USSD push to user's phone
6. User approves payment on phone
7. PawaPay sends webhook to `/api/pawapay-webhook`
8. Webhook updates transaction status and wallet balance

### Withdrawal Flow
1. User requests withdrawal via UI
2. Client calls `POST /api/pawapay-withdrawal`
3. API validates balance
4. API deducts from wallet (optimistic)
5. API calls PawaPay Payouts API
6. PawaPay processes payout
7. PawaPay sends webhook to `/api/pawapay-webhook`
8. On success: Transaction marked complete
9. On failure: Wallet balance refunded

## Testing

### Local Testing
```bash
# Start Vercel dev server
vercel dev

# Test deposit
curl -X POST http://localhost:3000/api/pawapay-deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 5000, "phoneNumber": "+250788123456"}'
```

### Production Deployment
```bash
# Deploy to Vercel
vercel --prod

# Webhook URL for PawaPay dashboard
https://your-domain.vercel.app/api/pawapay-webhook
```

## Security Features

1. **Authentication Required** - All endpoints require valid Supabase auth token
2. **User Validation** - Transactions verified against authenticated user
3. **Balance Checks** - Withdrawal validation before processing
4. **CORS Configured** - Proper CORS headers for frontend calls
5. **Error Handling** - Comprehensive error responses
6. **Transaction Rollback** - Failed withdrawals refund automatically

## Migration Benefits

✅ **Direct API Calls** - No intermediate Edge Functions  
✅ **Better Performance** - Faster response times  
✅ **Simpler Deployment** - Auto-deploys with Vercel  
✅ **Node.js Ecosystem** - Access to full npm packages  
✅ **Better Debugging** - Vercel logs and monitoring  
✅ **Cost Effective** - No Supabase Edge Function costs  

## Next Steps

1. **Update PawaPay Dashboard** - Set webhook URL to `https://your-domain.vercel.app/api/pawapay-webhook`
2. **Test All Flows** - Deposit, withdrawal, and order payment
3. **Monitor Logs** - Check Vercel dashboard for errors
4. **Optional**: Delete old Supabase Edge Functions if not needed

## Files Created

- `api/pawapay-deposit.ts` - Wallet deposits
- `api/pawapay-withdrawal.ts` - Wallet withdrawals (payouts)
- `api/pawapay-payment.ts` - Order payments
- `api/pawapay-status.ts` - Transaction status checker
- `api/pawapay-webhook.ts` - Webhook callback handler
- `api/lib/pawapay-utils.ts` - Utility functions
- `src/lib/pawapay.ts` - Updated client library

## Support

For PawaPay API documentation:
- https://docs.pawapay.io
- https://api.pawapay.io (API base URL)

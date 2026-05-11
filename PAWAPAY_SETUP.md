# PawaPay Integration Setup Guide

## Overview

This implementation provides a simple, straightforward PawaPay integration for:
- **Wallet Deposits**: Users can add funds to their wallet via mobile money
- **Wallet Withdrawals**: Users can withdraw funds from their wallet to mobile money
- **Order Payments**: Users can pay for orders directly with mobile money

## Environment Variables

Add these to your Supabase Edge Functions secrets:

```bash
# PawaPay API Configuration
PAWAPAY_API_KEY=your_pawapay_api_key_here
```

To set the environment variable in Supabase:

```bash
supabase secrets set PAWAPAY_API_KEY=your_key_here --project-ref ygpnvjfxxuabnrpvnfdq
```

## Database Schema

Ensure these tables exist in your Supabase database:

### wallets table
```sql
CREATE TABLE IF NOT EXISTS wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  balance DECIMAL(10, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### wallet_transactions table
```sql
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  transaction_id TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
  amount DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')),
  phone_number TEXT NOT NULL,
  provider TEXT DEFAULT 'pawapay',
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_wallet_transactions_user_id ON wallet_transactions(user_id);
CREATE INDEX idx_wallet_transactions_transaction_id ON wallet_transactions(transaction_id);
```

### orders table updates
Ensure the orders table has these columns:
```sql
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT,
ADD COLUMN IF NOT EXISTS payment_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
```

## Edge Functions

Deploy the PawaPay edge functions:

```bash
# Deploy all functions at once
supabase functions deploy pawapay-deposit --project-ref ygpnvjfxxuabnrpvnfdq
supabase functions deploy pawapay-deposit-callback --project-ref ygpnvjfxxuabnrpvnfdq --no-verify-jwt
supabase functions deploy pawapay-withdrawal --project-ref ygpnvjfxxuabnrpvnfdq
supabase functions deploy pawapay-withdrawal-callback --project-ref ygpnvjfxxuabnrpvnfdq --no-verify-jwt
supabase functions deploy pawapay-payment --project-ref ygpnvjfxxuabnrpvnfdq
supabase functions deploy pawapay-payment-callback --project-ref ygpnvjfxxuabnrpvnfdq --no-verify-jwt
```

Note: Callback functions use `--no-verify-jwt` because they receive webhooks from PawaPay.

## PawaPay Webhook Configuration

Configure these webhook URLs in your PawaPay dashboard:

- **Deposits**: `https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/pawapay-deposit-callback`
- **Withdrawals**: `https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/pawapay-withdrawal-callback`
- **Payments**: `https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/pawapay-payment-callback`

## Country/Currency Configuration

The default configuration is set for:
- **Country**: Zambia
- **Currency**: ZMW (Zambian Kwacha)
- **Mobile Network**: MTN_MOMO_ZMB

To change these, update the correspondent values in:
- `supabase/functions/pawapay-deposit/index.ts`
- `supabase/functions/pawapay-withdrawal/index.ts`
- `supabase/functions/pawapay-payment/index.ts`

Available correspondents (check PawaPay docs for full list):
- MTN_MOMO_ZMB (Zambia)
- MTN_MOMO_RWA (Rwanda)
- AIRTEL_MOMO_ZMB (Zambia)
- VODACOM_MPESA_ZMB (Zambia)

## User Flow

### Wallet Deposit
1. User goes to `/wallet`
2. Enters amount and phone number
3. Clicks "Deposit"
4. Receives push notification on phone
5. Approves payment on phone
6. PawaPay sends webhook to confirm
7. Wallet balance updated

### Wallet Withdrawal
1. User goes to `/wallet`
2. Switches to "Withdraw" tab
3. Enters amount and phone number
4. Clicks "Withdraw"
5. Balance deducted immediately
6. Money sent to mobile money
7. If fails, balance refunded via webhook

### Order Payment
1. User creates order at checkout
2. Redirected to `/checkout?order=ORDER_ID`
3. Enters phone number
4. Clicks "Pay"
5. Receives push notification
6. Approves payment
7. Order status updated to "confirmed"

## Testing

Use PawaPay sandbox credentials for testing:
1. Set `PAWAPAY_API_KEY` to your sandbox key
2. Use sandbox phone numbers
3. Check PawaPay dashboard for test transaction status

## Phone Number Format

The system automatically formats phone numbers:
- Input: `0977123456` or `977123456`
- Output: `260977123456` (with country code)

## Error Handling

All edge functions return standardized responses:

**Success:**
```json
{
  "success": true,
  "transactionId": "dep_1234567890_abc12345",
  "message": "Deposit initiated. Check your phone to complete payment."
}
```

**Error:**
```json
{
  "success": false,
  "error": "Insufficient balance"
}
```

## Security Notes

- All deposit/withdrawal functions require authentication
- Callback functions validate incoming PawaPay webhooks
- Phone numbers are validated and formatted
- Wallet balance checks prevent overdrafts
- Transaction IDs prevent duplicate processing

## Troubleshooting

**Deposits not working:**
1. Check PAWAPAY_API_KEY is set correctly
2. Verify webhook URLs in PawaPay dashboard
3. Check phone number format (must include country code)
4. Verify correspondent code matches your country

**Withdrawals failing:**
1. Check wallet balance is sufficient
2. Verify phone number is valid mobile money number
3. Check PawaPay payout limits
4. Review callback logs in Supabase

**Orders not confirming:**
1. Verify payment-callback webhook is configured
2. Check transaction_id is set on order
3. Review callback function logs
4. Ensure order status is "pending" before payment

## Next Steps

For production deployment:
1. Switch from sandbox to production PawaPay credentials
2. Test all flows thoroughly with small amounts
3. Monitor webhook delivery and success rates
4. Set up alerting for failed transactions
5. Implement transaction reconciliation process

## Support

For PawaPay API issues, consult:
- PawaPay Documentation: https://docs.pawapay.io/
- PawaPay Support: support@pawapay.io

For implementation questions, review:
- Edge function logs in Supabase dashboard
- Network tab in browser dev tools
- Supabase database logs

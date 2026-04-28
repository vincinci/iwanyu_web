# Phase 3: PawaPay Dashboard Webhook Configuration

## 🔧 Setup Instructions

### Step 1: Access PawaPay Dashboard

1. Navigate to **https://dashboard.pawapay.cloud**
2. Log in with your PawaPay account credentials
3. If you don't have an account, create one at https://www.pawapay.cloud

### Step 2: Navigate to Callback Configuration

1. In the dashboard, go to **System Configuration** or **Settings**
2. Look for **Callback URLs** or **Webhooks** section
3. You should see options to configure callbacks for different transaction types

### Step 3: Configure Deposit Callback

For wallet deposits (when customers top up):

1. Click **Add Callback URL** or **Configure Webhook**
2. Fill in the following details:
   - **Event Type**: `Deposit` or `Payment Completion`
   - **Callback URL**: 
     ```
     https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback
     ```
   - **Method**: POST (default)
   - **Content-Type**: application/json (default)
   - **Retry Settings**: Enable retries for 15 minutes

3. **Test Webhook** (if available in dashboard)
   - PawaPay will send a test POST request to verify the URL is reachable
   - Verify you see a successful response (HTTP 200 OK)

4. **Save Configuration**

### Step 4: Verify Webhook Delivery

After saving:

1. Go to **Webhook Logs** or **Callback History** (if available)
2. You should see recent webhook deliveries
3. Click on a delivery to view:
   - Request payload
   - Response status
   - Timestamp
   - Retry count

### Step 5: IP Whitelist (if using IP filtering)

If your firewall requires IP whitelisting, add these PawaPay IPs:

**Sandbox Environment:**
- `3.64.89.224/32`

**Production Environment:**
- `18.192.208.15/32`
- `18.195.113.136/32`
- `3.72.212.107/32`
- `54.73.125.42/32`
- `54.155.38.214/32`
- `54.73.130.113/32`

---

## 📋 Expected Webhook Payload

When a user completes a mobile money deposit, PawaPay will send:

```json
{
  "depositId": "f4401bd2-1568-4140-bf2d-eb77d2b2b639",
  "status": "COMPLETED",
  "requestedAmount": "50000",
  "currency": "RWF",
  "country": "RW"
}
```

**Our endpoint will:**
1. ✅ Verify status is "COMPLETED"
2. ✅ Validate currency is "RWF"
3. ✅ Look up user by depositId
4. ✅ Credit wallet with requestedAmount
5. ✅ Return HTTP 200 OK

---

## 🧪 Testing Webhook Configuration

### Manual Test (Recommended)

Use curl to test the webhook endpoint:

```bash
curl -X POST https://ygpnvjfxxuabnrpvnfdq.supabase.co/functions/v1/wallet-deposit-callback \
  -H "Content-Type: application/json" \
  -d '{
    "depositId": "test-deposit-001",
    "status": "COMPLETED",
    "requestedAmount": "10000",
    "currency": "RWF",
    "country": "RW"
  }'
```

**Expected response (HTTP 200):**
```json
{
  "success": true,
  "depositId": "test-deposit-001"
}
```

### Dashboard Test

In PawaPay Dashboard:

1. Go to **Webhooks** → **Callback URLs**
2. Find your deposit callback
3. Click **Send Test** or **Test Webhook**
4. You should see:
   - Request timestamp
   - Response status: 200 OK
   - Response body with success message

### Production First Deposit

1. User initiates deposit via checkout (mobile money)
2. PawaPay redirects to authentication
3. User confirms payment via mobile network (USSD)
4. PawaPay processes the deposit
5. Webhook fires within seconds
6. User's wallet is credited
7. Order status updates to "paid"

---

## ✅ Verification Checklist

Before going live, verify:

- [ ] Webhook URL is added to PawaPay Dashboard
- [ ] URL is publicly accessible (HTTPS only)
- [ ] Test webhook delivery successful (HTTP 200)
- [ ] Database has wallet_transactions table created
- [ ] wallet_transactions indexes are in place
- [ ] RLS policies allow service role write access
- [ ] SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in function secrets
- [ ] PAWAPAY_API_KEY is in function secrets
- [ ] Supabase functions are deployed

---

## 🔐 Security Considerations

### Signature Verification (Optional for PawaPay)

PawaPay supports RFC-9421 signature verification (optional):

If enabled in PawaPay settings:
1. PawaPay adds `Signature` header to webhook
2. Our function could verify using PAWAPAY_PUBLIC_KEY
3. Currently NOT required (recommended to enable later)

### API Key Management

- ✅ Never commit PAWAPAY_API_KEY to version control
- ✅ Store in Supabase Edge Function Secrets
- ✅ Rotate API key periodically
- ✅ Use separate keys for sandbox and production

### Database Security

- ✅ wallet_transactions table uses RLS
- ✅ Only authenticated users can view their own transactions
- ✅ Service role can write for webhook callbacks
- ✅ No sensitive data stored in descriptions

---

## 🐛 Troubleshooting

### Webhook Not Firing

**Problem**: Deposits aren't triggering wallet credits
**Solutions**:
1. Check PawaPay Dashboard → Webhook Logs
2. Verify callback URL is correct (HTTPS, no typos)
3. Test manually with curl command above
4. Check Supabase function logs for errors
5. Ensure PAWAPAY_API_KEY is set in function secrets

### HTTP 400/500 Errors from Webhook

**Problem**: Webhook delivery failing with error status
**Solutions**:
1. Check function logs: `supabase functions logs wallet-deposit-callback --tail`
2. Verify wallet_transactions table exists
3. Check database RLS policies
4. Ensure deposits are created with `external_transaction_id` matching depositId

### Duplicate Deposits

**Problem**: Same deposit credited multiple times
**Solutions**:
1. Our function checks for duplicates automatically
2. If still occurring, verify external_transaction_id is unique
3. Check wallet_transactions index on external_transaction_id

---

## 📞 PawaPay Support

For issues with PawaPay:
- **Documentation**: https://docs.pawapay.cloud
- **API Reference**: https://docs.pawapay.cloud/api
- **Support Email**: support@pawapay.cloud
- **Sandbox API**: Use for testing before production
- **Production API**: Live transactions (use with caution)

---

## 🚀 Next Steps

After webhook is configured:

1. **Phase 4**: Implement PawaPay Payouts API for seller withdrawals
2. **Phase 5**: End-to-end testing of complete workflow
3. Monitor webhook delivery and transaction success rates
4. Set up alerts for webhook failures
5. Create user documentation for payment process

---

## 📊 Monitoring

### Recommended Checks

- Daily: Check webhook delivery success rate > 99%
- Weekly: Review transaction logs for any anomalies
- Monthly: Verify wallet balances accuracy
- Quarterly: Audit transaction history for discrepancies

### Key Metrics

- Total deposits initiated
- Successful deposits (status = COMPLETED)
- Failed deposits (status = FAILED)
- Average time from webhook to wallet credit
- Wallet balance accuracy

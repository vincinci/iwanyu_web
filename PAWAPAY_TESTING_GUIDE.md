# Manual PawaPay Testing Guide

## Quick Test - Try the deposit now!

The auth issues have been fixed. **Try making a deposit from your app now.**

## What was fixed:

1. ✅ **Authentication** - All endpoints now properly verify user tokens using the anon key
2. ✅ **Database Schema** - Using correct production schema (`amount_rwf`, `external_transaction_id`, `type`)
3. ✅ **Security** - Removed console logs that exposed wallet balances
4. ✅ **Consistency** - All three endpoints (deposit, withdrawal, payment) use the same auth pattern

## Manual Testing Steps:

### 1. Test Deposit
1. Open https://www.iwanyu.store in your browser
2. Log in with your account
3. Go to the Wallet page
4. Try to deposit (e.g., 1000 RWF)
5. You should see a success message or payment prompt

### 2. Check Logs
If there are any issues, check the logs:
```bash
vercel logs --since 5m
```

### 3. Test Withdrawal
1. Make sure you have balance in your wallet
2. Try to withdraw (e.g., 500 RWF)
3. Should complete successfully

## Expected Flow:

### Deposit:
1. User clicks "Deposit" → Enters amount → Submits
2. Frontend calls `/api/pawapay-deposit` with auth token
3. Backend:
   - Verifies user auth
   - Records pending transaction in database
   - Calls PawaPay API to initiate mobile money collection
   - Returns transaction ID
4. User receives mobile money prompt on their phone
5. User completes payment on phone
6. PawaPay sends webhook to `/api/pawapay-webhook`
7. Backend updates transaction status and credits wallet

### Withdrawal:
1. User clicks "Withdraw" → Enters amount → Submits
2. Frontend calls `/api/pawapay-withdrawal` with auth token
3. Backend:
   - Verifies user auth
   - Checks sufficient balance
   - Deducts from wallet immediately (optimistic)
   - Records pending transaction
   - Calls PawaPay API to initiate payout
   - Returns transaction ID
4. PawaPay processes payout
5. User receives money on mobile wallet
6. PawaPay sends webhook confirmation
7. Backend updates transaction status (or refunds if failed)

## Troubleshooting:

### If you get 401 Unauthorized:
- Make sure you're logged in
- Try logging out and back in
- Check browser console for token issues

### If you get 500 Internal Server Error:
- Check Vercel logs: `vercel logs --since 5m`
- Look for the exact error message
- Share the error here

### If deposit doesn't prompt for payment:
- Check that PawaPay API key is valid
- Verify phone number format (+250788123456)
- Check PawaPay dashboard for the transaction

## Current Deployment:
- ✅ Production: https://www.iwanyu.store
- ✅ All endpoints deployed
- ✅ Environment variables configured

**Try it now and let me know if you encounter any issues!** 🚀

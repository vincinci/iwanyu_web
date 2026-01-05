# Edge Function Secrets Setup

## Cloudinary Signing Function

The `cloudinary-sign` Edge Function requires the following secrets to be set in your Supabase dashboard:

### Required Secrets:
1. **CLOUDINARY_CLOUD_NAME**: Your Cloudinary cloud name (e.g., `dtd29j5rx`)
2. **CLOUDINARY_API_KEY**: Your Cloudinary API key  
3. **CLOUDINARY_API_SECRET**: Your Cloudinary API secret

### How to Set Secrets:

#### Via Supabase Dashboard:
1. Go to https://supabase.com/dashboard/project/iakxtffxaevszuouapih/settings/functions
2. Click on "Edge Functions" in the sidebar
3. Click "Secrets" tab
4. Add each secret with its corresponding value

#### Via CLI:
```bash
npx supabase secrets set CLOUDINARY_CLOUD_NAME=your_cloud_name
npx supabase secrets set CLOUDINARY_API_KEY=your_api_key
npx supabase secrets set CLOUDINARY_API_SECRET=your_api_secret
```

## Flutterwave Verification Function

The `flutterwave-verify` Edge Function requires:

1. **FLUTTERWAVE_SECRET_KEY**: Your Flutterwave secret key
2. **SUPABASE_URL**: Auto-set by Supabase
3. **SUPABASE_SERVICE_ROLE_KEY**: Auto-set by Supabase (or needs to be manually set)

```bash
npx supabase secrets set FLUTTERWAVE_SECRET_KEY=your_secret_key
```

## Verification

After setting secrets, test the functions:

### Test Cloudinary Sign:
```bash
curl -X POST https://iakxtffxaevszuouapih.supabase.co/functions/v1/cloudinary-sign \
  -H "apikey: YOUR_SUPABASE_ANON_KEY" \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"folder": "test"}'
```

### Test Flutterwave Verify:
The function is called automatically during checkout after payment success.

## Current Status

- ✅ cloudinary-sign function deployed
- ✅ flutterwave-verify function deployed
- ⚠️ Secrets need to be configured in Supabase dashboard

## Next Steps

1. Go to Supabase dashboard and set the secrets
2. Test vendor product upload with image
3. Verify images are stored in Cloudinary
4. Test payment flow end-to-end

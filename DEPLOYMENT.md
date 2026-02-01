# 🚀 Production Deployment Guide - iwanyu.store

## ⚠️ CRITICAL: Required Vercel Environment Variables

Before deploying to production, you MUST configure these environment variables in Vercel:

### 1. Go to Vercel Dashboard
- Navigate to: https://vercel.com
- Select project: **iwanyu-marketplace**
- Go to: **Settings** → **Environment Variables**

### 2. Add These Variables (Production)

```bash
# Supabase Configuration
VITE_SUPABASE_URL="https://ygpnvjfxxuabnrpvnfdq.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.McDG3rawGydXS7QIZfggPjhuLnWVFbEvbgGiLTET6eo"

# Cloudinary Configuration (For Image Uploads)
CLOUDINARY_CLOUD_NAME="dtd29j5rx"
CLOUDINARY_API_KEY="566557823619379"
CLOUDINARY_API_SECRET="[GENERATE NEW SECRET - OLD ONE WAS EXPOSED]"

# Flutterwave Payment Gateway
VITE_FLUTTERWAVE_PUBLIC_KEY="[YOUR_PUBLIC_KEY]"

# Flutterwave Secret Key (for Supabase Edge Function - set in Supabase Dashboard)
# FLUTTERWAVE_SECRET_KEY="[YOUR_SECRET_KEY]"

# Google OAuth (if using Google Sign-In)
VITE_GOOGLE_CLIENT_ID="[YOUR_GOOGLE_CLIENT_ID]"
```

### 3. Scope Settings
- **Production**: ✅ Check this
- **Preview**: ✅ Check this (optional, recommended)
- **Development**: ❌ Leave unchecked (use .env.local instead)

---

## 🔐 Security Checklist

### ✅ Before First Deployment

- [ ] **Rotate Cloudinary API Secret**
  - Go to: https://cloudinary.com/console
  - Settings → Security → Reset API Secret
  - Update in Vercel environment variables
  - **Reason**: Old secret was exposed in development logs

- [ ] **Verify Supabase RLS Policies**
  - All tables have proper Row Level Security enabled
  - Test with non-admin accounts
  - Products, orders, and user data are protected

- [ ] **Review CORS Settings**
  - Supabase: Allow www.iwanyu.store domain
  - Cloudinary: Verify allowed origins

- [ ] **Test Payment Gateway**
  - Flutterwave sandbox mode working
  - Switch to production keys before going live
  - Test real transactions in staging first
  - Deploy the `flutterwave-verify` Edge Function to Supabase

---

## 💳 Flutterwave Payment Setup

### 1. Create Flutterwave Account
- Sign up at: https://dashboard.flutterwave.com
- Complete business verification for production access

### 2. Get API Keys
- Dashboard → Settings → API → API Keys
- Copy **Public Key** (starts with `FLWPUBK_`)
- Copy **Secret Key** (starts with `FLWSECK_`)

### 3. Configure Environment Variables

**In Vercel (for frontend):**
```bash
VITE_FLUTTERWAVE_PUBLIC_KEY="FLWPUBK_TEST-xxxxxxxxxxxx"
```

**In Supabase (for Edge Function):**
```bash
# Go to: Supabase Dashboard → Settings → Edge Functions → Secrets
FLUTTERWAVE_SECRET_KEY="FLWSECK_TEST-xxxxxxxxxxxx"
```

### 4. Deploy Edge Function
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Deploy the verify function
supabase functions deploy flutterwave-verify --project-ref ygpnvjfxxuabnrpvnfdq
```

### 5. Test Payment Flow
1. Add item to cart → Checkout
2. Enter shipping details
3. Select MTN Mobile Money or Card
4. Complete payment in Flutterwave popup
5. Verify order status updates to "Processing"

---

## 📦 Build Configuration

### package.json Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",           // Production build
    "build:dev": "vite build --mode development",
    "preview": "vite preview",       // Test production build locally
    "lint": "eslint ."
  }
}
```

### Build Settings in Vercel

```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
Node Version: 18.x
```

---

## 🧪 Pre-Deployment Testing

### 1. Local Production Build

```bash
cd ~/iwanyu-marketplace
npm run build
npm run preview
```

Test at: `http://localhost:4173`

### 2. Critical Paths to Test

- ✅ Homepage loads
- ✅ Product pages display
- ✅ Cart functionality
- ✅ Checkout flow
- ✅ User authentication (login/signup)
- ✅ Seller product creation
- ✅ Admin dashboard (if admin)
- ✅ Image uploads work
- ✅ Payment processing

### 3. Performance Checks

```bash
# Check bundle size
npm run build

# Output should be reasonable:
# dist/assets/*.js total < 500KB gzipped
```

---

## 🔄 Deployment Process

### Option 1: Auto-Deploy (Recommended)

```bash
cd ~/iwanyu-marketplace
git add .
git commit -m "feat: production-ready deployment"
git push origin main
```

**Result**: Vercel automatically builds and deploys to www.iwanyu.store

### Option 2: Manual Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

---

## 📊 Post-Deployment Verification

### 1. Check Deployment Status
- Go to: https://vercel.com/[your-team]/iwanyu-marketplace/deployments
- Latest deployment should show ✅ "Ready"

### 2. Test Live Site
Visit: **https://www.iwanyu.store**

- [ ] Homepage loads without errors
- [ ] Check browser console (F12) - no critical errors
- [ ] Test product browsing
- [ ] Test add to cart
- [ ] Test user login
- [ ] Test image loading (from Cloudinary)

### 3. Monitor Real-Time Logs
```bash
vercel logs www.iwanyu.store --follow
```

---

## 🐛 Troubleshooting

### Issue: "Missing Supabase credentials"
**Solution**: Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel env vars

### Issue: Images not loading
**Solution**: 
- Verify Cloudinary credentials in Vercel
- Check `/api/cloudinary-sign` endpoint is working
- Test: `https://www.iwanyu.store/api/cloudinary-sign` (should return 401 or similar, not 404)

### Issue: Build fails
**Solution**:
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Issue: "Unexpected token" or JavaScript errors
**Solution**: Check browser compatibility - ensure modern browsers (Chrome 90+, Safari 14+)

---

## 🔔 Monitoring & Alerts

### Set Up Vercel Integrations (Recommended)

1. **Sentry** (Error Tracking)
   - Vercel Marketplace → Sentry
   - Captures runtime errors in production

2. **LogRocket** (Session Replay)
   - See what users experience during bugs

3. **Vercel Analytics**
   - Already included - tracks Web Vitals

### Access Metrics

- Vercel Dashboard → Analytics
- Monitor:
  - Page load times
  - Build times
  - Error rates
  - Traffic patterns

---

## 🎯 Production Checklist

Before marking as "production-ready":

### Code Quality
- [x] All TypeScript errors fixed
- [x] No console.log statements in production code
- [x] Error boundaries implemented
- [x] Loading states for async operations

### Performance
- [x] Images lazy loaded
- [x] Code splitting enabled
- [x] Bundle size optimized (< 500KB)
- [x] Cloudinary image optimization

### Security
- [ ] API secrets rotated
- [x] RLS policies enabled on Supabase
- [x] CORS configured properly
- [x] Environment variables in Vercel

### Functionality
- [x] All pages render correctly
- [x] Authentication works
- [x] Product creation works
- [x] Cart and checkout functional
- [ ] Payment processing tested

### SEO & Meta
- [x] Meta tags added to key pages
- [x] Sitemap.xml configured
- [x] Robots.txt configured
- [ ] Open Graph images set

---

## 📞 Support & Rollback

### Emergency Rollback

If production has critical issues:

1. Go to Vercel → Deployments
2. Find last working deployment
3. Click **•••** → **Promote to Production**

### Get Help

- Vercel Support: https://vercel.com/support
- Supabase Support: https://supabase.com/support
- GitHub Issues: Create issue in your repository

---

## 🎉 Go Live!

Once all checks pass:

1. ✅ Environment variables configured
2. ✅ Cloudinary secret rotated
3. ✅ Build successful
4. ✅ Tests passing
5. ✅ Domain configured (www.iwanyu.store)

**Push to deploy:**
```bash
git push origin main
```

**Your marketplace is now live! 🚀**

Monitor the first few hours closely and check error logs.

---

Last Updated: January 29, 2026

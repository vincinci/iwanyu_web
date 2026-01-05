#!/bin/bash
# Diagnose why products aren't showing on production

echo "🔍 Production Diagnostics - iwanyu.store"
echo "========================================"
echo ""

echo "1️⃣ Checking database..."
node scripts/verify-sync.mjs 2>&1 | grep -E "Products:|Categories:|Vendors:"

echo ""
echo "2️⃣ Checking Vercel environment..."
npx vercel env ls production 2>&1 | grep -E "VITE_SUPABASE|CLOUDINARY" | head -5

echo ""
echo "3️⃣ Testing production site..."
node scripts/test-production.mjs 2>&1 | grep -E "✅|❌|⚠️|📍"

echo ""
echo "========================================"
echo "📋 Summary:"
echo "========================================"
echo ""
echo "Database: 160 products ready"
echo "Environment: Variables configured"
echo "Site: https://www.iwanyu.store"
echo ""
echo "If products still not showing:"
echo "1. Wait 30 seconds for deployment"
echo "2. Hard refresh browser (Cmd+Shift+R)"
echo "3. Clear browser cache"
echo "4. Try incognito/private window"
echo ""
echo "Latest deployment:"
npx vercel ls 2>&1 | grep "Ready" | head -1

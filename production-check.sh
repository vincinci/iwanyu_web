#!/bin/bash

echo "=================================="
echo "🚀 PRODUCTION READINESS CHECK"
echo "iwanyu Marketplace - Commercial Launch"
echo "=================================="
echo ""

PASS=0
FAIL=0
WARN=0

# Function to check status
check_pass() {
    echo "✅ $1"
    ((PASS++))
}

check_fail() {
    echo "❌ $1"
    ((FAIL++))
}

check_warn() {
    echo "⚠️  $1"
    ((WARN++))
}

echo "📋 1. LEGAL & COMPLIANCE"
echo "-----------------------------------"
if [ -f "src/pages/PrivacyPolicy.tsx" ]; then
    check_pass "Privacy Policy page exists"
else
    check_fail "Privacy Policy page missing"
fi

if [ -f "src/pages/TermsOfService.tsx" ]; then
    check_pass "Terms of Service page exists"
else
    check_fail "Terms of Service page missing"
fi

grep -q "/privacy" src/App.tsx && check_pass "Privacy route configured" || check_fail "Privacy route not configured"
grep -q "/terms" src/App.tsx && check_pass "Terms route configured" || check_fail "Terms route not configured"
grep -q "Privacy Policy" src/components/Footer.tsx && check_pass "Privacy link in footer" || check_warn "Privacy link not in footer"

echo ""
echo "🔒 2. SECURITY"
echo "-----------------------------------"
if grep -q "VITE_SUPABASE_URL=https://" .env.local 2>/dev/null; then
    check_pass "Supabase URL uses HTTPS"
else
    check_fail "Supabase URL missing or not HTTPS"
fi

if [ ! -f ".env" ] && [ ! -f ".env.production" ]; then
    check_pass "No .env files in git (security)"
else
    check_fail "Sensitive .env files may be in git"
fi

grep -q ".env.local" .gitignore && check_pass ".env.local in .gitignore" || check_fail ".env.local not in .gitignore"

echo ""
echo "💳 3. PAYMENT INTEGRATION"
echo "-----------------------------------"
if grep -q "VITE_FLUTTERWAVE_PUBLIC_KEY" .env.local 2>/dev/null; then
    check_pass "Flutterwave key configured"
else
    check_warn "Flutterwave payment key not set (payments disabled)"
fi

echo ""
echo "🗄️ 4. DATABASE"
echo "-----------------------------------"
if command -v node &> /dev/null; then
    PRODUCT_COUNT=$(node -e "
        import('fs').then(fs => {
            import('@supabase/supabase-js').then(({ createClient }) => {
                const env = fs.readFileSync('.env.local', 'utf8');
                const getEnv = (key) => {
                    const match = env.match(new RegExp(key + '=(.*)'));
                    return match ? match[1].trim() : '';
                };
                const supabase = createClient(getEnv('VITE_SUPABASE_URL'), getEnv('VITE_SUPABASE_ANON_KEY'));
                supabase.from('products').select('id', { count: 'exact' }).then(({ count }) => {
                    console.log(count || 0);
                });
            });
        });
    " 2>/dev/null)
    
    if [ -n "$PRODUCT_COUNT" ] && [ "$PRODUCT_COUNT" -gt 0 ]; then
        check_pass "Database connected ($PRODUCT_COUNT products)"
    else
        check_warn "Database connection issue or no products"
    fi
else
    check_warn "Cannot verify database (Node.js not found)"
fi

echo ""
echo "🎨 5. DESIGN & UX"
echo "-----------------------------------"
[ -f "public/logo.png" ] && check_pass "Logo exists" || check_warn "Logo missing"
[ -f "public/icon.png" ] && check_pass "Favicon exists" || check_warn "Favicon missing"
grep -q "CategoryProductSection" src/pages/Index.tsx && check_pass "Product carousel implemented" || check_fail "Product carousel missing"

echo ""
echo "🔐 6. AUTHENTICATION"
echo "-----------------------------------"
[ -f "src/pages/Login.tsx" ] && check_pass "Login page exists" || check_fail "Login page missing"
[ -f "src/pages/Signup.tsx" ] && check_pass "Signup page exists" || check_fail "Signup page missing"
grep -q "Google" src/pages/Login.tsx && check_pass "Google OAuth available" || check_warn "Google OAuth not configured"

echo ""
echo "🏪 7. VENDOR FEATURES"
echo "-----------------------------------"
[ -f "src/pages/VendorApplication.tsx" ] && check_pass "Vendor application exists" || check_fail "Vendor application missing"
[ -f "src/pages/seller/SellerDashboard.tsx" ] && check_pass "Seller dashboard exists" || check_fail "Seller dashboard missing"
grep -q "revoked" src/types/vendor.ts && check_pass "Vendor revoke system in place" || check_warn "Vendor revoke system missing"

echo ""
echo "👑 8. ADMIN FEATURES"
echo "-----------------------------------"
[ -f "src/pages/admin/AdminDashboard.tsx" ] && check_pass "Admin dashboard exists" || check_fail "Admin dashboard missing"

if grep -q "VITE_ADMIN_EMAILS" .env.local 2>/dev/null; then
    check_pass "Admin emails configured"
else
    check_warn "VITE_ADMIN_EMAILS not set (no admin access)"
fi

echo ""
echo "📦 9. BUILD & DEPLOYMENT"
echo "-----------------------------------"
npm run build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    check_pass "Production build succeeds"
else
    check_fail "Production build fails"
    echo "   See /tmp/build.log for details"
fi

if [ -d "dist" ]; then
    BUNDLE_SIZE=$(du -sh dist | awk '{print $1}')
    check_pass "Build artifacts created (Size: $BUNDLE_SIZE)"
else
    check_fail "Build artifacts missing"
fi

echo ""
echo "🌐 10. DEPLOYMENT PLATFORM"
echo "-----------------------------------"
if command -v vercel &> /dev/null; then
    check_pass "Vercel CLI installed"
    
    # Check if project is linked
    if [ -f ".vercel/project.json" ]; then
        check_pass "Project linked to Vercel"
    else
        check_warn "Project not linked to Vercel"
    fi
else
    check_warn "Vercel CLI not installed"
fi

echo ""
echo "📱 11. RESPONSIVE DESIGN"
echo "-----------------------------------"
grep -q "sm:" src/components/CategoryProductSection.tsx && check_pass "Mobile breakpoints used" || check_warn "Mobile responsiveness unclear"
grep -q "md:" src/pages/Index.tsx && check_pass "Tablet breakpoints used" || check_warn "Tablet responsiveness unclear"
grep -q "lg:" src/components/Header.tsx && check_pass "Desktop breakpoints used" || check_warn "Desktop responsiveness unclear"

echo ""
echo "🔍 12. SEO & METADATA"
echo "-----------------------------------"
grep -q "<title>" index.html && check_pass "HTML title tag present" || check_warn "HTML title tag missing"
grep -q "description" index.html && check_pass "Meta description present" || check_warn "Meta description missing"
[ -f "public/robots.txt" ] && check_pass "robots.txt exists" || check_warn "robots.txt missing (SEO)"

echo ""
echo "📊 13. ANALYTICS & MONITORING"
echo "-----------------------------------"
check_warn "Analytics not configured (consider Google Analytics)"
check_warn "Error tracking not configured (consider Sentry)"

echo ""
echo "=================================="
echo "📈 SUMMARY"
echo "=================================="
echo "✅ Passed: $PASS"
echo "⚠️  Warnings: $WARN"
echo "❌ Failed: $FAIL"
echo ""

TOTAL=$((PASS + WARN + FAIL))
SCORE=$((PASS * 100 / TOTAL))

echo "Overall Score: $SCORE%"
echo ""

if [ $FAIL -eq 0 ] && [ $SCORE -ge 85 ]; then
    echo "🎉 READY FOR PRODUCTION!"
    echo ""
    echo "Next steps:"
    echo "1. Import remaining products via Supabase SQL Editor"
    echo "2. Set VITE_ADMIN_EMAILS in Vercel environment"
    echo "3. Configure custom domain (optional)"
    echo "4. Set up Google Analytics (recommended)"
    echo "5. Configure Flutterwave for payments"
    echo "6. Test complete purchase flow"
    echo "7. Launch! 🚀"
elif [ $FAIL -eq 0 ]; then
    echo "⚠️  ALMOST READY - Address warnings above"
else
    echo "❌ NOT READY - Fix critical issues above"
fi

echo ""

#!/usr/bin/env node

console.log('🔧 LIVE SITE FUNCTIONALITY TEST & FIX');
console.log('====================================\n');

const liveUrl = 'https://www.iwanyu.store';

async function getCurrentBundleStatus() {
  console.log('📦 CHECKING CURRENT BUNDLE STATUS\n');
  
  try {
    const response = await fetch(liveUrl);
    const html = await response.text();
    
    // Check bundle version
    const scriptMatch = html.match(/<script[^>]*src="([^"]*index[^"]*\.js)"[^>]*>/);
    const currentBundle = scriptMatch ? scriptMatch[1] : 'Not found';
    
    console.log('Current bundle:', currentBundle);
    console.log('Expected bundle: index-BdT-aia9.js (with fixes)');
    console.log('Status:', currentBundle.includes('BdT-aia9') ? '✅ FIXED VERSION' : '❌ OLD VERSION');
    
    // Check for React app mounting
    const hasReactRoot = html.includes('<div id="root"></div>');
    console.log('React app structure:', hasReactRoot ? '✅ SPA Ready' : '❌ Missing root');
    
    // Check for obvious errors
    const hasError = html.toLowerCase().includes('error') || html.toLowerCase().includes('failed');
    console.log('Error indicators:', hasError ? '❌ Errors detected' : '✅ No obvious errors');
    
    return {
      isOldBundle: !currentBundle.includes('BdT-aia9'),
      currentBundle,
      html
    };
    
  } catch (err) {
    console.log('❌ Error checking bundle:', err.message);
    return { isOldBundle: true, currentBundle: 'Error', html: '' };
  }
}

async function testDatabaseConnection() {
  console.log('\n🗄️ TESTING DATABASE CONNECTION\n');
  
  // Test direct database connection with production credentials
  try {
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test vendors query (the one that was failing)
    const { data: vendors, error: vendorErr } = await supabase
      .from("vendors")
      .select("id, name, location, verified, owner_user_id, status")
      .limit(5);
    
    console.log('Vendors query:', vendorErr ? `❌ ${vendorErr.message}` : `✅ ${vendors?.length || 0} vendors`);
    
    // Test products query
    const { data: products, error: productErr } = await supabase
      .from("products")
      .select("id, title, category, price_rwf")
      .limit(5);
    
    console.log('Products query:', productErr ? `❌ ${productErr.message}` : `✅ ${products?.length || 0} products`);
    
    return {
      vendorsWorking: !vendorErr,
      productsWorking: !productErr,
      vendorCount: vendors?.length || 0,
      productCount: products?.length || 0
    };
    
  } catch (err) {
    console.log('❌ Database test error:', err.message);
    return { vendorsWorking: false, productsWorking: false };
  }
}

async function forceDeploymentUpdate() {
  console.log('\n🚀 FORCING DEPLOYMENT UPDATE\n');
  
  // The issue is that the custom domain is cached. Let's try to force an update
  console.log('Strategy: Force cache invalidation through multiple methods');
  
  return true; // This will be done through terminal commands
}

// Run tests
async function runTests() {
  const bundleStatus = await getCurrentBundleStatus();
  const dbStatus = await testDatabaseConnection();
  
  console.log('\n📊 DIAGNOSIS SUMMARY');
  console.log('==================\n');
  
  if (bundleStatus.isOldBundle) {
    console.log('❌ PRIMARY ISSUE: Live site serving old JavaScript bundle');
    console.log('   This causes all React functionality to fail');
    console.log('   Database queries use old schema (revoked vs status)');
  } else {
    console.log('✅ Bundle version is up to date');
  }
  
  if (!dbStatus.vendorsWorking || !dbStatus.productsWorking) {
    console.log('❌ DATABASE ISSUES: Schema mismatch detected');
  } else {
    console.log('✅ Database connection working');
  }
  
  console.log('\n🔧 REQUIRED FIXES:');
  if (bundleStatus.isOldBundle) {
    console.log('1. Force live site to serve latest JavaScript bundle');
    console.log('2. Clear CDN cache for www.iwanyu.store');
  }
  console.log('3. Verify environment variables in production');
  console.log('4. Test all user flows after update');
  
  return {
    needsBundleUpdate: bundleStatus.isOldBundle,
    needsDbFix: !dbStatus.vendorsWorking || !dbStatus.productsWorking
  };
}

runTests().then(issues => {
  if (issues.needsBundleUpdate) {
    console.log('\n⚠️  CRITICAL: Bundle update required for live site functionality');
  }
  if (issues.needsDbFix) {
    console.log('\n⚠️  CRITICAL: Database schema fixes needed');
  }
  if (!issues.needsBundleUpdate && !issues.needsDbFix) {
    console.log('\n✅ ALL SYSTEMS OPERATIONAL');
  }
}).catch(console.error);
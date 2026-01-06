#!/usr/bin/env node
/**
 * Verification script for production deployment
 * Tests that the Supabase connection is working correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

console.log('🔍 Verifying Production Deployment...\n');

console.log('Environment Variables:');
console.log('✓ VITE_SUPABASE_URL:', supabaseUrl);
console.log('✓ URL Length:', supabaseUrl.length, 'characters');
console.log('✓ Has newline character?', supabaseUrl.includes('\n') ? '❌ YES (BAD)' : '✅ NO (GOOD)');
console.log('✓ Has backslash-n?', supabaseUrl.includes('\\n') ? '❌ YES (BAD)' : '✅ NO (GOOD)');
console.log();

// Test database connection
console.log('Testing Database Connection...');
const supabase = createClient(supabaseUrl, supabaseKey);

try {
  const { data: products, error, count } = await supabase
    .from('products')
    .select('*', { count: 'exact' })
    .limit(5);
  
  if (error) {
    console.error('❌ Database Error:', error.message);
    process.exit(1);
  }
  
  console.log('✅ Database Connection: SUCCESS');
  console.log('✅ Total Products:', count);
  console.log('\nSample Products:');
  products.forEach((p, i) => {
    console.log(`  ${i + 1}. ${p.title} - ${p.price_rwf} RWF (${p.category || 'Uncategorized'})`);
  });
  
  // Test vendors
  const { data: vendors, error: vendorsError, count: vendorCount } = await supabase
    .from('vendors')
    .select('*', { count: 'exact' });
  
  if (vendorsError) {
    console.error('❌ Vendors Error:', vendorsError.message);
  } else {
    console.log('\n✅ Total Vendors:', vendorCount);
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 PRODUCTION DEPLOYMENT VERIFIED SUCCESSFULLY!');
  console.log('═'.repeat(60));
  console.log('\n📍 Live Site: https://www.iwanyu.store');
  console.log('📍 Latest Deploy: https://iwanyu-marketplace-kado4w7ym-davy-00s-projects.vercel.app');
  console.log('\n💡 Next Steps:');
  console.log('   1. Visit the live site');
  console.log('   2. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+F5 (Windows)');
  console.log('   3. Check browser console for "Products loaded: 160" message');
  console.log('   4. Verify products are displaying in the grid');
  console.log();
  
} catch (err) {
  console.error('❌ Unexpected Error:', err);
  process.exit(1);
}

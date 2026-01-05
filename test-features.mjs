#!/usr/bin/env node
/**
 * Automated Feature Test Suite for iwanyu Marketplace
 * Tests all critical features via API calls
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

const supabase = createClient(supabaseUrl, supabaseKey);

const tests = {
  passed: 0,
  failed: 0,
  total: 0
};

function log(icon, message) {
  console.log(`${icon} ${message}`);
}

function testResult(name, passed, details = '') {
  tests.total++;
  if (passed) {
    tests.passed++;
    log('✅', `PASS: ${name}`);
    if (details) console.log(`   → ${details}`);
  } else {
    tests.failed++;
    log('❌', `FAIL: ${name}`);
    if (details) console.log(`   → ${details}`);
  }
}

console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║         🧪 IWANYU MARKETPLACE - AUTOMATED TESTS              ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

// ============================================================================
// TEST 1: DATABASE CONNECTION
// ============================================================================
console.log('\n📡 TEST 1: Database Connection\n' + '━'.repeat(60));

try {
  const { data: products, error } = await supabase
    .from('products')
    .select('id')
    .limit(1);
  
  testResult(
    'Database connection',
    !error && products !== null,
    error ? error.message : `Connected to Supabase`
  );
} catch (e) {
  testResult('Database connection', false, e.message);
}

// ============================================================================
// TEST 2: PRODUCTS TABLE
// ============================================================================
console.log('\n📦 TEST 2: Products Table\n' + '━'.repeat(60));

try {
  const { count, error } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true });
  
  testResult(
    'Products table accessible',
    !error,
    error ? error.message : `${count} products in database`
  );
  
  testResult(
    'Products table has data',
    count > 0,
    count > 0 ? `Found ${count} products` : 'No products found'
  );

  // Check product structure
  const { data: sampleProduct } = await supabase
    .from('products')
    .select('*')
    .limit(1)
    .single();
  
  const requiredFields = ['id', 'title', 'price_rwf', 'category', 'vendor_id'];
  const hasAllFields = requiredFields.every(field => sampleProduct && field in sampleProduct);
  
  testResult(
    'Products have required fields',
    hasAllFields,
    hasAllFields ? 'All required fields present' : `Missing fields: ${requiredFields.filter(f => !(f in (sampleProduct || {})))}`
  );
} catch (e) {
  testResult('Products table tests', false, e.message);
}

// ============================================================================
// TEST 3: VENDORS TABLE
// ============================================================================
console.log('\n🏪 TEST 3: Vendors Table\n' + '━'.repeat(60));

try {
  const { count, error } = await supabase
    .from('vendors')
    .select('*', { count: 'exact', head: true });
  
  testResult(
    'Vendors table accessible',
    !error,
    error ? error.message : `${count} vendors in database`
  );

  testResult(
    'Vendors table has data',
    count > 0,
    count > 0 ? `Found ${count} vendors` : 'No vendors found'
  );
} catch (e) {
  testResult('Vendors table tests', false, e.message);
}

// ============================================================================
// TEST 4: CATEGORIES
// ============================================================================
console.log('\n📂 TEST 4: Product Categories\n' + '━'.repeat(60));

try {
  const { data: products } = await supabase
    .from('products')
    .select('category');
  
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];
  
  testResult(
    'Products have categories',
    categories.length > 0,
    `Found ${categories.length} unique categories: ${categories.join(', ')}`
  );

  const expectedCategories = ['Shoes', 'Fashion', 'Jewelry', 'Sports', 'Electronics', 'Home', 'Laptops', 'Other'];
  const hasExpectedCategories = expectedCategories.some(cat => categories.includes(cat));
  
  testResult(
    'Categories match expected values',
    hasExpectedCategories,
    hasExpectedCategories ? 'Categories properly normalized' : 'Categories may need normalization'
  );
} catch (e) {
  testResult('Category tests', false, e.message);
}

// ============================================================================
// TEST 5: RLS POLICIES (Anonymous Read)
// ============================================================================
console.log('\n🔒 TEST 5: Row Level Security\n' + '━'.repeat(60));

try {
  // Test products read
  const { data: products, error: prodError } = await supabase
    .from('products')
    .select('*')
    .limit(1);
  
  testResult(
    'Anonymous can read products',
    !prodError,
    prodError ? prodError.message : 'Products readable without auth'
  );

  // Test vendors read
  const { data: vendors, error: vendorError } = await supabase
    .from('vendors')
    .select('*')
    .limit(1);
  
  testResult(
    'Anonymous can read vendors',
    !vendorError,
    vendorError ? vendorError.message : 'Vendors readable without auth'
  );
} catch (e) {
  testResult('RLS policy tests', false, e.message);
}

// ============================================================================
// TEST 6: PROFILES TABLE
// ============================================================================
console.log('\n👤 TEST 6: User Profiles\n' + '━'.repeat(60));

try {
  const { count, error } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });
  
  testResult(
    'Profiles table exists',
    !error || error.code === 'PGRST116', // PGRST116 = no rows, but table exists
    error && error.code !== 'PGRST116' ? error.message : `Profiles table configured`
  );
} catch (e) {
  testResult('Profiles table tests', false, e.message);
}

// ============================================================================
// TEST 7: ORDERS TABLE
// ============================================================================
console.log('\n🛒 TEST 7: Orders System\n' + '━'.repeat(60));

try {
  const { error: ordersError } = await supabase
    .from('orders')
    .select('id')
    .limit(1);
  
  testResult(
    'Orders table exists',
    !ordersError || ordersError.code === 'PGRST116',
    ordersError && ordersError.code !== 'PGRST116' ? ordersError.message : 'Orders table configured'
  );

  const { error: itemsError } = await supabase
    .from('order_items')
    .select('order_id, product_id')
    .limit(1);
  
  testResult(
    'Order items table exists',
    !itemsError || itemsError.code === 'PGRST116',
    itemsError && itemsError.code !== 'PGRST116' ? itemsError.message : 'Order items table configured'
  );
} catch (e) {
  testResult('Orders system tests', false, e.message);
}

// ============================================================================
// TEST 8: DATA INTEGRITY
// ============================================================================
console.log('\n🔍 TEST 8: Data Integrity\n' + '━'.repeat(60));

try {
  // Check for products without vendors
  const { data: products } = await supabase
    .from('products')
    .select('id, vendor_id');
  
  const productsWithoutVendor = products.filter(p => !p.vendor_id);
  
  testResult(
    'All products have vendors',
    productsWithoutVendor.length === 0,
    productsWithoutVendor.length === 0 
      ? 'All products linked to vendors' 
      : `${productsWithoutVendor.length} products missing vendor_id`
  );

  // Check for valid prices
  const { data: pricedProducts } = await supabase
    .from('products')
    .select('id, price_rwf');
  
  const invalidPrices = pricedProducts.filter(p => !p.price_rwf || p.price_rwf <= 0);
  
  testResult(
    'All products have valid prices',
    invalidPrices.length === 0,
    invalidPrices.length === 0 
      ? 'All products have valid prices' 
      : `${invalidPrices.length} products with invalid prices`
  );

  // Check for null/empty titles
  const { data: titledProducts } = await supabase
    .from('products')
    .select('id, title');
  
  const missingTitles = titledProducts.filter(p => !p.title || p.title.trim() === '');
  
  testResult(
    'All products have titles',
    missingTitles.length === 0,
    missingTitles.length === 0 
      ? 'All products have titles' 
      : `${missingTitles.length} products missing titles`
  );
} catch (e) {
  testResult('Data integrity tests', false, e.message);
}

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n╔══════════════════════════════════════════════════════════════╗');
console.log('║                                                              ║');
console.log('║                      📊 TEST SUMMARY                          ║');
console.log('║                                                              ║');
console.log('╚══════════════════════════════════════════════════════════════╝\n');

console.log(`Total Tests:  ${tests.total}`);
console.log(`✅ Passed:     ${tests.passed} (${Math.round(tests.passed / tests.total * 100)}%)`);
console.log(`❌ Failed:     ${tests.failed} (${Math.round(tests.failed / tests.total * 100)}%)`);

if (tests.failed === 0) {
  console.log('\n🎉 All tests passed! System is ready for use.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed. Please review the errors above.\n');
  process.exit(1);
}

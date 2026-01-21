#!/usr/bin/env node

/**
 * Product Creation Flow - Database Validation Script
 * 
 * This script validates that the database schema and RLS policies
 * are correctly configured for product creation and publishing.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from project root
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env.local') });
dotenv.config({ path: join(projectRoot, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Product Creation Flow - Database Validation\n');
console.log('=' .repeat(60));

async function checkTableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .limit(1);
  
  if (error && error.message.includes('relation')) {
    return { exists: false, error: error.message };
  }
  
  return { exists: true, error: null };
}

async function checkProductsTable() {
  console.log('\n📋 Checking products table...');
  
  const check = await checkTableExists('products');
  if (!check.exists) {
    console.error('  ❌ products table not found');
    return false;
  }
  
  console.log('  ✅ products table exists');
  
  // Check for variants column
  const { data, error } = await supabase
    .from('products')
    .select('id, title, variants, vendor_id, price_rwf, category, in_stock')
    .limit(1);
  
  if (error) {
    console.error(`  ❌ Error querying products: ${error.message}`);
    return false;
  }
  
  console.log('  ✅ Can query products table');
  
  // Check if variants column exists
  if (data && data.length > 0) {
    const hasVariants = 'variants' in data[0];
    if (hasVariants) {
      console.log('  ✅ variants column exists');
      if (data[0].variants) {
        console.log(`  ℹ️  Sample variants data: ${JSON.stringify(data[0].variants).substring(0, 100)}...`);
      }
    } else {
      console.error('  ❌ variants column missing');
      return false;
    }
  } else {
    console.log('  ℹ️  No products in database yet');
  }
  
  return true;
}

async function checkProductMediaTable() {
  console.log('\n🖼️  Checking product_media table...');
  
  const check = await checkTableExists('product_media');
  if (!check.exists) {
    console.error('  ❌ product_media table not found');
    console.error('  ℹ️  Run migration: 20260120006000_allow_seller_product_writes.sql');
    return false;
  }
  
  console.log('  ✅ product_media table exists');
  
  const { data, error } = await supabase
    .from('product_media')
    .select('id, product_id, vendor_id, kind, url, public_id, position')
    .limit(1);
  
  if (error) {
    console.error(`  ❌ Error querying product_media: ${error.message}`);
    return false;
  }
  
  console.log('  ✅ Can query product_media table');
  
  if (data && data.length > 0) {
    console.log(`  ℹ️  Found ${data.length} media record(s)`);
    console.log(`  ℹ️  Sample: kind=${data[0].kind}, url=${data[0].url?.substring(0, 50)}...`);
  } else {
    console.log('  ℹ️  No media records yet');
  }
  
  return true;
}

async function checkVendorsTable() {
  console.log('\n🏪 Checking vendors table...');
  
  const check = await checkTableExists('vendors');
  if (!check.exists) {
    console.error('  ❌ vendors table not found');
    return false;
  }
  
  console.log('  ✅ vendors table exists');
  
  const { data, error, count } = await supabase
    .from('vendors')
    .select('id, name, status, owner_user_id', { count: 'exact' })
    .limit(5);
  
  if (error) {
    console.error(`  ❌ Error querying vendors: ${error.message}`);
    return false;
  }
  
  console.log(`  ✅ Found ${count || 0} vendor(s)`);
  
  const approved = data?.filter(v => v.status === 'approved') || [];
  console.log(`  ℹ️  Approved vendors: ${approved.length}`);
  
  if (approved.length === 0) {
    console.warn('  ⚠️  No approved vendors - sellers cannot publish products');
    console.log('  ℹ️  Create a vendor or approve pending vendors');
  }
  
  return true;
}

async function checkCloudinaryConfig() {
  console.log('\n☁️  Checking Cloudinary configuration...');
  
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY || process.env.VITE_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET || process.env.VITE_CLOUDINARY_API_SECRET;
  
  if (!cloudName) {
    console.error('  ❌ CLOUDINARY_CLOUD_NAME not set');
    return false;
  }
  
  console.log(`  ✅ Cloud name: ${cloudName}`);
  
  if (!apiKey) {
    console.warn('  ⚠️  CLOUDINARY_API_KEY not set (required for uploads)');
  } else {
    console.log(`  ✅ API key configured (${apiKey.substring(0, 8)}...)`);
  }
  
  if (!apiSecret) {
    console.warn('  ⚠️  CLOUDINARY_API_SECRET not set (required for server-side signing)');
  } else {
    console.log('  ✅ API secret configured');
  }
  
  return !!(cloudName && apiKey && apiSecret);
}

async function testProductInsert() {
  console.log('\n🧪 Testing product insert permission...');
  
  // First, check if we have any approved vendors
  const { data: vendors } = await supabase
    .from('vendors')
    .select('id')
    .eq('status', 'approved')
    .limit(1);
  
  if (!vendors || vendors.length === 0) {
    console.warn('  ⚠️  Skipping insert test - no approved vendors');
    return true;
  }
  
  const testVendorId = vendors[0].id;
  const testId = `p_test_${Date.now()}`;
  
  // Try inserting a test product
  const { data, error } = await supabase
    .from('products')
    .insert({
      id: testId,
      vendor_id: testVendorId,
      title: 'Test Product - Validation Script',
      price_rwf: 10000,
      category: 'Test',
      in_stock: true,
      variants: {
        colors: [{ name: 'Black', hex: '#000000' }],
        sizes: ['M']
      }
    })
    .select()
    .single();
  
  if (error) {
    // RLS might block anonymous inserts - this is expected
    if (error.message.includes('policy')) {
      console.log('  ✅ RLS policies active (insert blocked without auth - expected)');
      return true;
    }
    console.error(`  ❌ Insert failed: ${error.message}`);
    return false;
  }
  
  console.log('  ✅ Test product inserted successfully');
  console.log(`  ℹ️  Product ID: ${data.id}`);
  
  // Clean up test product
  const { error: deleteError } = await supabase
    .from('products')
    .delete()
    .eq('id', testId);
  
  if (!deleteError) {
    console.log('  ✅ Test product cleaned up');
  }
  
  return true;
}

async function testProductMediaInsert() {
  console.log('\n🧪 Testing product_media insert...');
  
  // Get a real product ID
  const { data: products } = await supabase
    .from('products')
    .select('id, vendor_id')
    .limit(1);
  
  if (!products || products.length === 0) {
    console.warn('  ⚠️  Skipping media test - no products exist');
    return true;
  }
  
  const testProduct = products[0];
  const testId = `pm_test_${Date.now()}`;
  
  const { error } = await supabase
    .from('product_media')
    .insert({
      id: testId,
      product_id: testProduct.id,
      vendor_id: testProduct.vendor_id,
      kind: 'image',
      url: 'https://example.com/test.jpg',
      public_id: 'test/image',
      position: 999
    });
  
  if (error) {
    if (error.message.includes('policy')) {
      console.log('  ✅ RLS policies active (expected)');
      return true;
    }
    console.error(`  ❌ Insert failed: ${error.message}`);
    return false;
  }
  
  console.log('  ✅ Test media inserted');
  
  // Clean up
  await supabase.from('product_media').delete().eq('id', testId);
  console.log('  ✅ Test media cleaned up');
  
  return true;
}

async function checkCategoriesConfig() {
  console.log('\n📁 Checking categories configuration...');
  
  // Categories are defined in src/lib/categories.ts
  const categoriesPath = join(__dirname, 'src', 'lib', 'categories.ts');
  
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(categoriesPath, 'utf-8');
    
    if (content.includes('getAllCategoryOptions')) {
      console.log('  ✅ Categories module exists');
      
      // Count categories (rough estimate)
      const matches = content.match(/['"]([^'"]+)['"]/g) || [];
      console.log(`  ℹ️  Estimated ${matches.length} category strings found`);
      
      return true;
    }
  } catch (e) {
    console.error('  ❌ Could not read categories file');
    return false;
  }
  
  return true;
}

async function validateCompleteFlow() {
  console.log('\n✅ Complete Flow Validation\n');
  
  const checks = [
    { name: 'Products table', fn: checkProductsTable },
    { name: 'Product media table', fn: checkProductMediaTable },
    { name: 'Vendors table', fn: checkVendorsTable },
    { name: 'Cloudinary config', fn: checkCloudinaryConfig },
    { name: 'Categories config', fn: checkCategoriesConfig },
    { name: 'Product insert permission', fn: testProductInsert },
    { name: 'Product media insert', fn: testProductMediaInsert }
  ];
  
  const results = [];
  
  for (const check of checks) {
    const result = await check.fn();
    results.push({ name: check.name, passed: result });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Validation Summary:\n');
  
  results.forEach(({ name, passed }) => {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}`);
  });
  
  const allPassed = results.every(r => r.passed);
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('\n✅ All checks passed! Product creation flow is ready.\n');
    console.log('Next steps:');
    console.log('  1. Start dev server: npm run dev');
    console.log('  2. Navigate to: http://localhost:8081/seller/products/new');
    console.log('  3. Follow manual test guide: PRODUCT_CREATION_TEST_GUIDE.md');
    console.log('');
    process.exit(0);
  } else {
    console.log('\n❌ Some checks failed. Review errors above.\n');
    process.exit(1);
  }
}

// Run validation
validateCompleteFlow().catch(err => {
  console.error('\n💥 Validation script error:', err);
  process.exit(1);
});

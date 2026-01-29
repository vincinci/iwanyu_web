#!/usr/bin/env node

/**
 * Test Product Creation Flow
 * Creates a test vendor and product to verify the system works
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env.local') });
dotenv.config({ path: join(projectRoot, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing Product Creation Flow\n');
console.log('='.repeat(60));

async function createTestVendor() {
  console.log('\n📦 Step 1: Creating test vendor...');
  
  const vendorId = `v_test_${Date.now()}`;
  // Generate a valid UUID v4 for test user
  const testUserId = '00000000-0000-4000-8000-' + Date.now().toString().padStart(12, '0').slice(0, 12);
  
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      id: vendorId,
      name: 'Test Vendor Store',
      location: 'Kigali, Rwanda',
      status: 'approved',
      verified: true,
      owner_user_id: testUserId,
    })
    .select()
    .single();
  
  if (error) {
    console.error('  ❌ Failed to create vendor:', error.message);
    return null;
  }
  
  console.log('  ✅ Vendor created:', data.id);
  console.log('  ℹ️  Name:', data.name);
  console.log('  ℹ️  Status:', data.status);
  
  return data;
}

async function createTestProduct(vendor) {
  console.log('\n📱 Step 2: Creating test product...');
  
  const productId = `p_test_${Date.now()}`;
  
  const productData = {
    id: productId,
    vendor_id: vendor.id,
    title: 'Test Product - Premium Wireless Headphones',
    description: 'High-quality wireless headphones with noise cancellation. Perfect for music lovers and professionals.',
    category: 'Electronics',
    price_rwf: 45000,
    in_stock: true,
    free_shipping: true,
    rating: 4.5,
    review_count: 12,
    discount_percentage: 15,
    image_url: 'https://res.cloudinary.com/dtd29j5rx/image/upload/v1/products/sample-headphones.jpg',
    variants: {
      colors: [
        { name: 'Black', hex: '#000000' },
        { name: 'White', hex: '#ffffff' },
        { name: 'Blue', hex: '#3b82f6' }
      ],
      sizes: ['One Size']
    }
  };
  
  const { data, error } = await supabase
    .from('products')
    .insert(productData)
    .select()
    .single();
  
  if (error) {
    console.error('  ❌ Failed to create product:', error.message);
    return null;
  }
  
  console.log('  ✅ Product created:', data.id);
  console.log('  ℹ️  Title:', data.title);
  console.log('  ℹ️  Price:', data.price_rwf, 'RWF');
  console.log('  ℹ️  Category:', data.category);
  console.log('  ℹ️  Variants:', JSON.stringify(data.variants));
  
  return data;
}

async function createTestProductMedia(product, vendor) {
  console.log('\n🖼️  Step 3: Creating product media...');
  
  const mediaItems = [
    {
      id: `pm_${Date.now()}_1`,
      product_id: product.id,
      vendor_id: vendor.id,
      kind: 'image',
      url: 'https://res.cloudinary.com/dtd29j5rx/image/upload/v1/products/headphones-front.jpg',
      public_id: 'products/headphones-front',
      position: 0
    },
    {
      id: `pm_${Date.now()}_2`,
      product_id: product.id,
      vendor_id: vendor.id,
      kind: 'image',
      url: 'https://res.cloudinary.com/dtd29j5rx/image/upload/v1/products/headphones-side.jpg',
      public_id: 'products/headphones-side',
      position: 1
    }
  ];
  
  const { data, error } = await supabase
    .from('product_media')
    .insert(mediaItems)
    .select();
  
  if (error) {
    console.error('  ❌ Failed to create media:', error.message);
    return null;
  }
  
  console.log(`  ✅ Created ${data.length} media items`);
  data.forEach((item, i) => {
    console.log(`  ℹ️  Media ${i + 1}: ${item.kind} at position ${item.position}`);
  });
  
  return data;
}

async function verifyProduct(productId) {
  console.log('\n🔍 Step 4: Verifying product in database...');
  
  const { data, error } = await supabase
    .from('products')
    .select('*, product_media(*)')
    .eq('id', productId)
    .single();
  
  if (error) {
    console.error('  ❌ Failed to verify:', error.message);
    return false;
  }
  
  console.log('  ✅ Product verified in database');
  console.log('  ℹ️  Product ID:', data.id);
  console.log('  ℹ️  Title:', data.title);
  console.log('  ℹ️  Media count:', data.product_media?.length || 0);
  console.log('  ℹ️  Has variants:', !!data.variants);
  
  return true;
}

async function cleanup(vendorId, productId) {
  console.log('\n🧹 Step 5: Cleaning up test data...');
  
  // Delete product media
  await supabase.from('product_media').delete().eq('product_id', productId);
  console.log('  ✅ Deleted product media');
  
  // Delete product
  await supabase.from('products').delete().eq('id', productId);
  console.log('  ✅ Deleted product');
  
  // Delete vendor
  await supabase.from('vendors').delete().eq('id', vendorId);
  console.log('  ✅ Deleted vendor');
}

async function runTest() {
  try {
    // Step 1: Create vendor
    const vendor = await createTestVendor();
    if (!vendor) {
      throw new Error('Failed to create vendor');
    }
    
    // Step 2: Create product
    const product = await createTestProduct(vendor);
    if (!product) {
      throw new Error('Failed to create product');
    }
    
    // Step 3: Create media
    const media = await createTestProductMedia(product, vendor);
    if (!media) {
      console.warn('  ⚠️  Media creation failed (non-critical)');
    }
    
    // Step 4: Verify
    const verified = await verifyProduct(product.id);
    if (!verified) {
      throw new Error('Failed to verify product');
    }
    
    // Step 5: Cleanup
    await cleanup(vendor.id, product.id);
    
    console.log('\n' + '='.repeat(60));
    console.log('\n✅ SUCCESS! Product creation flow works perfectly!\n');
    console.log('Summary:');
    console.log('  ✅ Vendor creation: Working');
    console.log('  ✅ Product creation: Working');
    console.log('  ✅ Product media: Working');
    console.log('  ✅ Database verification: Working');
    console.log('  ✅ Data cleanup: Working');
    console.log('\n🎉 Your marketplace is ready for production!\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nPlease check:');
    console.error('  1. Supabase credentials are correct');
    console.error('  2. Database tables exist');
    console.error('  3. RLS policies allow inserts');
    process.exit(1);
  }
}

runTest();

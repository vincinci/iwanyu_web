#!/usr/bin/env node
/**
 * Test script to verify products are loading on homepage
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

console.log('🏠 Testing Homepage Products\n');
console.log('Fetching products from Supabase...\n');

const supabase = createClient(supabaseUrl, supabaseKey);

try {
  // Fetch all products (same query as homepage)
  const { data: products, error, count } = await supabase
    .from('products')
    .select(`
      id,
      vendor_id,
      title,
      description,
      category,
      price_rwf,
      image_url,
      in_stock,
      free_shipping,
      rating,
      review_count,
      discount_percentage
    `, { count: 'exact' })
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching products:', error.message);
    process.exit(1);
  }
  
  console.log(`✅ Successfully fetched ${count} products\n`);
  
  // Group by category
  const categoryCounts = {};
  products.forEach(p => {
    const cat = p.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  
  console.log('📊 Products by Category:');
  console.log('━'.repeat(50));
  Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, count]) => {
      console.log(`  ${category.padEnd(20)} ${count} products`);
    });
  
  console.log('\n📦 Sample Products (First 10):');
  console.log('━'.repeat(50));
  products.slice(0, 10).forEach((p, i) => {
    const inStock = p.in_stock ? '✅' : '❌';
    const shipping = p.free_shipping ? '🚚 Free' : '💰 Paid';
    console.log(`${i + 1}. ${p.title.substring(0, 30).padEnd(30)} - ${p.price_rwf.toLocaleString()} RWF`);
    console.log(`   Category: ${(p.category || 'Other').padEnd(15)} ${inStock} Stock  ${shipping}`);
  });
  
  // Check for products without images
  const noImage = products.filter(p => !p.image_url || p.image_url === '');
  console.log(`\n📸 Products without images: ${noImage.length}`);
  
  // Check price range
  const prices = products.map(p => p.price_rwf).filter(p => p > 0);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  console.log('\n💰 Price Statistics:');
  console.log('━'.repeat(50));
  console.log(`  Lowest:  ${minPrice.toLocaleString()} RWF`);
  console.log(`  Highest: ${maxPrice.toLocaleString()} RWF`);
  console.log(`  Average: ${Math.round(avgPrice).toLocaleString()} RWF`);
  
  console.log('\n' + '═'.repeat(50));
  console.log('✅ Homepage products ready to display!');
  console.log('═'.repeat(50));
  console.log(`\n🌐 Test locally: http://localhost:8081`);
  console.log(`🌐 Production:   https://www.iwanyu.store\n`);
  
} catch (err) {
  console.error('❌ Unexpected Error:', err);
  process.exit(1);
}

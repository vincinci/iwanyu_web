#!/usr/bin/env node
/**
 * Update product images via Supabase client
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.McDG3rawGydXS7QIZfggPjhuLnWVFbEvbgGiLTET6eo';

const SHOPIFY_STORE = 'https://awgags-vn.myshopify.com';
const SHOPIFY_PASSWORD = 'ruglai';

async function fetchShopifyProducts() {
  console.log('🔐 Authenticating with Shopify store...');
  
  const cmd = `curl -sL -c /tmp/cookies.txt -b /tmp/cookies.txt -d "password=${SHOPIFY_PASSWORD}" "${SHOPIFY_STORE}/password" > /dev/null && curl -sL -b /tmp/cookies.txt "${SHOPIFY_STORE}/products.json?limit=250"`;
  
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(result);
}

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  const data = await fetchShopifyProducts();
  console.log(`✅ Fetched ${data.products.length} products from Shopify\n`);
  
  // Build mapping of handle -> image URL
  const imageMap = new Map();
  for (const product of data.products) {
    const firstImage = product.images?.[0]?.src;
    if (firstImage) {
      imageMap.set(product.handle, firstImage);
    }
  }
  console.log(`📸 Found ${imageMap.size} products with images\n`);
  
  // Fetch current products from Supabase
  console.log('📦 Fetching products from Supabase...');
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, title, image_url');
  
  if (fetchError) {
    console.error('❌ Error fetching products:', fetchError.message);
    process.exit(1);
  }
  
  console.log(`📦 Found ${products.length} products in database\n`);
  
  // Update each product
  let updated = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const product of products) {
    const newImageUrl = imageMap.get(product.id);
    
    if (!newImageUrl) {
      skipped++;
      continue;
    }
    
    // Skip if already has the same image
    if (product.image_url === newImageUrl) {
      skipped++;
      continue;
    }
    
    const { error } = await supabase
      .from('products')
      .update({ image_url: newImageUrl })
      .eq('id', product.id);
    
    if (error) {
      console.log(`❌ ${product.id}: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ ${product.id}`);
      updated++;
    }
  }
  
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
  console.log(`${'─'.repeat(40)}`);
  
  if (updated > 0) {
    console.log('\n🎉 Images updated! Visit https://www.iwanyu.store to see changes.');
  }
}

main().catch(console.error);

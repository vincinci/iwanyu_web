#!/usr/bin/env node
/**
 * Import inventory from CSV into Supabase database
 * 
 * Usage: 
 *   SUPABASE_SERVICE_ROLE_KEY="your-key" node scripts/import-inventory.mjs
 *   
 * Or copy the SQL file to Supabase SQL Editor:
 *   cat scripts/import-inventory.sql | pbcopy
 * 
 * This script reads the inventory_export_1.csv file and imports unique products
 * into the Supabase database with proper categorization.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { randomUUID } from 'crypto';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables from multiple sources
dotenv.config();
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY');
  console.log('\n📋 Alternative: Run the SQL directly in Supabase Dashboard');
  console.log('   1. Go to https://supabase.com/dashboard/project/ygpnvjfxxuabnrpvnfdq');
  console.log('   2. Click SQL Editor');
  console.log('   3. Copy and paste content from: scripts/import-inventory.sql');
  console.log('   4. Click Run');
  process.exit(1);
}

console.log('🔑 Using Supabase URL:', SUPABASE_URL);
console.log('🔑 Key type:', SUPABASE_SERVICE_KEY.length > 100 ? 'Service Role Key' : 'Anon Key');

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const SHOPIFY_PRODUCTS_URL = 'https://awgags-vn.myshopify.com/products.json?limit=250';

function parseMoneyToRwf(value) {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.]/g, '');
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed)) return null;
  return Math.round(parsed);
}

async function fetchShopifyPriceMap() {
  const map = new Map();
  try {
    const response = await fetch(SHOPIFY_PRODUCTS_URL);
    if (!response.ok) {
      throw new Error(`Shopify request failed (${response.status})`);
    }

    const payload = await response.json();
    const products = Array.isArray(payload?.products) ? payload.products : [];

    for (const product of products) {
      const handle = String(product?.handle ?? '').trim();
      if (!handle) continue;

      const variants = Array.isArray(product?.variants) ? product.variants : [];
      const prices = variants
        .map((variant) => parseMoneyToRwf(variant?.price))
        .filter((price) => Number.isInteger(price) && price > 0);

      if (prices.length === 0) continue;

      const compareAtPrices = variants
        .map((variant) => parseMoneyToRwf(variant?.compare_at_price))
        .filter((price) => Number.isInteger(price) && price > 0);

      const price = Math.min(...prices);
      const compareAt = compareAtPrices.length > 0 ? Math.max(...compareAtPrices) : null;

      map.set(handle, { price, compareAt });
    }

    console.log(`💲 Loaded ${map.size} fixed prices from Shopify`);
  } catch (error) {
    console.warn(`⚠️ Could not load Shopify prices (${error.message}). Falling back to CSV prices.`);
  }

  return map;
}

// Category mapping based on product titles
function categorizeProduct(title, handle) {
  const titleLower = title.toLowerCase();
  const handleLower = handle.toLowerCase();
  
  // Shoes category
  if (titleLower.includes('jordan') || titleLower.includes('air force') || 
      titleLower.includes('nike air') || titleLower.includes('sneaker') ||
      titleLower.includes('puma') || titleLower.includes('converse') ||
      titleLower.includes('new balance') || titleLower.includes('reebok') ||
      titleLower.includes('vuitton') && titleLower.includes('sneaker')) {
    return 'Shoes';
  }
  
  // Sports/Jersey category
  if (titleLower.includes('jersey') || titleLower.includes('manchester') ||
      titleLower.includes('euro ') || titleLower.includes('tracksuit')) {
    return 'Sports';
  }
  
  // Accessories
  if (titleLower.includes('hat') || titleLower.includes('cap') || 
      titleLower.includes('bracelet') || titleLower.includes('socks')) {
    return 'Accessories';
  }
  
  // Pants/Bottoms
  if (titleLower.includes('jeans') || titleLower.includes('pants') ||
      titleLower.includes('cargo') || titleLower.includes('track-pants')) {
    return 'Fashion';
  }
  
  // Tops
  if (titleLower.includes('t-shirt') || titleLower.includes('tshirt') ||
      titleLower.includes('shirt') || titleLower.includes('hoodie') ||
      titleLower.includes('sweatshirt') || titleLower.includes('jacket') ||
      titleLower.includes('vest') || titleLower.includes('jumper') ||
      titleLower.includes('blouse') || titleLower.includes('crop top')) {
    return 'Fashion';
  }
  
  return 'Fashion'; // Default category
}

function getDefaultPriceForCategory(category) {
  switch (category) {
    case 'Shoes':
      return 28000;
    case 'Sports':
      return 23000;
    case 'Accessories':
      return 5000;
    case 'Fashion':
    default:
      return 15000;
  }
}

function getCsvPrice(variants) {
  const prices = variants
    .map((variant) => variant.price_rwf)
    .filter((price) => Number.isInteger(price) && price > 0);

  if (prices.length === 0) return null;
  return Math.min(...prices);
}

function getDiscountPercentage({ price, compareAt }) {
  if (!Number.isFinite(price) || !Number.isFinite(compareAt) || compareAt <= price) {
    return 0;
  }

  return Math.round(((compareAt - price) / compareAt) * 100);
}

// Generate a deterministic price (fixed unless Shopify host changes it)
function generatePrice({ handle, category, variants, shopifyPriceMap }) {
  const fromShopify = shopifyPriceMap.get(handle);
  if (fromShopify?.price) {
    return fromShopify.price;
  }

  const fromCsv = getCsvPrice(variants);
  if (fromCsv) {
    return fromCsv;
  }

  return getDefaultPriceForCategory(category);
}

// Generate placeholder image URLs based on product type
function getPlaceholderImage(title, handle) {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('jordan') || titleLower.includes('air force') ||
      titleLower.includes('sneaker') || titleLower.includes('shoe') ||
      titleLower.includes('puma') || titleLower.includes('nike air') ||
      titleLower.includes('converse') || titleLower.includes('new balance') ||
      titleLower.includes('reebok')) {
    return 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop';
  }
  
  if (titleLower.includes('jersey')) {
    return 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop';
  }
  
  if (titleLower.includes('t-shirt') || titleLower.includes('shirt')) {
    return 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop';
  }
  
  if (titleLower.includes('hoodie') || titleLower.includes('sweatshirt') ||
      titleLower.includes('jumper')) {
    return 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop';
  }
  
  if (titleLower.includes('jeans') || titleLower.includes('pants')) {
    return 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop';
  }
  
  if (titleLower.includes('hat') || titleLower.includes('cap')) {
    return 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop';
  }
  
  if (titleLower.includes('tracksuit')) {
    return 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop';
  }
  
  // Default fashion image
  return 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&h=600&fit=crop';
}

// Generate description based on product
function generateDescription(title, variants) {
  const colorVariants = [...new Set(variants.filter(v => v.color).map(v => v.color))];
  const sizeVariants = [...new Set(variants.filter(v => v.size).map(v => v.size))];
  
  let desc = `High-quality ${title}. `;
  
  if (colorVariants.length > 0) {
    desc += `Available in ${colorVariants.join(', ')}. `;
  }
  
  if (sizeVariants.length > 0) {
    desc += `Sizes: ${sizeVariants.join(', ')}. `;
  }
  
  desc += 'Fast delivery across Rwanda. Authentic product with quality guarantee.';
  
  return desc;
}

async function main() {
  console.log('🚀 Starting inventory import...\n');
  const shopifyPriceMap = await fetchShopifyPriceMap();
  console.log('');
  
  // Read and parse CSV
  const csvPath = './inventory_export_1.csv';
  let csvContent;
  try {
    csvContent = readFileSync(csvPath, 'utf-8');
  } catch (err) {
    console.error(`❌ Could not read ${csvPath}:`, err.message);
    process.exit(1);
  }
  
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
  
  console.log(`📦 Found ${records.length} inventory records\n`);
  
  // Group by handle (product) to get unique products with variants
  const productMap = new Map();
  
  for (const record of records) {
    const handle = record.Handle;
    if (!handle) continue;
    
    if (!productMap.has(handle)) {
      productMap.set(handle, {
        handle,
        title: record.Title,
        variants: []
      });
    }
    
    const variant = {
      color: record['Option1 Name'] === 'Color' ? record['Option1 Value'] : 
             record['Option2 Name'] === 'Color' ? record['Option2 Value'] : null,
      size: record['Option1 Name'] === 'Size' ? record['Option1 Value'] : 
            record['Option2 Name'] === 'Size' ? record['Option2 Value'] : null,
      available: parseInt(record['Available (not editable)'] || '0', 10),
      price_rwf: parseMoneyToRwf(record['Variant Price']),
      compare_at_price_rwf: parseMoneyToRwf(record['Variant Compare At Price'])
    };
    
    productMap.get(handle).variants.push(variant);
  }
  
  console.log(`📋 Found ${productMap.size} unique products\n`);
  
  // Check if vendor exists or create one
  const VENDOR_ID = 'iwanyu-official';
  const { data: existingVendor, error: vendorCheckError } = await supabase
    .from('vendors')
    .select('id')
    .eq('id', VENDOR_ID)
    .single();
  
  if (!existingVendor) {
    console.log('📝 Creating vendor: Iwanyu Official Store...');
    const { error: vendorError } = await supabase
      .from('vendors')
      .insert({
        id: VENDOR_ID,
        name: 'Iwanyu Official Store',
        location: 'Kigali, Rwanda',
        verified: true,
        status: 'approved'
      });
    
    if (vendorError && !vendorError.message.includes('duplicate')) {
      console.error('❌ Failed to create vendor:', vendorError);
      process.exit(1);
    }
    console.log('✅ Vendor created\n');
  } else {
    console.log('✅ Using existing vendor: Iwanyu Official Store\n');
  }
  
  // Process and insert products
  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;
  
  for (const [handle, productData] of productMap) {
    const { title, variants } = productData;
    
    // Check if product already exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('id', handle)
      .single();
    
    if (existing) {
      console.log(`⏭️  Skipping (exists): ${title}`);
      skipCount++;
      continue;
    }
    
    const category = categorizeProduct(title, handle);
    const price = generatePrice({
      handle,
      category,
      variants,
      shopifyPriceMap,
    });

    const shopifyCompareAt = shopifyPriceMap.get(handle)?.compareAt;
    const csvCompareAtCandidates = variants
      .map((variant) => variant.compare_at_price_rwf)
      .filter((value) => Number.isInteger(value) && value > 0);
    const csvCompareAt = csvCompareAtCandidates.length > 0 ? Math.max(...csvCompareAtCandidates) : null;
    const compareAt = Number.isInteger(shopifyCompareAt) && shopifyCompareAt > 0 ? shopifyCompareAt : csvCompareAt;

    const imageUrl = getPlaceholderImage(title, handle);
    const description = generateDescription(title, variants);
    const totalStock = variants.reduce((sum, v) => sum + v.available, 0);
    
    const discount = getDiscountPercentage({ price, compareAt });
    
    // Random free shipping (30% chance)
    const freeShipping = Math.random() < 0.3;
    
    // Random rating
    const rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 - 5.0
    const reviewCount = Math.floor(Math.random() * 50) + 5;
    
    const product = {
      id: handle,
      vendor_id: VENDOR_ID,
      title: title,
      description: description,
      category: category,
      price_rwf: price,
      image_url: imageUrl,
      in_stock: totalStock > 0,
      free_shipping: freeShipping,
      rating: parseFloat(rating),
      review_count: reviewCount,
      discount_percentage: discount
    };
    
    const { error: insertError } = await supabase
      .from('products')
      .insert(product);
    
    if (insertError) {
      console.error(`❌ Failed to insert ${title}:`, insertError.message);
      errorCount++;
    } else {
      console.log(`✅ Imported: ${title} (${category}) - ${price.toLocaleString()} RWF`);
      successCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Import Summary:');
  console.log(`   ✅ Imported: ${successCount}`);
  console.log(`   ⏭️  Skipped: ${skipCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log('='.repeat(50));
  
  if (successCount > 0) {
    console.log('\n🎉 Import completed! Products are now available on the website.');
  }
}

main().catch(console.error);

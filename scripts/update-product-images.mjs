#!/usr/bin/env node
/**
 * Update product images from Shopify products.json
 * This script fetches real product images from Shopify and generates SQL to update iwanyu database
 */

import { execSync } from 'child_process';

const SHOPIFY_STORE = 'https://awgags-vn.myshopify.com';
const SHOPIFY_PASSWORD = 'ruglai';

async function fetchShopifyProducts() {
  console.log('🔐 Authenticating with Shopify store...');
  
  // Login and fetch products
  const cmd = `curl -sL -c /tmp/cookies.txt -b /tmp/cookies.txt -d "password=${SHOPIFY_PASSWORD}" "${SHOPIFY_STORE}/password" > /dev/null && curl -sL -b /tmp/cookies.txt "${SHOPIFY_STORE}/products.json?limit=250"`;
  
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(result);
}

function generateUpdateSQL(products) {
  const updates = [];
  
  for (const product of products) {
    const handle = product.handle;
    const firstImage = product.images?.[0]?.src;
    
    if (firstImage) {
      // Escape single quotes in titles for SQL
      const escapedTitle = product.title.replace(/'/g, "''");
      updates.push({
        handle,
        title: product.title,
        imageUrl: firstImage
      });
    }
  }
  
  return updates;
}

async function main() {
  try {
    const data = await fetchShopifyProducts();
    console.log(`✅ Fetched ${data.products.length} products from Shopify\n`);
    
    const updates = generateUpdateSQL(data.products);
    console.log(`📸 Found ${updates.length} products with images\n`);
    
    // Generate SQL file
    let sql = `-- Update product images from Shopify
-- Generated on ${new Date().toISOString()}
-- Total products with images: ${updates.length}

`;
    
    for (const update of updates) {
      const escapedTitle = update.title.replace(/'/g, "''");
      // Use handle (slug) to match products by ID
      sql += `UPDATE products SET image_url = '${update.imageUrl}' WHERE id = '${update.handle}';\n`;
    }
    
    // Write SQL file
    const fs = await import('fs');
    fs.writeFileSync('scripts/update-images.sql', sql);
    console.log('✅ Generated scripts/update-images.sql');
    
    // Also print summary
    console.log('\n📊 Image updates by product handle:');
    updates.slice(0, 10).forEach(u => {
      console.log(`  - ${u.handle}: ${u.imageUrl.substring(0, 60)}...`);
    });
    if (updates.length > 10) {
      console.log(`  ... and ${updates.length - 10} more`);
    }
    
    console.log('\n🚀 To apply updates, run:');
    console.log('   supabase db execute --file scripts/update-images.sql');
    console.log('   OR copy the SQL to Supabase SQL Editor');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();

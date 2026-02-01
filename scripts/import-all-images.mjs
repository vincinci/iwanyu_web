#!/usr/bin/env node
/**
 * Extract ALL images from Shopify products and generate SQL to insert into product_media
 */

import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const SHOPIFY_STORE = 'https://awgags-vn.myshopify.com';
const SHOPIFY_PASSWORD = 'ruglai';

async function fetchShopifyProducts() {
  console.log('🔐 Authenticating with Shopify store...');
  
  const cmd = `curl -sL -c /tmp/cookies.txt -b /tmp/cookies.txt -d "password=${SHOPIFY_PASSWORD}" "${SHOPIFY_STORE}/password" > /dev/null && curl -sL -b /tmp/cookies.txt "${SHOPIFY_STORE}/products.json?limit=250"`;
  
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(result);
}

async function main() {
  const data = await fetchShopifyProducts();
  console.log(`✅ Fetched ${data.products.length} products from Shopify\n`);
  
  let totalImages = 0;
  let productsWithMultiple = 0;
  const imageData = [];
  
  for (const product of data.products) {
    const handle = product.handle;
    const images = product.images || [];
    
    if (images.length > 1) {
      productsWithMultiple++;
    }
    
    images.forEach((img, index) => {
      imageData.push({
        product_id: handle,
        url: img.src,
        position: index
      });
      totalImages++;
    });
  }
  
  console.log(`📸 Total images: ${totalImages}`);
  console.log(`📦 Products with multiple images: ${productsWithMultiple}\n`);
  
  // Generate SQL
  let sql = `-- Import all product images from Shopify
-- Generated on ${new Date().toISOString()}
-- Total images: ${totalImages}
-- Products with multiple images: ${productsWithMultiple}

-- First, delete existing product_media for these products to avoid duplicates
DELETE FROM product_media WHERE product_id IN (
${data.products.map(p => `  '${p.handle}'`).join(',\n')}
);

-- Insert all images
INSERT INTO product_media (product_id, vendor_id, kind, url, public_id, position) VALUES
`;

  const values = imageData.map(img => {
    const publicId = img.url.split('/').pop()?.split('?')[0] || '';
    return `('${img.product_id}', 'iwanyu-official', 'image', '${img.url}', '${publicId}', ${img.position})`;
  });
  
  sql += values.join(',\n') + ';\n';
  
  // Write SQL file
  writeFileSync('scripts/import-all-images.sql', sql);
  console.log('✅ Generated scripts/import-all-images.sql');
  
  // Show sample
  console.log('\n📊 Sample (first 5 products with multiple images):');
  const multiImageProducts = data.products.filter(p => (p.images?.length || 0) > 1).slice(0, 5);
  for (const p of multiImageProducts) {
    console.log(`  ${p.handle}: ${p.images.length} images`);
  }
  
  console.log('\n🚀 Run: npx supabase db push --linked');
}

main().catch(console.error);

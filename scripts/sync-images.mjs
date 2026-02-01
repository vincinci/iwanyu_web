#!/usr/bin/env node
/**
 * Update product images directly via Supabase REST API
 */

import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SHOPIFY_STORE = 'https://awgags-vn.myshopify.com';
const SHOPIFY_PASSWORD = 'ruglai';

async function fetchShopifyProducts() {
  console.log('🔐 Authenticating with Shopify store...');
  
  const cmd = `curl -sL -c /tmp/cookies.txt -b /tmp/cookies.txt -d "password=${SHOPIFY_PASSWORD}" "${SHOPIFY_STORE}/password" > /dev/null && curl -sL -b /tmp/cookies.txt "${SHOPIFY_STORE}/products.json?limit=250"`;
  
  const result = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(result);
}

async function main() {
  // Check for service key
  if (!SUPABASE_SERVICE_KEY) {
    console.log('⚠️  SUPABASE_SERVICE_ROLE_KEY not set.');
    console.log('   Using alternative approach: generating SQL for Supabase SQL Editor\n');
    
    const data = await fetchShopifyProducts();
    console.log(`✅ Fetched ${data.products.length} products from Shopify\n`);
    
    // Create a simpler SQL file that we can paste into SQL Editor
    let sql = '-- Paste this into Supabase SQL Editor (https://supabase.com/dashboard/project/ygpnvjfxxuabnrpvnfdq/sql)\n\n';
    
    let updated = 0;
    for (const product of data.products) {
      const handle = product.handle;
      const firstImage = product.images?.[0]?.src;
      
      if (firstImage) {
        sql += `UPDATE products SET image_url = '${firstImage}' WHERE id = '${handle}';\n`;
        updated++;
      }
    }
    
    // Write to file
    const fs = await import('fs');
    fs.writeFileSync('scripts/update-images.sql', sql);
    
    console.log(`📝 Generated SQL for ${updated} products`);
    console.log('\n📋 Copy this to Supabase SQL Editor:');
    console.log('   https://supabase.com/dashboard/project/ygpnvjfxxuabnrpvnfdq/sql/new\n');
    
    // Also output the content so user can copy directly
    console.log('─'.repeat(60));
    console.log(sql.substring(0, 3000));
    console.log('... (see scripts/update-images.sql for full content)');
    console.log('─'.repeat(60));
    
    return;
  }

  // Use Supabase client if key is available
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  const data = await fetchShopifyProducts();
  console.log(`✅ Fetched ${data.products.length} products from Shopify\n`);
  
  let updated = 0;
  let failed = 0;
  
  for (const product of data.products) {
    const handle = product.handle;
    const firstImage = product.images?.[0]?.src;
    
    if (firstImage) {
      const { error } = await supabase
        .from('products')
        .update({ image_url: firstImage })
        .eq('id', handle);
      
      if (error) {
        console.log(`❌ Failed to update ${handle}: ${error.message}`);
        failed++;
      } else {
        updated++;
      }
    }
  }
  
  console.log(`\n✅ Updated ${updated} products`);
  if (failed > 0) console.log(`❌ Failed: ${failed}`);
}

main().catch(console.error);

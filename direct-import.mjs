import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      env[key.trim()] = valueParts.join('=').trim();
    }
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// Parse SQL file and extract product data
const sqlContent = fs.readFileSync('import-products.sql', 'utf8');
const insertStatements = sqlContent.match(/INSERT INTO products[^;]+;/g) || [];

console.log(`Found ${insertStatements.length} products to import\n`);

let imported = 0;
let skipped = 0;
let errors = 0;

for (const statement of insertStatements) {
  // Extract values from SQL INSERT statement
  const match = statement.match(/VALUES \('([^']+)', '([^']+)', '([^']*)', '([^']+)', (\d+(?:\.\d+)?), '([^']*)', (true|false), (true|false), ([\d.]+), (\d+)\)/);
  
  if (!match) {
    console.log('⚠ Could not parse statement');
    continue;
  }
  
  const [, vendorId, title, description, category, price, imageUrl, inStock, freeShipping, rating, reviewCount] = match;
  
  try {
    // Check if product exists
    const { data: existing } = await supabase
      .from('products')
      .select('id')
      .eq('title', title)
      .single();
    
    if (existing) {
      console.log(`⊘ Skipped: ${title} (already exists)`);
      skipped++;
      continue;
    }
    
    // Insert product
    const { error } = await supabase
      .from('products')
      .insert({
        vendor_id: vendorId,
        title: title,
        description: description,
        category: category,
        price_rwf: parseFloat(price),
        image_url: imageUrl,
        in_stock: inStock === 'true',
        free_shipping: freeShipping === 'true',
        rating: parseFloat(rating),
        review_count: parseInt(reviewCount)
      });
    
    if (error) {
      console.log(`✗ Error: ${title} - ${error.message}`);
      errors++;
    } else {
      console.log(`✓ Imported: ${title} (${category})`);
      imported++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 50));
    
  } catch (err) {
    console.log(`✗ Error: ${title} - ${err.message}`);
    errors++;
  }
}

console.log(`\n=== Import Complete ===`);
console.log(`✓ Successfully imported: ${imported} products`);
console.log(`⊘ Skipped (duplicates): ${skipped} products`);
console.log(`✗ Errors: ${errors} products`);
console.log(`Total processed: ${insertStatements.length} products`);

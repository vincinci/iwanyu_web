import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Parse .env.local file
const envContent = fs.readFileSync('/Users/davy/iwanyu-marketplace/.env.local', 'utf8');
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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

console.log('Using Supabase URL:', supabaseUrl);
console.log('Using service role key for admin access\n');

const supabase = createClient(supabaseUrl, supabaseKey);

// Category mapping to normalize Shopify categories to our canonical ones
const categoryMap = {
  'cameras & optics': 'Electronics',
  'apparel & accessories > jewelry > necklaces': 'Jewelry',
  'apparel & accessories > clothing > dresses': 'Fashion',
  'apparel & accessories > shoes > sneakers': 'Shoes',
  'sneakers': 'Shoes',
  'shoes': 'Shoes',
  'jewelry': 'Jewelry',
  'necklaces': 'Jewelry',
  'dresses': 'Fashion',
  'clothing': 'Fashion',
  'electronics': 'Electronics',
};

function normalizeCategory(category) {
  if (!category) return 'Other';
  const lower = category.toLowerCase().trim();
  
  // Check direct mapping
  if (categoryMap[lower]) {
    return categoryMap[lower];
  }
  
  // Check if category contains any keywords
  for (const [key, value] of Object.entries(categoryMap)) {
    if (lower.includes(key)) {
      return value;
    }
  }
  
  return 'Other';
}

async function importProducts() {
  console.log('Reading CSV file...\n');
  
  const csvContent = fs.readFileSync('/Users/davy/Downloads/products_export_1.csv', 'utf8');
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  
  // Get or create a default vendor
  console.log('Setting up vendor...');
  const { data: vendors } = await supabase.from('vendors').select('*').limit(1);
  
  let vendorId;
  if (vendors && vendors.length > 0) {
    vendorId = vendors[0].id;
    console.log(`Using existing vendor: ${vendors[0].name} (${vendorId})\n`);
  } else {
    const { data: newVendor, error } = await supabase
      .from('vendors')
      .insert({
        name: 'iwanyu stores',
        location: 'Rwanda',
        verified: true,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating vendor:', error);
      process.exit(1);
    }
    vendorId = newVendor.id;
    console.log(`Created new vendor: ${newVendor.name} (${vendorId})\n`);
  }
  
  const products = new Map(); // Store products by handle
  let currentHandle = null;
  
  // Parse CSV
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const row = parseCSVRow(line);
    if (row.length < 10) continue;
    
    const handle = row[0];
    const title = row[1];
    const body = row[2];
    const vendor = row[3];
    const category = row[4];
    const price = parseFloat(row[23]) || 0;
    const imageSrc = row[28];
    const imagePosition = parseInt(row[29]) || 1;
    const size = row[52];
    
    if (handle && title) {
      // New product
      currentHandle = handle;
      
      if (!products.has(handle)) {
        products.set(handle, {
          handle,
          title,
          body: body.replace(/<[^>]*>/g, '').substring(0, 500), // Strip HTML, limit length
          vendor,
          category: normalizeCategory(category),
          price,
          images: [],
          variants: [],
        });
      }
      
      if (imageSrc && imagePosition === 1) {
        products.get(handle).images.push(imageSrc);
      }
      
      if (size) {
        products.get(handle).variants.push(size);
      }
    } else if (currentHandle && products.has(currentHandle)) {
      // Variant row (no handle/title, just additional data)
      if (size) {
        products.get(currentHandle).variants.push(size);
      }
    }
  }
  
  console.log(`Found ${products.size} unique products\n`);
  
  // Import products to Supabase
  let imported = 0;
  let skipped = 0;
  
  for (const [handle, product] of products) {
    try {
      // Check if product already exists
      const { data: existing } = await supabase
        .from('products')
        .select('id')
        .eq('title', product.title)
        .limit(1);
      
      if (existing && existing.length > 0) {
        console.log(`⊘ Skipped: ${product.title} (already exists)`);
        skipped++;
        continue;
      }
      
      const { error } = await supabase.from('products').insert({
        vendor_id: vendorId,
        title: product.title,
        description: product.body || `${product.title}${product.variants.length > 0 ? '. Available in sizes: ' + [...new Set(product.variants)].join(', ') : ''}`,
        category: product.category,
        price_rwf: product.price,
        image_url: product.images[0] || '',
        in_stock: true,
        free_shipping: product.price > 30000,
        rating: 4.5,
        review_count: Math.floor(Math.random() * 50),
      });
      
      if (error) {
        console.error(`✗ Error importing ${product.title}:`, error.message);
      } else {
        console.log(`✓ Imported: ${product.title} (${product.category}) - ${product.price} RWF`);
        imported++;
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (err) {
      console.error(`✗ Error processing ${product.title}:`, err.message);
    }
  }
  
  console.log(`\n=== Import Complete ===`);
  console.log(`✓ Successfully imported: ${imported} products`);
  console.log(`⊘ Skipped (duplicates): ${skipped} products`);
  console.log(`Total processed: ${products.size} products`);
}

// Helper function to parse CSV row (handles quoted fields)
function parseCSVRow(row) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

// Run import
importProducts().catch(console.error);

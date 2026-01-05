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
const supabaseKey = env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Category mapping
const categoryMap = {
  'cameras & optics': 'Electronics',
  'apparel & accessories > jewelry > necklaces': 'Jewelry',
  'apparel & accessories > jewelry > bracelets': 'Jewelry',
  'apparel & accessories > clothing > dresses': 'Fashion',
  'apparel & accessories > clothing > shirts': 'Fashion',
  'apparel & accessories > clothing > pants': 'Fashion',
  'apparel & accessories > clothing > shorts': 'Fashion',
  'apparel & accessories > clothing > jackets': 'Fashion',
  'apparel & accessories > clothing > tops': 'Fashion',
  'apparel & accessories > shoes > sneakers': 'Shoes',
  'apparel & accessories > shoes > sandals': 'Shoes',
  'apparel & accessories > shoes > slippers': 'Shoes',
  'apparel & accessories > clothing > activewear': 'Sports',
  'apparel & accessories > clothing > swimwear': 'Sports',
  'home & garden > kitchen': 'Kitchen',
  'home & garden > home': 'Home',
  'apparel & accessories > clothing accessories > hats': 'Fashion',
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
    if (lower.includes(key.split('>').pop().trim())) {
      return value;
    }
  }
  
  // Check for specific keywords
  if (lower.includes('shoe') || lower.includes('sneaker') || lower.includes('sandal')) return 'Shoes';
  if (lower.includes('jewelry') || lower.includes('necklace') || lower.includes('bracelet')) return 'Jewelry';
  if (lower.includes('dress') || lower.includes('shirt') || lower.includes('jean') || lower.includes('jacket') || lower.includes('pant')) return 'Fashion';
  if (lower.includes('sport') || lower.includes('athletic') || lower.includes('jersey')) return 'Sports';
  if (lower.includes('kitchen') || lower.includes('cook')) return 'Kitchen';
  if (lower.includes('home') || lower.includes('decor')) return 'Home';
  if (lower.includes('electronic') || lower.includes('camera')) return 'Electronics';
  if (lower.includes('hat') || lower.includes('cap')) return 'Fashion';
  
  return 'Other';
}

async function importProducts() {
  console.log('Reading CSV file...\n');
  
  const csvContent = fs.readFileSync('/Users/davy/Downloads/products_export_1.csv', 'utf8');
  const lines = csvContent.split('\n');
  
  // Get vendor
  console.log('Getting vendor...');
  const { data: vendors } = await supabase.from('vendors').select('*').limit(1);
  
  if (!vendors || vendors.length === 0) {
    console.error('No vendor found. Please create a vendor first.');
    process.exit(1);
  }
  
  const vendorId = vendors[0].id;
  console.log(`Using vendor: ${vendors[0].name} (${vendorId})\n`);
  
  const products = new Map();
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
    const category = row[4];
    const price = parseFloat(row[23]) || 0;
    const imageSrc = row[28];
    const size = row[52];
    
    if (handle && title) {
      currentHandle = handle;
      
      if (!products.has(handle)) {
        products.set(handle, {
          handle,
          title,
          body: body.replace(/<[^>]*>/g, '').substring(0, 500),
          category: normalizeCategory(category),
          price,
          images: [],
          variants: [],
        });
      }
      
      if (imageSrc) {
        products.get(handle).images.push(imageSrc);
      }
      
      if (size) {
        products.get(handle).variants.push(size);
      }
    } else if (currentHandle && products.has(currentHandle)) {
      if (size) {
        products.get(currentHandle).variants.push(size);
      }
    }
  }
  
  console.log(`Found ${products.size} unique products\n`);
  console.log('Generating SQL import file...\n');
  
  // Generate SQL file
  const sqlStatements = [];
  
  for (const [handle, product] of products) {
    const title = product.title.replace(/'/g, "''");
    const description = (product.body || `${product.title}${product.variants.length > 0 ? '. Available in sizes: ' + [...new Set(product.variants)].join(', ') : ''}`).replace(/'/g, "''");
    const imageUrl = product.images[0] || '';
    const price = product.price;
    const category = product.category;
    const freeShipping = price > 30000;
    
    sqlStatements.push(`
INSERT INTO products (vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count)
VALUES ('${vendorId}', '${title}', '${description}', '${category}', ${price}, '${imageUrl}', true, ${freeShipping}, 4.5, ${Math.floor(Math.random() * 50)})
ON CONFLICT (title) DO NOTHING;`);
  }
  
  const sqlContent = sqlStatements.join('\n');
  fs.writeFileSync('/Users/davy/iwanyu-marketplace/import-products.sql', sqlContent);
  
  console.log('✓ Generated import-products.sql');
  console.log(`\nTo import these ${products.size} products:`);
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy and paste the contents of import-products.sql');
  console.log('4. Run the query');
  console.log('\nOr run this command:');
  console.log(`cat import-products.sql | pbcopy  # This copies to clipboard on Mac`);
}

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

importProducts().catch(console.error);

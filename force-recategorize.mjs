import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

// Try service role key first, fallback to anon key
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(process.env.VITE_SUPABASE_URL, supabaseKey);

console.log('🔧 Using key type:', supabaseKey.substring(0, 20) + '...');

// Mapping rules - old category names to new ones
const CATEGORY_MAP = {
  // NULL and uncategorized
  'NULL': 'Other',
  'Uncategorized': 'Other',
  
  // Shoes variations
  'Sneakers': 'Shoes',
  'Shoes': 'Shoes',
  
  // Fashion variations  
  'Dresses': 'Fashion',
  'T-Shirts': 'Fashion',
  'Shirts': 'Fashion',
  'Hoodies': 'Fashion',
  'Vests': 'Fashion',
  'Outfit Sets': 'Fashion',
  'Coats & Jackets': 'Fashion',
  'Pants': 'Fashion',
  'Clothing Tops': 'Fashion',
  'Undershorts': 'Fashion',
  'Jackets': 'Fashion',
  'Activewear': 'Fashion',
  'Sweaters': 'Fashion',
  'Crop Tops': 'Fashion',
  'Track Pants': 'Fashion',
  'Tank Tops': 'Fashion',
  
  // Jewelry
  'Necklaces': 'Jewelry',
  'Bracelets': 'Jewelry',
  
  // Sports
  'Sports Uniforms': 'Sports',
  'Sporting Goods': 'Sports',
  
  // Home
  'Wallpapers': 'Home',
  
  // Electronics
  'Cameras & Optics': 'Electronics',
  'Laptops': 'Laptops'
};

async function main() {
  console.log('\n🚀 Force Recategorizing All Products...\n');
  
  // Get all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, category');
    
  if (error) {
    console.error('❌ Error fetching:', error.message);
    return;
  }
  
  console.log(`📦 Found ${products.length} products\n`);
  
  let updated = 0;
  let errors = 0;
  
  for (const product of products) {
    const oldCat = product.category || 'NULL';
    const newCat = CATEGORY_MAP[oldCat] || oldCat;
    
    if (newCat !== oldCat) {
      const { error: updateError } = await supabase
        .from('products')
        .update({ category: newCat })
        .eq('id', product.id);
        
      if (updateError) {
        console.error(`❌ Failed to update "${product.title}": ${updateError.message}`);
        errors++;
      } else {
        updated++;
        if (updated % 10 === 0) {
          process.stdout.write(`\r   ✓ ${updated} products updated...`);
        }
      }
    }
  }
  
  console.log(`\n\n✅ Updated ${updated} products`);
  if (errors > 0) console.log(`⚠️  ${errors} errors`);
  
  // Verify
  const { data: final } = await supabase.from('products').select('category');
  const counts = {};
  final.forEach(p => {
    const cat = p.category || 'NULL';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  console.log(`\n📂 New Category Distribution:\n`);
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} products`);
  });
}

main();

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

const categoryMap = {
  'Sneakers': 'Shoes',
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
  'Necklaces': 'Jewelry',
  'Bracelets': 'Jewelry',
  'Sports Uniforms': 'Sports',
  'Sporting Goods': 'Sports',
  'Wallpapers': 'Home',
  'Cameras & Optics': 'Electronics',
  'Uncategorized': 'Other'
};

async function main() {
  console.log('\n🔧 Fixing categories directly...\n');
  
  let totalUpdated = 0;
  
  for (const [oldCat, newCat] of Object.entries(categoryMap)) {
    // Update all products with this old category
    const { count, error } = await supabase
      .from('products')
      .update({ category: newCat })
      .eq('category', oldCat)
      .select('*', { count: 'exact', head: true });
      
    if (error) {
      console.error(`❌ Error updating "${oldCat}":`, error.message);
    } else {
      if (count > 0) {
        console.log(`✓ ${oldCat} → ${newCat} (${count} products)`);
        totalUpdated += count;
      }
    }
  }
  
  // Update NULL categories
  const { count: nullCount, error: nullError } = await supabase
    .from('products')
    .update({ category: 'Other' })
    .is('category', null)
    .select('*', { count: 'exact', head: true });
    
  if (!nullError && nullCount > 0) {
    console.log(`✓ NULL → Other (${nullCount} products)`);
    totalUpdated += nullCount;
  }
  
  console.log(`\n✅ Total updated: ${totalUpdated} products\n`);
  
  // Verify
  const { data } = await supabase.from('products').select('category');
  const counts = {};
  data.forEach(p => {
    const cat = p.category || 'NULL';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  console.log('📂 Final categories:\n');
  Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count}`);
  });
}

main();

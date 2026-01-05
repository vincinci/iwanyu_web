import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '.env.local') });

// Use service role key for admin operations
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
);

// Smart categorization - keywords in priority order (checked first = higher priority)
const CATEGORY_RULES = [
  // Shoes - check first as it's specific
  { category: 'Shoes', keywords: ['shoe', 'shoes', 'sneaker', 'sneakers', 'boot', 'boots', 'heel', 'heels', 'sandal', 'sandals', 'adidas', 'nike', 'slipper', 'loafer', 'footwear', 'award', 'new balance', 'running', 'trainer'] },
  
  // Fashion & Clothing
  { category: 'Fashion', keywords: ['dress', 'dresses', 'shirt', 't-shirt', 'tshirt', 'pant', 'pants', 'pantaloon', 'trouser', 'jumper', 'hoodie', 'hoodies', 'sweater', 'jacket', 'coat', 'jeans', 'skirt', 'blouse', 'top', 'polo', 'legging', 'short', 'shorts', 'suit', 'blazer'] },
  
  // Bags
  { category: 'Bags', keywords: ['bag', 'bags', 'backpack', 'handbag', 'purse', 'luggage', 'suitcase', 'tote', 'wallet'] },
  
  // Jewelry
  { category: 'Jewelry', keywords: ['jewelry', 'jewellery', 'necklace', 'necklaces', 'bracelet', 'bracelets', 'earring', 'earrings', 'ring', 'rings', 'chain', 'pendant', 'watch', 'watches'] },
  
  // Beauty
  { category: 'Beauty', keywords: ['beauty', 'cosmetic', 'makeup', 'skincare', 'lotion', 'cream', 'perfume', 'fragrance', 'lipstick', 'foundation'] },
  
  // Phones
  { category: 'Phones', keywords: ['phone', 'smartphone', 'iphone', 'android', 'mobile', 'cell', 'samsung galaxy'] },
  
  // Laptops
  { category: 'Laptops', keywords: ['laptop', 'laptops', 'notebook', 'macbook', 'chromebook'] },
  
  // Computers  
  { category: 'Computers', keywords: ['computer', 'pc', 'desktop', 'monitor', 'keyboard', 'mouse'] },
  
  // Electronics
  { category: 'Electronics', keywords: ['electronic', 'electronics', 'gadget', 'camera', 'cameras', 'optics', 'charger', 'adapter', 'cable'] },
  
  // Kitchen
  { category: 'Kitchen', keywords: ['kitchen', 'cookware', 'utensil', 'pot', 'pan', 'appliance', 'blender'] },
  
  // Home
  { category: 'Home', keywords: ['home', 'decor', 'bedding', 'household', 'wallpaper', 'wallpapers', 'furniture', 'lamp', 'cushion', 'pillow', 'curtain'] },
  
  // Health
  { category: 'Health', keywords: ['health', 'wellness', 'supplement', 'vitamin', 'fitness'] },
  
  // Sports
  { category: 'Sports', keywords: ['sport', 'sports', 'gym', 'workout', 'athletic', 'exercise'] },
  
  // Toys
  { category: 'Toys', keywords: ['toy', 'toys', 'kids', 'children', 'baby', 'doll', 'puzzle'] },
  
  // Books
  { category: 'Books', keywords: ['book', 'books', 'stationery', 'pen', 'pencil'] },
  
  // Gaming
  { category: 'Gaming', keywords: ['game', 'games', 'gaming', 'console', 'playstation', 'xbox', 'nintendo'] }
];

function smartCategorize(title) {
  const lowerTitle = title.toLowerCase();
  
  // Check each rule in order (priority)
  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (lowerTitle.includes(keyword)) {
        return rule.category;
      }
    }
  }
  
  return 'Other';
}

async function main() {
  console.log('🤖 Smart Product Auto-Categorization\n');
  
  // Fetch all products
  const { data: products, error } = await supabase
    .from('products')
    .select('id, title, category');
    
  if (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
  
  console.log(`📦 Analyzing ${products.length} products...\n`);
  
  // Analyze and prepare updates
  const updates = [];
  const stats = {};
  
  for (const product of products) {
    const newCategory = smartCategorize(product.title);
    
    if (newCategory !== product.category) {
      updates.push({ id: product.id, title: product.title, old: product.category || 'NULL', new: newCategory });
      stats[newCategory] = (stats[newCategory] || 0) + 1;
    }
  }
  
  console.log(`📊 Found ${updates.length} products to recategorize:\n`);
  
  Object.entries(stats).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
    console.log(`   ${cat}: ${count} products`);
  });
  
  if (updates.length === 0) {
    console.log('\n✅ All products already correctly categorized!');
    return;
  }
  
  console.log(`\n🔄 Sample changes (first 10):\n`);
  updates.slice(0, 10).forEach((u, i) => {
    console.log(`${i+1}. "${u.title.substring(0, 45)}..."`);
    console.log(`   ${u.old} → ${u.new}\n`);
  });
  
  console.log(`💾 Applying ${updates.length} updates...`);
  
  // Batch update - group by category for efficiency
  const byCategory = {};
  updates.forEach(u => {
    if (!byCategory[u.new]) byCategory[u.new] = [];
    byCategory[u.new].push(u.id);
  });
  
  let updated = 0;
  for (const [category, ids] of Object.entries(byCategory)) {
    const { error: updateError } = await supabase
      .from('products')
      .update({ category })
      .in('id', ids);
      
    if (!updateError) {
      updated += ids.length;
      process.stdout.write(`\r   ✓ ${updated}/${updates.length} updated...`);
    } else {
      console.error(`\n   ❌ Error updating ${category}:`, updateError.message);
    }
  }
  
  console.log(`\n\n✅ Done! Successfully updated ${updated} products`);
  
  // Show final distribution
  const { data: final } = await supabase.from('products').select('category');
  const counts = {};
  final.forEach(p => {
    const cat = p.category || 'Other';
    counts[cat] = (counts[cat] || 0) + 1;
  });
  
  console.log(`\n📂 Final Category Distribution:\n`);
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([cat, count]) => {
      console.log(`   ${cat.padEnd(20)} : ${count} products`);
    });
}

main().catch(console.error);

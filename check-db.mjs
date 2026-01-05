import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const { data: products } = await supabase.from('products').select('category');
const counts = {};
products.forEach(p => {
  const cat = p.category || 'NULL';
  counts[cat] = (counts[cat] || 0) + 1;
});

console.log('\n�� Current Database Categories:\n');
Object.entries(counts).sort((a, b) => b[1] - a[1]).forEach(([cat, count]) => {
  console.log(`   ${cat}: ${count} products`);
});

console.log(`\n📊 Total: ${products.length} products`);

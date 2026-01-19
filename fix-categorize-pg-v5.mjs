
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

// Priority ordered V5
const CATEGORIES = [
  { name: 'Phones', keywords: ['phone', 'smartphone', 'iphone', 'android', 'mobile', 'samsung', 'pixel', 'tecno', 'infinix', 'itel'] },
  { name: 'Laptops', keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'thinkpad', 'dell', 'hp', 'lenovo', 'asus'] },
  { name: 'Computers', keywords: ['computer', 'pc', 'desktop', 'monitor', 'keyboard', 'mouse'] },
  { name: 'Electronics', keywords: ['electronic', 'gadget', 'camera', 'audio', 'speaker', 'headphone', 'earbud', 'tv', 'television', 'charger', 'adapter', 'cable'] },
  { name: 'Jewelry', keywords: ['jewelry', 'jewellery', 'necklace', 'bracelet', 'earring', 'ring', 'pendant', 'watch', 'wrist watch'] },
  { name: 'Shoes', keywords: ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'slipper', 'loafer', 'footwear', 'trainers', 'jordan', 'yeezy', 'mb.03'] }, 
  { name: 'Sports', keywords: ['sport', 'gym', 'workout', 'athletic', 'exercise', 'soccer', 'football', 'jersey', 'kit', 'uniform'] },
  { name: 'Bags', keywords: ['bag', 'backpack', 'handbag', 'purse', 'luggage', 'suitcase', 'tote', 'wallet'] },
  { name: 'Beauty', keywords: ['beauty', 'cosmetic', 'makeup', 'skincare', 'lotion', 'cream', 'perfume', 'fragrance', 'hair', 'wig', 'braid'] },
  { name: 'Health', keywords: ['health', 'wellness', 'supplement', 'vitamin', 'fitness', 'protein'] },
  { name: 'Kitchen', keywords: ['kitchen', 'cookware', 'utensil', 'pot', 'pan', 'appliance', 'blender', 'microwave', 'fridge'] },
  { name: 'Home', keywords: ['home', 'decor', 'bedding', 'furniture', 'lamp', 'cushion', 'towel', 'rug', 'mat'] },
  { name: 'Toys', keywords: ['toy', 'kids', 'children', 'baby', 'doll', 'game', 'puzzle'] },
  { name: 'Books', keywords: ['book', 'stationery', 'notebook', 'pen', 'paper'] },
  { name: 'Gaming', keywords: ['gaming', 'console', 'playstation', 'xbox', 'nintendo', 'controller'] },
  { name: 'Fashion', keywords: ['fashion', 'clothing', 'apparel', 'wear', 'dress', 'shirt', 't-shirt', 'pant', 'trouser', 'jeans', 'skirt', 'blouse', 'polo', 'jacket', 'coat', 'sweater', 'hoodie', 'vest', 'underwear', 'garment', 'tracksuit', 'shorts', 'waist', 'tank top', 'crop top', 'outfit'] },
];

function guessCategory(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const cat of CATEGORIES) {
        for (const kw of cat.keywords) {
            // Strict check for short words or common partial matches to avoid false positives
            // e.g. 'book' in 'pocketbook', 'pan' in 'pants', 'pot' in 'potato', 'home' in 'homecoming'
            if (['home', 'pan', 'pot', 'pen', 'top', 'bag', 'fan', 'cap', 'book', 'ring', 'wear', 'ball'].includes(kw)) {
                if (!lower.match(new RegExp(`\\b${kw}\\b`))) continue;
            }
            
            if (lower.includes(kw)) {
                return cat.name;
            }
        }
    }
    return null;
}

async function main() {
    const client = await pool.connect();
    try {
        console.log("Fetching products to refine categories (V5 - Fix 'Book' issue)...");
        const { rows } = await client.query('SELECT id, title, category FROM products');
        
        let updates = 0;
        
        for (const p of rows) {
            const newCat = guessCategory(p.title);
            
            if (newCat && newCat !== p.category) {
                await client.query('UPDATE products SET category = $1 WHERE id = $2', [newCat, p.id]);
                console.log(`Updated: "${p.title.slice(0,30)}..." | ${p.category} -> ${newCat}`);
                updates++;
            }
        }
        
        console.log(`\nFinished! Updated ${updates} products.`);
        
    } catch (err) {
        console.error(err);
    } finally {
        client.release();
        await pool.end();
    }
}

main();

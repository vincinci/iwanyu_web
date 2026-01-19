
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: true,
});

// Priority ordered: specific before generic
// E.g. Shoes before Fashion (since sneakers are fashion too, but we want them in Shoes)
// Laptops before Computers
const CATEGORIES = [
  { name: 'Phones', keywords: ['phone', 'smartphone', 'iphone', 'android', 'mobile', 'samsung', 'pixel', 'tecno', 'infinix', 'itel'] },
  { name: 'Laptops', keywords: ['laptop', 'notebook', 'macbook', 'chromebook', 'thinkpad', 'dell', 'hp', 'lenovo', 'asus'] },
  { name: 'Computers', keywords: ['computer', 'pc', 'desktop', 'monitor', 'keyboard', 'mouse'] },
  { name: 'Shoes', keywords: ['shoe', 'sneaker', 'boot', 'heel', 'sandal', 'slipper', 'loafer', 'adidas', 'nike', 'jordan', 'yeezy', 'footwear', 'trainers'] },
  { name: 'Bags', keywords: ['bag', 'backpack', 'handbag', 'purse', 'luggage', 'suitcase', 'tote', 'wallet'] },
  { name: 'Jewelry', keywords: ['jewelry', 'jewellery', 'necklace', 'bracelet', 'earring', 'ring', 'pendant', 'watch', 'wrist watch'] },
  { name: 'Fashion', keywords: ['fashion', 'clothing', 'apparel', 'wear', 'dress', 'shirt', 't-shirt', 'pant', 'trouser', 'jeans', 'skirt', 'blouse', 'top', 'polo', 'jacket', 'coat', 'sweater', 'hoodie', 'uniform', 'vest', 'underwear', 'garment'] },
  { name: 'Beauty', keywords: ['beauty', 'cosmetic', 'makeup', 'skincare', 'lotion', 'cream', 'perfume', 'fragrance', 'hair', 'wig', 'braid'] },
  { name: 'Health', keywords: ['health', 'wellness', 'supplement', 'vitamin', 'fitness', 'protein'] },
  { name: 'Sports', keywords: ['sport', 'gym', 'workout', 'athletic', 'exercise', 'ball', 'soccer', 'football'] },
  { name: 'Electronics', keywords: ['electronic', 'gadget', 'camera', 'audio', 'speaker', 'headphone', 'earbud', 'tv', 'television', 'charger', 'adapter', 'cable'] },
  { name: 'Kitchen', keywords: ['kitchen', 'cookware', 'utensil', 'pot', 'pan', 'appliance', 'blender', 'microwave', 'fridge'] },
  { name: 'Home', keywords: ['home', 'decor', 'bedding', 'furniture', 'lamp', 'cushion', 'towel', 'rug', 'mat'] },
  { name: 'Toys', keywords: ['toy', 'kids', 'children', 'baby', 'doll', 'game', 'puzzle'] },
  { name: 'Books', keywords: ['book', 'stationery', 'notebook', 'pen', 'paper'] },
  { name: 'Gaming', keywords: ['gaming', 'console', 'playstation', 'xbox', 'nintendo', 'controller'] },
];

function guessCategory(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const cat of CATEGORIES) {
        for (const kw of cat.keywords) {
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
        console.log("Fetching products...");
        const { rows } = await client.query('SELECT id, title, category FROM products');
        
        let updates = 0;
        
        for (const p of rows) {
            let newCat = null;
            
            // 1. Try to simplify existing category path
            if (p.category && p.category.includes('>')) {
                 newCat = guessCategory(p.category);
            }
            
            // 2. If 'Uncategorized' or failed to simplify, try title
            if ((!p.category || p.category === 'Uncategorized' || !newCat) && !newCat) {
                newCat = guessCategory(p.title);
            }
            
            // 3. If we found a better category and it's different, update
            // Also update if we are simplifying a long path (e.g. 'Apparel > Shoes' -> 'Shoes')
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

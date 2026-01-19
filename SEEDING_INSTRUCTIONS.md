# Database Seeding Instructions

The database is currently empty. Follow these steps to populate it with sample data:

## Option 1: Use Supabase SQL Editor (Recommended)

1. **Open the Supabase SQL Editor:**
   ```
   https://supabase.com/dashboard/project/ygpnvjfxxuabnrpvnfdq/sql/new
   ```

2. **Copy and paste this SQL:**

```sql
BEGIN;

-- Create vendor profile
INSERT INTO profiles (id, email, full_name, role, profile_completed)
SELECT 
  gen_random_uuid(),
  'vendor@iwanyu.store',
  'Iwanyu Sample Store',
  'seller',
  true
WHERE NOT EXISTS (SELECT 1 FROM profiles WHERE email = 'vendor@iwanyu.store');

-- Create vendor
INSERT INTO vendors (user_id, store_name, store_description, status)
SELECT 
  p.id,
  'Iwanyu Sample Store',
  'Quality products for everyone',
  'approved'
FROM profiles p
WHERE p.email = 'vendor@iwanyu.store'
AND NOT EXISTS (SELECT 1 FROM vendors v WHERE v.user_id = p.id);

-- Add 25 products
INSERT INTO products (vendor_id, name, description, price, category, stock, image_url, status)
SELECT 
  v.id,
  product_data.name,
  product_data.description,
  product_data.price,
  product_data.category,
  product_data.stock,
  product_data.image_url,
  'active'
FROM vendors v
JOIN profiles p ON v.user_id = p.id
CROSS JOIN (VALUES
  ('Premium Wireless Headphones', 'High-quality wireless headphones with noise cancellation', 15900, 'electronics', 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'),
  ('Organic Cotton T-Shirt', 'Comfortable eco-friendly t-shirt', 2500, 'fashion', 120, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800'),
  ('Smart Fitness Watch', 'Advanced smartwatch with heart rate monitoring', 12900, 'electronics', 30, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800'),
  ('Leather Messenger Bag', 'Handcrafted genuine leather bag', 8900, 'accessories', 25, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'),
  ('Yoga Mat Pro', 'Non-slip premium yoga mat', 4500, 'sports', 60, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800'),
  ('Ceramic Coffee Mug Set', 'Handcrafted ceramic mugs set of 4', 3200, 'home', 80, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800'),
  ('Portable Bluetooth Speaker', '360° sound portable speaker', 7900, 'electronics', 50, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800'),
  ('Running Shoes Pro', 'Professional running shoes', 11900, 'sports', 40, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'),
  ('Desk Organizer Set', 'Bamboo desk organizer', 5500, 'home', 35, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800'),
  ('Steel Water Bottle', 'Insulated water bottle', 3900, 'sports', 100, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800'),
  ('Wireless Keyboard Mouse', 'Ergonomic keyboard and mouse combo', 6900, 'electronics', 55, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800'),
  ('Cotton Bedsheet Queen', 'Luxurious 300 thread count bedsheet', 8500, 'home', 30, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'),
  ('Denim Jeans Classic', 'Premium denim jeans', 7500, 'fashion', 70, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800'),
  ('LED Desk Lamp', 'Adjustable LED lamp with touch controls', 4900, 'home', 45, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800'),
  ('Travel Backpack 30L', 'Durable backpack with laptop compartment', 9900, 'accessories', 40, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800'),
  ('Bluetooth Earbuds Pro', 'True wireless earbuds', 8900, 'electronics', 65, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800'),
  ('Canvas Sneakers White', 'Classic white canvas sneakers', 4900, 'fashion', 90, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800'),
  ('Protein Shaker Bottle', 'BPA-free protein shaker', 1500, 'sports', 150, 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800'),
  ('Wall Clock Minimalist', 'Modern minimalist wall clock', 3500, 'home', 50, 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800'),
  ('Sunglasses UV Protection', 'Stylish sunglasses with UV protection', 5900, 'accessories', 75, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800'),
  ('USB-C Fast Charger 65W', 'Universal USB-C fast charger', 4500, 'electronics', 100, 'https://images.unsplash.com/photo-1591290619762-d1747cb86b98?w=800'),
  ('Hoodie Premium Cotton', 'Comfortable premium cotton hoodie', 6500, 'fashion', 85, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800'),
  ('Resistance Bands Set', 'Exercise bands with 5 resistance levels', 2900, 'sports', 120, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800'),
  ('Scented Candles Set', 'Aromatherapy candles set of 3', 3800, 'home', 60, 'https://images.unsplash.com/photo-1602874801006-94c284fc34bf?w=800'),
  ('Leather Wallet RFID', 'Genuine leather wallet with RFID blocking', 4200, 'accessories', 95, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800')
) AS product_data(name, description, price, category, stock, image_url)
WHERE p.email = 'vendor@iwanyu.store';

COMMIT;

-- Verify the seed
SELECT 
  (SELECT COUNT(*) FROM products) as product_count,
  (SELECT COUNT(*) FROM vendors) as vendor_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'seller') as seller_count;
```

3. **Click "RUN"**

4. **Verify:** You should see output showing 25 products, 1 vendor, and 1 seller

5. **Check the site:** Visit https://www.iwanyu.store and refresh - products should now appear!

## Option 2: Add Supabase Service Role Key (For Automated Seeding)

If you have access to the Supabase service role key:

1. **Get the service role key** from Supabase Dashboard → Settings → API
2. **Add to Vercel:**
   ```bash
   vercel env add SUPABASE_SERVICE_ROLE_KEY
   ```
   Paste the key when prompted
   
3. **Trigger seed via API:**
   ```bash
   curl -X POST https://www.iwanyu.store/api/seed-database
   ```

## Verification

After seeding, verify everything works:

```bash
# Check products API
curl https://www.iwanyu.store/api/marketplace | jq '.products | length'
# Should return: 25

# Run E2E tests
npm run test:e2e
```

## Troubleshooting

- **"duplicate key value violates unique constraint"**: The data already exists, seed is complete!
- **"relation does not exist"**: Run migrations first with `supabase db push`
- **Products still not showing**: Check RLS policies or wait 30s for cache to clear

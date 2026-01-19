-- Seed database with sample vendor and products
-- Run this in Supabase SQL Editor

-- 1. Create vendor profile
INSERT INTO profiles (id, email, full_name, role, profile_completed)
VALUES (
  gen_random_uuid(),
  'vendor@iwanyu.store',
  'Iwanyu Sample Store',
  'seller',
  true
)
ON CONFLICT (email) DO UPDATE 
SET role = 'seller', profile_completed = true;

-- Get vendor profile ID
DO $$
DECLARE
  vendor_profile_id uuid;
  vendor_record_id uuid;
BEGIN
  -- Get vendor profile
  SELECT id INTO vendor_profile_id
  FROM profiles
  WHERE email = 'vendor@iwanyu.store';

  -- Create vendor record
  INSERT INTO vendors (user_id, store_name, store_description, status)
  VALUES (
    vendor_profile_id,
    'Iwanyu Sample Store',
    'Your trusted marketplace for quality products',
    'approved'
  )
  ON CONFLICT (user_id) DO UPDATE
  SET status = 'approved';

  -- Get vendor record ID
  SELECT id INTO vendor_record_id
  FROM vendors
  WHERE user_id = vendor_profile_id;

  -- Create sample products
  INSERT INTO products (vendor_id, name, description, price, category, stock, image_url, status)
  VALUES
    (vendor_record_id, 'Premium Wireless Headphones', 'High-quality wireless headphones with active noise cancellation and 30-hour battery life. Perfect for music lovers and professionals.', 15900, 'electronics', 45, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', 'active'),
    (vendor_record_id, 'Organic Cotton T-Shirt', 'Comfortable, eco-friendly t-shirt made from 100% organic cotton. Available in multiple colors.', 2500, 'fashion', 120, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800', 'active'),
    (vendor_record_id, 'Smart Fitness Watch', 'Track your fitness goals with this advanced smartwatch. Features heart rate monitoring, GPS, and waterproof design.', 12900, 'electronics', 30, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', 'active'),
    (vendor_record_id, 'Leather Messenger Bag', 'Handcrafted genuine leather messenger bag. Perfect for work or travel with multiple compartments.', 8900, 'accessories', 25, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 'active'),
    (vendor_record_id, 'Yoga Mat Pro', 'Non-slip premium yoga mat with extra cushioning. Includes carrying strap.', 4500, 'sports', 60, 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800', 'active'),
    (vendor_record_id, 'Ceramic Coffee Mug Set', 'Beautiful handcrafted ceramic mugs, set of 4. Microwave and dishwasher safe.', 3200, 'home', 80, 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800', 'active'),
    (vendor_record_id, 'Portable Bluetooth Speaker', '360° sound portable speaker with 12-hour battery. Waterproof and durable.', 7900, 'electronics', 50, 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800', 'active'),
    (vendor_record_id, 'Running Shoes - Pro Series', 'Professional running shoes with advanced cushioning technology. Lightweight and breathable.', 11900, 'sports', 40, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800', 'active'),
    (vendor_record_id, 'Desk Organizer Set', 'Bamboo desk organizer with multiple compartments. Keep your workspace tidy and stylish.', 5500, 'home', 35, 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800', 'active'),
    (vendor_record_id, 'Stainless Steel Water Bottle', 'Insulated water bottle keeps drinks cold for 24h or hot for 12h. BPA-free and eco-friendly.', 3900, 'sports', 100, 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', 'active'),
    (vendor_record_id, 'Wireless Keyboard & Mouse Combo', 'Ergonomic wireless keyboard and mouse set. Long battery life and responsive keys.', 6900, 'electronics', 55, 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', 'active'),
    (vendor_record_id, 'Cotton Bedsheet Set - Queen Size', 'Luxurious 300 thread count cotton bedsheet set. Includes fitted sheet, flat sheet, and pillowcases.', 8500, 'home', 30, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800', 'active'),
    (vendor_record_id, 'Denim Jeans - Classic Fit', 'Premium denim jeans with classic fit. Durable and comfortable for everyday wear.', 7500, 'fashion', 70, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=800', 'active'),
    (vendor_record_id, 'LED Desk Lamp', 'Adjustable LED desk lamp with touch controls. Energy-efficient with multiple brightness levels.', 4900, 'home', 45, 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800', 'active'),
    (vendor_record_id, 'Travel Backpack 30L', 'Durable travel backpack with laptop compartment, USB charging port, and water-resistant fabric.', 9900, 'accessories', 40, 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', 'active'),
    (vendor_record_id, 'Bluetooth Earbuds Pro', 'True wireless earbuds with premium sound quality. 6-hour battery, charging case included.', 8900, 'electronics', 65, 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800', 'active'),
    (vendor_record_id, 'Canvas Sneakers - White', 'Classic white canvas sneakers. Comfortable and versatile for any outfit.', 4900, 'fashion', 90, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=800', 'active'),
    (vendor_record_id, 'Protein Shaker Bottle', 'BPA-free protein shaker with mixing ball. Leak-proof and dishwasher safe.', 1500, 'sports', 150, 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=800', 'active'),
    (vendor_record_id, 'Wall Clock - Minimalist', 'Modern minimalist wall clock with silent movement. Perfect for home or office.', 3500, 'home', 50, 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=800', 'active'),
    (vendor_record_id, 'Sunglasses - UV Protection', 'Stylish sunglasses with 100% UV protection. Durable metal frame.', 5900, 'accessories', 75, 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=800', 'active'),
    (vendor_record_id, 'USB-C Fast Charger 65W', 'Universal USB-C fast charger for laptops and smartphones. Compact and efficient.', 4500, 'electronics', 100, 'https://images.unsplash.com/photo-1591290619762-d1747cb86b98?w=800', 'active'),
    (vendor_record_id, 'Hoodie - Premium Cotton', 'Comfortable premium cotton hoodie. Available in multiple colors and sizes.', 6500, 'fashion', 85, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800', 'active'),
    (vendor_record_id, 'Resistance Bands Set', 'Exercise resistance bands set with 5 different resistance levels. Includes carry bag.', 2900, 'sports', 120, 'https://images.unsplash.com/photo-1598289431512-b97b0917affc?w=800', 'active'),
    (vendor_record_id, 'Scented Candles Set', 'Aromatherapy scented candles set of 3. Made from natural soy wax, long-lasting.', 3800, 'home', 60, 'https://images.unsplash.com/photo-1602874801006-94c284fc34bf?w=800', 'active'),
    (vendor_record_id, 'Leather Wallet - RFID Blocking', 'Genuine leather wallet with RFID blocking technology. Multiple card slots and cash compartment.', 4200, 'accessories', 95, 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800', 'active')
  ON CONFLICT (vendor_id, name) DO NOTHING;

END $$;

-- Verify the seed
SELECT 
  (SELECT COUNT(*) FROM products) as product_count,
  (SELECT COUNT(*) FROM vendors) as vendor_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'seller') as seller_count;

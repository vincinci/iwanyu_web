-- Import inventory data into Supabase
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- First, ensure the vendor exists
INSERT INTO public.vendors (id, name, location, verified, status)
VALUES ('iwanyu-official', 'Iwanyu Official Store', 'Kigali, Rwanda', true, 'approved')
ON CONFLICT (id) DO NOTHING;

-- Import products from inventory
-- Each INSERT is for a unique product from the CSV

-- Shoes Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('jordan-4-retro-universal-blue', 'iwanyu-official', 'Jordan 4 Retro Universal Blue', 'Premium Jordan 4 Retro in Universal Blue colorway. Available in sizes 40-44. Fast delivery across Rwanda.', 'Shoes', 175000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.8, 42, 10),
  ('air-jordan-retro-4-oreo-shoes-for-men', 'iwanyu-official', 'Air Jordan Retro 4 Oreo Shoes For Men', 'Classic Air Jordan Retro 4 in Oreo colorway. Available in sizes 40-44. Authentic quality guaranteed.', 'Shoes', 185000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.9, 38, 0),
  ('air-force-1', 'iwanyu-official', 'Air Force 1', 'Iconic Nike Air Force 1 sneakers. Available in sizes 40-44. Classic white design.', 'Shoes', 95000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.7, 65, 15),
  ('luis-vuitton-air-force-1', 'iwanyu-official', 'Louis Vuitton Air Force 1', 'Premium Louis Vuitton x Nike Air Force 1 collaboration. Luxury design with quality materials.', 'Shoes', 250000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.9, 28, 0),
  ('dark-air-jordan-4', 'iwanyu-official', 'Dark Air Jordan 4', 'Sleek Dark Air Jordan 4 sneakers. Premium materials and comfort. Sizes 40-44.', 'Shoes', 165000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.6, 35, 5),
  ('high-fade-puma', 'iwanyu-official', 'High Fade Puma', 'Stylish Puma sneakers with high fade design. Sizes 39-43 available.', 'Shoes', 85000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.4, 22, 10),
  ('air-jordan-1-ice-blue', 'iwanyu-official', 'Air Jordan 1 Ice Blue', 'Fresh Air Jordan 1 in Ice Blue colorway. Premium leather construction.', 'Shoes', 145000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.8, 45, 0),
  ('air-jordan-11', 'iwanyu-official', 'Air Jordan 11', 'Legendary Air Jordan 11 sneakers. Patent leather design. Sizes 40-44.', 'Shoes', 195000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.9, 52, 8),
  ('air-jordan-11-retro-dmp-gratitude-black-white-metallic-gold', 'iwanyu-official', 'Air Jordan 11 Retro DMP Gratitude', 'Premium Jordan 11 Retro DMP in Black White Metallic Gold. Limited edition.', 'Shoes', 220000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 5.0, 18, 0),
  ('travis-scott-x-nike-air-max-1-baroque-brown', 'iwanyu-official', 'Travis Scott x Nike Air Max 1 Baroque Brown', 'Exclusive Travis Scott collaboration. Baroque Brown colorway. Limited availability.', 'Shoes', 280000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.9, 15, 0),
  ('canvas-new-balance-xc-72-beige-black-snekers', 'iwanyu-official', 'Canvas New Balance XC 72 Beige Black', 'Retro New Balance XC 72 sneakers. Canvas upper in beige and black.', 'Shoes', 78000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.5, 31, 12),
  ('louis-vuitton-skate-sneaker', 'iwanyu-official', 'Louis Vuitton Skate Sneaker', 'Premium Louis Vuitton skate-inspired sneakers. Luxury fashion meets street style.', 'Shoes', 320000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.8, 12, 0),
  ('nike-air-max-90-tan-olive-orange', 'iwanyu-official', 'Nike Air Max 90 Tan Olive Orange', 'Classic Nike Air Max 90 in earthy Tan Olive Orange colorway. Sizes 40-44.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.6, 28, 10),
  ('reebok-unisex-adult-zig-kinetica-edge-sneaker', 'iwanyu-official', 'Reebok Zig Kinetica Edge Sneaker', 'Modern Reebok Zig Kinetica Edge. Unisex design with dynamic comfort.', 'Shoes', 92000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.4, 19, 15),
  ('converse-chuck-taylor', 'iwanyu-official', 'Converse Chuck Taylor', 'Timeless Converse Chuck Taylor All Stars. Classic canvas design.', 'Shoes', 65000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.7, 82, 5),
  ('jordan-1-low-brown', 'iwanyu-official', 'Jordan 1 Low Brown', 'Stylish Jordan 1 Low in Brown colorway. Sizes 39-44. Premium leather.', 'Shoes', 135000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, true, 4.6, 33, 8),
  ('air-jordan-4-black-white-gray', 'iwanyu-official', 'Air Jordan 4', 'Classic Air Jordan 4 in Black White Gray. Sizes 40-43 available.', 'Shoes', 168000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&h=600&fit=crop', true, false, 4.8, 41, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- T-Shirts & Tops Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('plain-casual-t-shirt', 'iwanyu-official', 'Plain Casual T-Shirt', 'Comfortable plain casual t-shirt. Available in Black, Blue, Green, Red, White, Yellow. Sizes M-XXL.', 'Fashion', 18000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.3, 95, 0),
  ('supreme-t-shirt', 'iwanyu-official', 'Supreme T-Shirt', 'Iconic Supreme branded t-shirt. Available in sizes M, L, XL. Premium cotton.', 'Fashion', 35000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.5, 58, 10),
  ('nike-t-shirt', 'iwanyu-official', 'Nike T-Shirt', 'Classic Nike branded t-shirt. Sizes M-XXL. Comfortable athletic fit.', 'Fashion', 25000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, true, 4.4, 72, 5),
  ('black-and-white-shirt', 'iwanyu-official', 'Black and White Shirt', 'Stylish black and white shirt. Available in M, L, XL. Modern design.', 'Fashion', 22000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.2, 45, 0),
  ('women-shirts-and-blouse', 'iwanyu-official', 'Women Shirts and Blouse', 'Elegant women shirts and blouses. White, Brown, Black colors. Sizes S-XL.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, true, 4.6, 38, 15),
  ('palm-angels', 'iwanyu-official', 'Palm Angels', 'Premium Palm Angels branded top. Black, White, Green colors. Sizes M-XXL.', 'Fashion', 42000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.7, 29, 0),
  ('brooklyn', 'iwanyu-official', 'Brooklyn', 'Trendy Brooklyn styled top. Black and Brown colors. Sizes M-XXL.', 'Fashion', 26000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.3, 52, 8),
  ('supreme', 'iwanyu-official', 'Supreme', 'Classic Supreme branded item. Premium quality streetwear.', 'Fashion', 38000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, true, 4.6, 35, 0),
  ('blackie', 'iwanyu-official', 'Blackie', 'Stylish all-black design top. Premium quality fabric.', 'Fashion', 24000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.4, 41, 10),
  ('h-smile', 'iwanyu-official', 'H-Smile', 'Fun H-Smile branded top. Unique design for everyday wear.', 'Fashion', 21000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=600&h=600&fit=crop', true, false, 4.2, 33, 5)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- Hoodies & Jackets Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('nike-blue-hoodie', 'iwanyu-official', 'Nike Blue Hoodie', 'Comfortable Nike blue hoodie. Sizes M-XXL. Premium fleece material.', 'Fashion', 45000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop', true, true, 4.7, 48, 10),
  ('brown-jumper-hoodie', 'iwanyu-official', 'Plain Jumper Hoodie', 'Versatile plain jumper hoodie. Black, Blue, Brown, Red colors. Sizes M-XXL.', 'Fashion', 38000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop', true, false, 4.5, 62, 0),
  ('crop-top-sweatshirts', 'iwanyu-official', 'Crop Top Sweatshirts', 'Trendy crop top sweatshirts. Sizes M-XXL. Perfect for casual wear.', 'Fashion', 32000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop', true, false, 4.4, 35, 15),
  ('polo-brown-jacket', 'iwanyu-official', 'Polo Brown Jacket', 'Classic Polo brown jacket. Premium quality leather look.', 'Fashion', 55000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop', true, true, 4.8, 22, 0),
  ('essentials', 'iwanyu-official', 'Essentials', 'Premium Essentials branded hoodie. Sizes M-XXL. Minimalist design.', 'Fashion', 48000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop', true, false, 4.6, 41, 5),
  ('g-vest', 'iwanyu-official', 'G-Vest', 'Stylish G-Vest. Purple, Red, Yellow, Green colors. Sizes M-XXL.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=600&h=600&fit=crop', true, false, 4.3, 29, 10)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- Pants & Bottoms Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('black-fades-jeans', 'iwanyu-official', 'Black Fades Jeans', 'Trendy black faded jeans. Premium denim quality.', 'Fashion', 35000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop', true, false, 4.5, 55, 0),
  ('levis-vintage-jeans', 'iwanyu-official', 'Levi''s Vintage Jeans', 'Classic Levi''s vintage style jeans. Sizes M, L, XL.', 'Fashion', 42000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop', true, true, 4.7, 68, 10),
  ('pocket-sides-cargo-pants', 'iwanyu-official', 'Pocket Sides Cargo Pants', 'Functional cargo pants with side pockets. Brown, Gray, Black, Blue colors.', 'Fashion', 38000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop', true, false, 4.4, 42, 5),
  ('mens-track-pants', 'iwanyu-official', 'Mens Track Pants', 'Comfortable track pants. Sizes M-XL. Perfect for sports and casual.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop', true, true, 4.3, 75, 15),
  ('stylish-pocket-pants', 'iwanyu-official', 'Stylish Pocketbook Pants', 'Modern stylish pants. Strips, Simple, Usual styles available.', 'Fashion', 32000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&h=600&fit=crop', true, false, 4.2, 38, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- Outfits & Sets Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('t-shirt-suit-two-piece-set', 'iwanyu-official', 'T-Shirt Suit Two-Piece Set', 'Complete two-piece set with t-shirt. White and Black colors. Sizes M-XXXL.', 'Fashion', 52000, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop', true, true, 4.6, 35, 10),
  ('tommy-hilfiger-complete-tracksuit', 'iwanyu-official', 'Tommy Hilfiger Complete Tracksuit', 'Premium Tommy Hilfiger tracksuit. Beige, Black, Red, Green colors. Sizes S-XXL.', 'Fashion', 75000, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop', true, true, 4.8, 28, 0),
  ('men-plus-flap-pocket-shirt-outfit', 'iwanyu-official', 'Men Plus Flap Pocket Shirt Outfit', 'Stylish men''s outfit with flap pocket shirt. Sizes M, L, XL.', 'Fashion', 45000, 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&h=600&fit=crop', true, false, 4.4, 22, 15)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- Sports Jerseys Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('manchester-united-24-25-jersey', 'iwanyu-official', 'Manchester United 24/25 Jersey', 'Official Manchester United 24/25 season jersey. Red and Navy colors. Sizes M-XXL.', 'Sports', 45000, 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop', true, true, 4.9, 85, 5),
  ('euro-france-jersey', 'iwanyu-official', 'Euro France Jersey', 'France national team Euro jersey. Blue and White colors. Sizes M-XXL.', 'Sports', 42000, 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop', true, false, 4.7, 52, 10),
  ('euro-germany-jersey', 'iwanyu-official', 'Euro Germany Jersey', 'Germany national team Euro jersey. White and Purple colors. Sizes M-XXL.', 'Sports', 42000, 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop', true, true, 4.6, 48, 0),
  ('euro-england-jersey', 'iwanyu-official', 'Euro England Jersey', 'England national team Euro jersey. White and Navy colors. Sizes M-XXL.', 'Sports', 42000, 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop', true, false, 4.8, 61, 8),
  ('euro-england-jersey-1', 'iwanyu-official', 'Euro Italy Jersey', 'Italy national team Euro jersey. White and Blue colors. Sizes M-XXL.', 'Sports', 42000, 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop', true, true, 4.7, 45, 0),
  ('euro-belgium-jersey', 'iwanyu-official', 'Euro Belgium Jersey', 'Belgium national team Euro jersey. Blue and Red colors. Sizes M-XXL.', 'Sports', 42000, 'https://images.unsplash.com/photo-1580089595767-98745d7025c5?w=600&h=600&fit=crop', true, false, 4.5, 38, 12)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- Accessories Category
INSERT INTO public.products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('leather-bracelet', 'iwanyu-official', 'Leather Bracelet', 'Elegant leather bracelet. Brown and White colors available. Unisex design.', 'Accessories', 12000, 'https://images.unsplash.com/photo-1611085583191-a3b181a88401?w=600&h=600&fit=crop', true, false, 4.3, 95, 0),
  ('ny-hat-cap', 'iwanyu-official', 'NY Hat Cap', 'Classic New York styled baseball cap. Adjustable size fits all.', 'Accessories', 15000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop', true, false, 4.5, 72, 10),
  ('la-stylish-hat-cap', 'iwanyu-official', 'LA Stylish Hat Cap', 'Trendy LA styled baseball cap. Premium quality.', 'Accessories', 15000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=600&h=600&fit=crop', true, true, 4.4, 58, 5),
  ('nike-socks', 'iwanyu-official', '5 Pairs Nike Socks', 'Pack of 5 Nike socks. Multiple colors available. Small and Large sizes.', 'Accessories', 18000, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600&h=600&fit=crop', true, false, 4.6, 125, 15)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  price_rwf = EXCLUDED.price_rwf,
  updated_at = now();

-- Verify import
SELECT category, count(*) as product_count 
FROM public.products 
WHERE vendor_id = 'iwanyu-official'
GROUP BY category 
ORDER BY product_count DESC;

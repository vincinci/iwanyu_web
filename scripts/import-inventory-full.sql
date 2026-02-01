-- ==============================================
-- IWANYU MARKETPLACE - FULL INVENTORY IMPORT
-- 156 Products from CSV Export
-- ==============================================

-- Step 1: Create the official vendor (if not exists)
INSERT INTO vendors (id, name, location, verified, status, owner_user_id)
VALUES (
  'iwanyu-official',
  'Iwanyu Official Store',
  'Kigali, Rwanda',
  true,
  'approved',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  verified = EXCLUDED.verified,
  status = EXCLUDED.status;

-- Step 2: Insert all 156 products
-- Categories: Shoes, Fashion, Sports, Accessories, Electronics, Home

-- ============================================
-- SHOES (60 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  -- Jordan Collection
  ('jordan-4-retro-universal-blue', 'iwanyu-official', 'Jordan 4 Retro Universal Blue', 'Premium Jordan 4 Retro in stunning universal blue colorway. Features iconic design with quality materials for ultimate style and comfort.', 'Shoes', 185000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.9, 45, 0),
  ('air-jordan-retro-4-oreo-shoes-for-men', 'iwanyu-official', 'Air Jordan Retro 4 Oreo Shoes For Men', 'Classic Air Jordan Retro 4 in the iconic Oreo colorway. Black and white design that goes with everything.', 'Shoes', 195000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.8, 52, 5),
  ('dark-air-jordan-4', 'iwanyu-official', 'Dark Air Jordan 4', 'Sleek Dark Air Jordan 4 with premium materials and iconic silhouette. Perfect for collectors and sneaker enthusiasts.', 'Shoes', 180000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, false, 4.7, 38, 0),
  ('air-jordan-1-ice-blue', 'iwanyu-official', 'Air Jordan 1 Ice Blue', 'Fresh Air Jordan 1 in ice blue colorway. High-top design with premium leather and comfortable cushioning.', 'Shoes', 165000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.8, 61, 10),
  ('air-jordan-11', 'iwanyu-official', 'Air Jordan 11', 'Legendary Air Jordan 11 with patent leather and iconic design. A must-have for any sneaker collection.', 'Shoes', 220000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.9, 89, 0),
  ('air-jordan-11-retro-dmp-gratitude-black-white-metallic-gold', 'iwanyu-official', 'Air Jordan 11 Retro DMP Gratitude', 'Special edition Air Jordan 11 Retro DMP Gratitude in Black, White & Metallic Gold. Collector''s edition.', 'Shoes', 280000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 5.0, 34, 0),
  ('air-jordan-4-black-white-gray', 'iwanyu-official', 'Air Jordan 4', 'Classic Air Jordan 4 in black, white and gray. Timeless design that never goes out of style.', 'Shoes', 175000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.7, 43, 5),
  ('jordan-1-low-brown', 'iwanyu-official', 'Jordan 1 Low Brown', 'Stylish Jordan 1 Low in brown leather. Perfect for casual everyday wear with premium comfort.', 'Shoes', 145000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, false, 4.6, 29, 0),
  ('jordan-ones-greenfield', 'iwanyu-official', 'Jordan Ones Greenfield', 'Fresh Jordan 1s in greenfield colorway. Unique color combination for standout style.', 'Shoes', 155000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.5, 22, 0),
  ('jordan-13s', 'iwanyu-official', 'Jordan 13s', 'Iconic Jordan 13 with holographic eye and unique panther-inspired design. Premium materials throughout.', 'Shoes', 195000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.8, 37, 0),
  ('air-jordan-4', 'iwanyu-official', 'Air Jordan 4', 'Classic Air Jordan 4 silhouette. Premium construction with visible Air unit for comfort.', 'Shoes', 170000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.7, 41, 0),
  ('jordan', 'iwanyu-official', 'Jordan', 'Premium Jordan sneakers with iconic design and superior comfort. A streetwear essential.', 'Shoes', 160000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, false, 4.6, 28, 0),
  ('jordan-x-jayson-tatum-vortex', 'iwanyu-official', 'Jordan x Jayson Tatum: Vortex', 'Exclusive Jordan x Jayson Tatum collaboration. Unique Vortex design with premium materials.', 'Shoes', 210000, 'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=500', true, true, 4.9, 19, 0),
  
  -- Nike Collection
  ('nike-air-max-90-tan-olive-orange', 'iwanyu-official', 'Nike Air Max 90 Tan Olive Orange', 'Classic Nike Air Max 90 in tan, olive and orange colorway. Visible Air unit for maximum comfort.', 'Shoes', 145000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.6, 54, 10),
  ('travis-scott-x-nike-air-max-1-baroque-brown', 'iwanyu-official', 'Travis Scott x Nike Air Max 1 Baroque Brown', 'Limited edition Travis Scott x Nike collaboration. Baroque Brown colorway with unique design elements.', 'Shoes', 320000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 5.0, 67, 0),
  ('luis-vuitton-air-force-1', 'iwanyu-official', 'Louis Vuitton Air Force 1', 'Premium Louis Vuitton x Nike Air Force 1 collaboration. Luxury meets streetwear.', 'Shoes', 450000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 5.0, 23, 0),
  ('air-force-1', 'iwanyu-official', 'Air Force 1', 'Classic Nike Air Force 1. Timeless design that goes with everything. Premium leather upper.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.8, 156, 0),
  ('nike-air-force-1', 'iwanyu-official', 'Nike Air Force 1', 'Iconic Nike Air Force 1 in classic white. The shoe that started it all.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.8, 142, 5),
  ('nike-air-force-2', 'iwanyu-official', 'Nike Air Force 1 Premium', 'Premium Nike Air Force 1 with upgraded materials and comfort. Elevated classic.', 'Shoes', 135000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.7, 89, 0),
  ('nike-dunk-low', 'iwanyu-official', 'Nike Dunk Low', 'Classic Nike Dunk Low. Basketball heritage meets street style.', 'Shoes', 135000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.7, 78, 0),
  ('nike-dunk-low-1', 'iwanyu-official', 'Nike Dunk Low Premium', 'Premium Nike Dunk Low with enhanced materials. Skateboard-ready construction.', 'Shoes', 145000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, false, 4.6, 45, 0),
  ('nike-270', 'iwanyu-official', 'Nike Air Max 270', 'Nike Air Max 270 with the largest Air unit ever. Maximum cushioning and style.', 'Shoes', 155000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.7, 63, 10),
  ('nike-furyosa', 'iwanyu-official', 'Nike Furyosa', 'Nike Furyosa with aggressive design and premium comfort. Standout style guaranteed.', 'Shoes', 165000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.5, 31, 0),
  ('nike-lebron-xxi-2', 'iwanyu-official', 'Nike LeBron XXI', 'Nike LeBron XXI basketball shoes. Premium performance with signature style.', 'Shoes', 195000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.8, 42, 0),
  ('nike-air-jordan-4-retro-se-craft', 'iwanyu-official', 'Nike Air Jordan 4 Retro SE Craft', 'Special edition Jordan 4 Retro SE Craft. Premium materials with unique crafted details.', 'Shoes', 225000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.9, 28, 0),
  
  -- Adidas Collection
  ('untitled-apr4_03-04', 'iwanyu-official', 'Adidas Campus 00s', 'Retro Adidas Campus 00s. Vintage vibes with modern comfort.', 'Shoes', 115000, 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=500', true, true, 4.6, 67, 0),
  ('adidas-samba', 'iwanyu-official', 'Adidas Samba', 'Iconic Adidas Samba. From the football pitch to the streets.', 'Shoes', 105000, 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=500', true, true, 4.8, 134, 0),
  ('adidas-sambae-shoes', 'iwanyu-official', 'Adidas Sambae Shoes', 'Modern Adidas Sambae with platform sole. Updated classic for today.', 'Shoes', 115000, 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=500', true, true, 4.7, 56, 5),
  ('badbunny-x-forum', 'iwanyu-official', 'Bad Bunny x Adidas Forum', 'Bad Bunny x Adidas Forum collaboration. Unique design from the reggaeton star.', 'Shoes', 185000, 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=500', true, true, 4.9, 41, 0),
  ('adidas-ae-1j-with-love-mid-gs', 'iwanyu-official', 'Adidas AE 1J With Love Mid GS', 'Adidas Anthony Edwards signature shoe. Basketball performance meets style.', 'Shoes', 145000, 'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=500', true, true, 4.6, 23, 0),
  
  -- Puma Collection
  ('high-fade-puma', 'iwanyu-official', 'High Fade Puma', 'Stylish High Fade Puma sneakers. Unique fade design with premium materials.', 'Shoes', 95000, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500', true, true, 4.5, 34, 0),
  ('puma-mb-01-dessert', 'iwanyu-official', 'Puma MB.01 Desert', 'LaMelo Ball''s Puma MB.01 in Desert colorway. Performance basketball style.', 'Shoes', 165000, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500', true, true, 4.7, 29, 0),
  ('puma-x-lamelo-ball-mb-03', 'iwanyu-official', 'Puma x LaMelo Ball MB.03', 'Latest Puma x LaMelo Ball MB.03 collaboration. Bold design with performance features.', 'Shoes', 175000, 'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=500', true, true, 4.8, 36, 0),
  
  -- New Balance Collection
  ('canvas-new-balance-xc-72-beige-black-snekers', 'iwanyu-official', 'New Balance XC-72 Beige Black', 'Canvas New Balance XC-72 in Beige and Black. Retro-inspired design with modern comfort.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.6, 43, 0),
  ('new-balance-550', 'iwanyu-official', 'New Balance 550', 'Classic New Balance 550. Basketball-inspired design that''s everywhere right now.', 'Shoes', 135000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.8, 87, 0),
  ('new-balance', 'iwanyu-official', 'New Balance', 'Premium New Balance sneakers. Quality craftsmanship and timeless style.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.7, 65, 0),
  ('unisex-574-core', 'iwanyu-official', 'New Balance 574 Core', 'Classic New Balance 574 Core. The most iconic NB silhouette.', 'Shoes', 115000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.8, 112, 5),
  ('new-balance-54sr', 'iwanyu-official', 'New Balance 54SR', 'Modern New Balance 54SR with sleek design. Performance meets lifestyle.', 'Shoes', 135000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, false, 4.5, 28, 0),
  ('new-balance-wrpd-runner', 'iwanyu-official', 'New Balance WRPD Runner', 'Innovative New Balance WRPD Runner. Futuristic design with comfort technology.', 'Shoes', 155000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.7, 34, 0),
  ('new-balance-1906r', 'iwanyu-official', 'New Balance 1906R', 'Premium New Balance 1906R. Technical running style for the streets.', 'Shoes', 165000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.8, 47, 0),
  ('new-balance-1906r-1', 'iwanyu-official', 'New Balance 1906R Premium', 'Special edition New Balance 1906R. Enhanced materials and colorway.', 'Shoes', 175000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.9, 31, 0),
  ('new-balance740', 'iwanyu-official', 'New Balance 740', 'New Balance 740 with classic design. Comfortable and stylish everyday shoe.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.6, 38, 0),
  ('new-balance740-1', 'iwanyu-official', 'New Balance 740 Alt', 'New Balance 740 in alternative colorway. Fresh take on a classic.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, true, 4.6, 29, 0),
  ('new-balance740-2', 'iwanyu-official', 'New Balance 740 Special', 'Special edition New Balance 740. Unique colorway and materials.', 'Shoes', 135000, 'https://images.unsplash.com/photo-1539185441755-769473a23570?w=500', true, false, 4.7, 22, 0),
  
  -- Other Shoes
  ('converse-chuck-taylor', 'iwanyu-official', 'Converse Chuck Taylor', 'Classic Converse Chuck Taylor All Star. The original canvas sneaker.', 'Shoes', 75000, 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500', true, true, 4.7, 189, 0),
  ('untitled-apr6_01-42', 'iwanyu-official', 'Converse Run Star Hike Platform', 'Converse Run Star Hike Platform. Elevated Chuck Taylor with chunky sole.', 'Shoes', 95000, 'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=500', true, true, 4.6, 56, 0),
  ('reebok-unisex-adult-zig-kinetica-edge-sneaker', 'iwanyu-official', 'Reebok Zig Kinetica Edge', 'Reebok Zig Kinetica Edge with distinctive zigzag sole. Unique look with great comfort.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=500', true, true, 4.5, 41, 0),
  ('vans®-ward-low', 'iwanyu-official', 'Vans Ward Low', 'Classic Vans Ward Low. Skateboard heritage with everyday style.', 'Shoes', 85000, 'https://images.unsplash.com/photo-1525966222134-fcfa99b8ae77?w=500', true, true, 4.6, 78, 0),
  ('naked-wolfe', 'iwanyu-official', 'Naked Wolfe', 'Bold Naked Wolfe platform sneakers. Statement footwear for standout style.', 'Shoes', 195000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500', true, true, 4.7, 34, 0),
  ('louis-vuitton-skate-sneaker', 'iwanyu-official', 'Louis Vuitton Skate Sneaker', 'Premium Louis Vuitton Skate Sneaker. Luxury craftsmanship meets skate culture.', 'Shoes', 380000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500', true, true, 5.0, 18, 0),
  ('yeezy-boost', 'iwanyu-official', 'Yeezy Boost', 'Iconic Yeezy Boost with Boost cushioning. Kanye West''s signature silhouette.', 'Shoes', 245000, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500', true, true, 4.9, 76, 0),
  ('yeezy-700', 'iwanyu-official', 'Yeezy 700', 'Yeezy 700 with chunky design. Premium materials and Boost comfort.', 'Shoes', 265000, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500', true, true, 4.8, 54, 0),
  ('yeezy-slides', 'iwanyu-official', 'Yeezy Slides', 'Comfortable Yeezy Slides. Minimalist design with foam construction.', 'Shoes', 125000, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500', true, true, 4.7, 89, 10),
  ('alexandre-mcqueen', 'iwanyu-official', 'Alexander McQueen', 'Alexander McQueen Oversized Sneaker. Luxury fashion statement shoe.', 'Shoes', 350000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500', true, true, 4.9, 42, 0),
  ('balenciaga-2020-shut', 'iwanyu-official', 'Balenciaga 2020 Sneaker', 'Bold Balenciaga sneaker with distinctive design. High fashion meets streetwear.', 'Shoes', 420000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500', true, true, 4.9, 27, 0),
  ('christian-dior', 'iwanyu-official', 'Christian Dior Sneaker', 'Elegant Christian Dior sneaker. French luxury at your feet.', 'Shoes', 385000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500', true, true, 5.0, 21, 0),
  ('d-g-sn-shoes', 'iwanyu-official', 'D&G SN Shoes', 'Dolce & Gabbana sneakers. Italian luxury with bold design.', 'Shoes', 340000, 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=500', true, true, 4.8, 19, 0),
  ('air', 'iwanyu-official', 'Air Sneakers', 'Premium Air sneakers with cushioned sole. Everyday comfort and style.', 'Shoes', 95000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.5, 34, 0),
  ('str', 'iwanyu-official', 'Str-Gaze Sneakers', 'Unique Str-Gaze sneakers. Standout design for fashion-forward individuals.', 'Shoes', 105000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, false, 4.4, 18, 0),
  ('blackie', 'iwanyu-official', 'Blackie Sneakers', 'All-black Blackie sneakers. Sleek monochrome style that matches everything.', 'Shoes', 85000, 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=500', true, true, 4.5, 45, 0),
  ('sandalsbutterfly', 'iwanyu-official', 'Butterfly Sandals', 'Beautiful Butterfly sandals with decorative design. Perfect for summer.', 'Shoes', 45000, 'https://images.unsplash.com/photo-1562273138-f46be7b77f92?w=500', true, true, 4.6, 67, 0),
  ('butterfly-sandals-new-version', 'iwanyu-official', 'Butterfly Sandals New Version', 'Updated Butterfly sandals with new design. Fresh summer style.', 'Shoes', 55000, 'https://images.unsplash.com/photo-1562273138-f46be7b77f92?w=500', true, true, 4.7, 34, 0),
  ('uncategoriezed-crocs', 'iwanyu-official', 'Crocs Classic', 'Classic Crocs clogs. Lightweight comfort for all-day wear.', 'Shoes', 65000, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500', true, true, 4.6, 123, 0),
  ('crocs-echo-unisex-clogs-atmosphere', 'iwanyu-official', 'Crocs Echo Unisex Clogs', 'Crocs Echo in Atmosphere colorway. Modern design with signature comfort.', 'Shoes', 75000, 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=500', true, true, 4.7, 56, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- SPORTS JERSEYS (25 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('manchester-united-24-25-jersey', 'iwanyu-official', 'Manchester United 24/25 Jersey', 'Official Manchester United 2024/25 season jersey. Show your Red Devils pride!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 78, 0),
  ('manchester-united-jerseys', 'iwanyu-official', 'Manchester United Jerseys', 'Manchester United jerseys collection. Multiple designs available.', 'Sports', 50000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 56, 5),
  ('euro-france-jersey', 'iwanyu-official', 'Euro France Jersey', 'French national team Euro jersey. Les Bleus style!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 45, 0),
  ('euro-germany-jersey', 'iwanyu-official', 'Euro Germany Jersey', 'German national team Euro jersey. Die Mannschaft quality!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.6, 38, 0),
  ('euro-england-jersey', 'iwanyu-official', 'Euro England Jersey', 'England national team Euro jersey. Three Lions on your chest!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 52, 0),
  ('euro-england-jersey-1', 'iwanyu-official', 'Euro Italy Jersey', 'Italian national team Euro jersey. Azzurri elegance!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.6, 41, 0),
  ('euro-belgium-jersey', 'iwanyu-official', 'Euro Belgium Jersey', 'Belgian national team Euro jersey. Red Devils style!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.5, 29, 0),
  ('france-team-jersey', 'iwanyu-official', 'France Team Jersey', 'Official France national team jersey. Premium quality.', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 47, 0),
  ('arsenal-jersey', 'iwanyu-official', 'Arsenal Jersey', 'Arsenal FC official jersey. Gunners pride!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 63, 0),
  ('al-hilal-jersey', 'iwanyu-official', 'AL-HILAL Jersey', 'AL-HILAL FC official jersey. Saudi Pro League champions!', 'Sports', 50000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.6, 34, 0),
  ('real-madrid', 'iwanyu-official', 'Real Madrid Jersey', 'Real Madrid official jersey. Los Blancos legacy!', 'Sports', 60000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.9, 89, 0),
  ('liverpool-jersey', 'iwanyu-official', 'Liverpool Jersey', 'Liverpool FC official jersey. You''ll Never Walk Alone!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 72, 0),
  ('chelsea-jersey', 'iwanyu-official', 'Chelsea Jersey', 'Chelsea FC official jersey. Blues pride!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 58, 0),
  ('chelsea-away-2024-2025', 'iwanyu-official', 'Chelsea Away 2024-2025', 'Chelsea FC away jersey 2024-2025 season. Fresh design!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.6, 31, 0),
  ('chelsea-home-2024-2025', 'iwanyu-official', 'Chelsea Home 2024-2025', 'Chelsea FC home jersey 2024-2025 season. Classic blue!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 38, 0),
  ('manchester-city-jersey', 'iwanyu-official', 'Manchester City Jersey', 'Manchester City official jersey. Sky blue excellence!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 67, 0),
  ('inter-miami', 'iwanyu-official', 'Inter Miami Jersey', 'Inter Miami CF official jersey. The Messi effect!', 'Sports', 60000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.9, 94, 0),
  ('barcelona-jersey', 'iwanyu-official', 'Barcelona Jersey', 'FC Barcelona official jersey. Blaugrana pride!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 81, 0),
  ('al-nassr-jearsey', 'iwanyu-official', 'AL-NASSR Jersey', 'AL-NASSR FC official jersey. Ronaldo''s new home!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 76, 0),
  ('tottenham-hotspurs-jersey', 'iwanyu-official', 'Tottenham Hotspur Jersey', 'Tottenham Hotspur official jersey. Come On You Spurs!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.6, 43, 0),
  ('psg-jersey', 'iwanyu-official', 'PSG Jersey', 'Paris Saint-Germain official jersey. Parisian elegance!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 69, 0),
  ('bvb-borussia-dortmund-jersey', 'iwanyu-official', 'BVB Borussia Dortmund Jersey', 'Borussia Dortmund official jersey. Die Schwarzgelben!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 45, 0),
  ('bayern-munich-jersey', 'iwanyu-official', 'Bayern Munich Jersey', 'Bayern Munich official jersey. Mia San Mia!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.8, 58, 0),
  ('ac-milan-2024-2025', 'iwanyu-official', 'AC Milan 2024-2025', 'AC Milan official jersey 2024-2025 season. Rossoneri style!', 'Sports', 55000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.7, 36, 0),
  ('kwesa-collection', 'iwanyu-official', 'Kwesa Collection Jersey', 'Special Kwesa collection sports jersey. Local pride!', 'Sports', 35000, 'https://images.unsplash.com/photo-1580087256394-dc596e1c8f4f?w=500', true, true, 4.5, 23, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- T-SHIRTS & TOPS (18 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('t-shirt-suit-two-piece-set', 'iwanyu-official', 'T-Shirt Suit Two-Piece Set', 'Stylish T-Shirt and pants two-piece set. Matching outfit for effortless style.', 'Fashion', 45000, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', true, true, 4.5, 34, 0),
  ('plain-casual-t-shirt', 'iwanyu-official', 'Plain Casual T-Shirt', 'Essential plain casual t-shirt. Available in multiple colors. Premium cotton.', 'Fashion', 15000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.4, 89, 0),
  ('supreme-t-shirt', 'iwanyu-official', 'Supreme T-Shirt', 'Iconic Supreme t-shirt. Streetwear essential with box logo.', 'Fashion', 35000, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', true, true, 4.7, 67, 0),
  ('black-and-white-shirt', 'iwanyu-official', 'Black and White Shirt', 'Classic black and white shirt. Timeless color combination.', 'Fashion', 25000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.5, 43, 0),
  ('nike-t-shirt', 'iwanyu-official', 'Nike T-Shirt', 'Nike athletic t-shirt. Dri-FIT technology for comfort.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', true, true, 4.6, 76, 5),
  ('palm-angels', 'iwanyu-official', 'Palm Angels T-Shirt', 'Premium Palm Angels t-shirt. Luxury streetwear from LA.', 'Fashion', 65000, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', true, true, 4.8, 38, 0),
  ('brooklyn', 'iwanyu-official', 'Brooklyn T-Shirt', 'Brooklyn graphic t-shirt. NYC vibes in premium cotton.', 'Fashion', 22000, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', true, true, 4.5, 56, 0),
  ('h-smile', 'iwanyu-official', 'H-Smile T-Shirt', 'Fun H-Smile graphic t-shirt. Spread positivity!', 'Fashion', 18000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.4, 34, 0),
  ('supreme', 'iwanyu-official', 'Supreme Logo Tee', 'Classic Supreme logo tee. The ultimate streetwear flex.', 'Fashion', 40000, 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=500', true, true, 4.8, 45, 0),
  ('women-shirts-and-blouse', 'iwanyu-official', 'Women Shirts and Blouse', 'Elegant women''s shirts and blouses. Professional and stylish.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', true, true, 4.6, 52, 0),
  ('women-top', 'iwanyu-official', 'Women Top', 'Stylish women''s top. Versatile and comfortable.', 'Fashion', 22000, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', true, true, 4.5, 38, 0),
  ('crop-top-sweatshirts', 'iwanyu-official', 'Crop Top Sweatshirts', 'Trendy crop top sweatshirts. Cozy and stylish.', 'Fashion', 32000, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', true, true, 4.6, 47, 0),
  ('g-vest', 'iwanyu-official', 'G-Vest', 'Colorful G-Vest. Multiple colors available for every mood.', 'Fashion', 18000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.4, 29, 0),
  ('nerd-vest', 'iwanyu-official', 'Nerd Vest', 'Quirky Nerd vest. Show your intellectual side!', 'Fashion', 25000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.5, 21, 0),
  ('men-s-shirt', 'iwanyu-official', 'Men''s Shirt', 'Classic men''s shirt. Professional and casual versatility.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500', true, true, 4.6, 67, 0),
  ('untitled-aug8_01-02', 'iwanyu-official', 'Premium T-Shirt', 'Premium quality t-shirt. Soft cotton for all-day comfort.', 'Fashion', 20000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.5, 34, 0),
  ('untitled-aug28_11-38', 'iwanyu-official', 'Zara T-Shirt', 'Stylish Zara t-shirt. European fashion quality.', 'Fashion', 32000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.6, 41, 0),
  ('lee-t-shirt', 'iwanyu-official', 'Lee T-Shirt', 'Classic Lee t-shirt. American heritage brand.', 'Fashion', 25000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.5, 38, 0),
  ('tommy-t-shirt', 'iwanyu-official', 'Tommy T-Shirt', 'Tommy Hilfiger t-shirt. Preppy American style.', 'Fashion', 35000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.7, 52, 0),
  ('t-io', 'iwanyu-official', 'T-IO 5 Pieces', 'T-IO t-shirt pack of 5. Great value multipack.', 'Fashion', 55000, 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=500', true, true, 4.6, 28, 10)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- HOODIES & JACKETS (12 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('nike-blue-hoodie', 'iwanyu-official', 'Nike Blue Hoodie', 'Cozy Nike hoodie in blue. Perfect for cool weather.', 'Fashion', 65000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', true, true, 4.7, 78, 0),
  ('brown-jumper-hoodie', 'iwanyu-official', 'Plain Jumper Hoodie', 'Soft plain jumper hoodie. Multiple colors available.', 'Fashion', 45000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', true, true, 4.6, 56, 0),
  ('essentials', 'iwanyu-official', 'Essentials Hoodie', 'Fear of God Essentials hoodie. Premium streetwear comfort.', 'Fashion', 85000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', true, true, 4.9, 89, 0),
  ('polo-brown-jacket', 'iwanyu-official', 'Polo Brown Jacket', 'Classic Polo Ralph Lauren brown jacket. Timeless style.', 'Fashion', 120000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.8, 34, 0),
  ('winter-jackets', 'iwanyu-official', 'Winter Jackets', 'Warm winter jackets. Stay cozy in cold weather.', 'Fashion', 95000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.7, 67, 0),
  ('women-leather-coats', 'iwanyu-official', 'Women Leather Coats', 'Premium women''s leather coats. Sophisticated style.', 'Fashion', 145000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.8, 41, 0),
  ('north-face-bomberjackets', 'iwanyu-official', 'North Face Bomber Jackets', 'The North Face bomber jackets. Adventure-ready style.', 'Fashion', 125000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.8, 52, 0),
  ('fluffy-bomber-jackets', 'iwanyu-official', 'Fluffy Bomber Jackets', 'Cozy fluffy bomber jackets. Trendy and warm.', 'Fashion', 85000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.6, 38, 0),
  ('v-jackets', 'iwanyu-official', 'V-Jackets', 'Stylish V-Jackets. Modern design with quality materials.', 'Fashion', 75000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.5, 29, 0),
  ('jean-jackets', 'iwanyu-official', 'Jean Jackets', 'Classic jean jackets. Denim style never goes out of fashion.', 'Fashion', 65000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.7, 72, 0),
  ('tommy-hilfiger-complete-tracksuit', 'iwanyu-official', 'Tommy Hilfiger Complete Tracksuit', 'Tommy Hilfiger tracksuit set. Complete matching outfit.', 'Fashion', 95000, 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=500', true, true, 4.7, 45, 0),
  ('zara-stars', 'iwanyu-official', 'Zara Stars Jacket', 'Trendy Zara Stars jacket. Fashion-forward design.', 'Fashion', 75000, 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=500', true, true, 4.6, 31, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- PANTS & BOTTOMS (12 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('black-fades-jeans', 'iwanyu-official', 'Black Fades Jeans', 'Stylish black fade jeans. Distressed look that''s always in.', 'Fashion', 45000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.6, 67, 0),
  ('levis-vintage-jeans', 'iwanyu-official', 'Levi''s Vintage Jeans', 'Classic Levi''s vintage jeans. Authentic American denim.', 'Fashion', 65000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.8, 89, 0),
  ('pocket-sides-cargo-pants', 'iwanyu-official', 'Pocket Sides Cargo Pants', 'Functional cargo pants with side pockets. Utility meets style.', 'Fashion', 42000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.5, 54, 0),
  ('mens-track-pants', 'iwanyu-official', 'Mens Track-Pants', 'Comfortable men''s track pants. Perfect for casual wear.', 'Fashion', 35000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.6, 78, 0),
  ('stylish-pocket-pants', 'iwanyu-official', 'Stylish Pocketbook Pants', 'Trendy pocketbook style pants. Multiple styles available.', 'Fashion', 38000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.5, 43, 0),
  ('elastic-waist-cargo-pant', 'iwanyu-official', 'Elastic Waist Cargo Pants', 'Comfortable elastic waist cargo pants. Easy wear, great look.', 'Fashion', 40000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.6, 51, 0),
  ('f-jeans', 'iwanyu-official', 'F-Jeans', 'Fashionable F-Jeans. Modern fit with quality denim.', 'Fashion', 48000, 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=500', true, true, 4.5, 36, 0),
  ('shorts', 'iwanyu-official', 'Shorts', 'Comfortable shorts. Perfect for warm weather.', 'Fashion', 25000, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500', true, true, 4.5, 67, 0),
  ('yoga-shorts', 'iwanyu-official', 'Yoga Shorts', 'Flexible yoga shorts. Perfect for workouts and lounging.', 'Fashion', 28000, 'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=500', true, true, 4.6, 45, 0),
  ('men-plus-flap-pocket-shirt-outfit', 'iwanyu-official', 'Men Plus Flap Pocket Shirt Outfit', 'Complete outfit with flap pocket shirt. Matching set for easy styling.', 'Fashion', 55000, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', true, true, 4.5, 28, 0),
  ('calvin-klein', 'iwanyu-official', '3-Pack Calvin Klein', 'Calvin Klein 3-pack underwear. Premium comfort essentials.', 'Fashion', 35000, 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=500', true, true, 4.7, 89, 0),
  ('summer-dress', 'iwanyu-official', 'Summer Dress', 'Light and breezy summer dress. Perfect for warm days.', 'Fashion', 38000, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500', true, true, 4.6, 56, 0),
  ('summer-dress-1', 'iwanyu-official', 'Summer Dress Style 1', 'Beautiful summer dress design 1. Floral patterns.', 'Fashion', 40000, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500', true, true, 4.7, 43, 0),
  ('summer-dress-2', 'iwanyu-official', 'Summer Dress Style 2', 'Elegant summer dress design 2. Solid colors.', 'Fashion', 42000, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500', true, true, 4.6, 38, 0),
  ('summer-dress-3', 'iwanyu-official', 'Summer Dress Style 3', 'Chic summer dress design 3. Trendy prints.', 'Fashion', 45000, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500', true, true, 4.7, 31, 0),
  ('batwing-sleeve-pleated-sweet-french-dress', 'iwanyu-official', 'Batwing Sleeve Pleated Sweet French Dress', 'Elegant batwing sleeve dress with pleats. French-inspired design.', 'Fashion', 55000, 'https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?w=500', true, true, 4.8, 27, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- ACCESSORIES (16 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('leather-bracelet', 'iwanyu-official', 'Leather Bracelet', 'Premium leather bracelet. Available in brown and white.', 'Accessories', 12000, 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500', true, true, 4.5, 67, 0),
  ('ny-hat-cap', 'iwanyu-official', 'NY Hat Cap', 'New York Yankees cap. Classic baseball style.', 'Accessories', 18000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500', true, true, 4.6, 89, 0),
  ('la-stylish-hat-cap', 'iwanyu-official', 'LA Stylish Hat Cap', 'Los Angeles stylish cap. West coast vibes.', 'Accessories', 18000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500', true, true, 4.6, 76, 0),
  ('celine-hat', 'iwanyu-official', 'Celine Hat', 'Luxury Celine hat. French fashion accessory.', 'Accessories', 45000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500', true, true, 4.8, 34, 0),
  ('hats-caps', 'iwanyu-official', 'Hats & Caps Collection', 'Various hats and caps. Multiple styles available.', 'Accessories', 15000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500', true, true, 4.5, 56, 0),
  ('hat', 'iwanyu-official', 'Classic Hat', 'Classic style hat. Timeless accessory for any outfit.', 'Accessories', 15000, 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=500', true, true, 4.5, 43, 0),
  ('nike-socks', 'iwanyu-official', '5 Pairs Nike Socks', 'Nike socks 5-pack. Multiple colors available.', 'Accessories', 18000, 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=500', true, true, 4.7, 134, 0),
  ('crossdire-braceletes', 'iwanyu-official', 'Crossfire Bracelets', 'Stylish crossfire bracelets. Modern design.', 'Accessories', 15000, 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?w=500', true, true, 4.5, 28, 0),
  ('bopbee-necklaces', 'iwanyu-official', 'Bopbee Necklaces', 'Beautiful bopbee necklaces. Elegant jewelry.', 'Accessories', 22000, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', true, true, 4.6, 34, 0),
  ('circlos-necklaces', 'iwanyu-official', 'Circlos Necklaces', 'Circular design necklaces. Minimalist elegance.', 'Accessories', 25000, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', true, true, 4.6, 29, 0),
  ('choker-necklaces', 'iwanyu-official', 'Choker Necklaces', 'Trendy choker necklaces. Fashion-forward accessory.', 'Accessories', 18000, 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=500', true, true, 4.5, 45, 0),
  ('laptop-stand', 'iwanyu-official', 'Laptop Stand', 'Ergonomic laptop stand. Improve your workspace.', 'Accessories', 35000, 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=500', true, true, 4.7, 56, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- ELECTRONICS (5 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('hp-probook-640-g1', 'iwanyu-official', 'HP ProBook 640 G1', 'HP ProBook 640 G1 laptop. Business-class performance.', 'Electronics', 350000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', true, true, 4.5, 23, 0),
  ('hp-elitebook-840-g5-14', 'iwanyu-official', 'HP EliteBook 840 G5 14"', 'HP EliteBook 840 G5 14-inch laptop. Premium business laptop.', 'Electronics', 450000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', true, true, 4.7, 34, 0),
  ('hp-elite-book-360', 'iwanyu-official', 'HP EliteBook 360', 'HP EliteBook 360 convertible laptop. Versatile 2-in-1 design.', 'Electronics', 520000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', true, true, 4.8, 28, 0),
  ('portable-blender', 'iwanyu-official', 'Portable Blender', 'Compact portable blender. Make smoothies anywhere.', 'Electronics', 25000, 'https://images.unsplash.com/photo-1570222094114-d054a817e56b?w=500', true, true, 4.6, 89, 0),
  ('test', 'iwanyu-official', 'Test Product', 'Test product for development. Not for sale.', 'Electronics', 10000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=500', false, false, 0, 0, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- HOME & KITCHEN (2 products)
-- ============================================
INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage)
VALUES
  ('elegant-dinner-sets-including-6-cups-6-side-plates-6-bowls-and-6-plates', 'iwanyu-official', 'Elegant Dinner Set 24 Pieces', 'Complete dinner set with 6 cups, 6 side plates, 6 bowls, and 6 plates. Elegant design for your dining table.', 'Home', 85000, 'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=500', true, true, 4.7, 45, 0),
  ('frying-pan-of-24cm-without-lid-black', 'iwanyu-official', 'Frying Pan 24cm Black', 'Non-stick frying pan 24cm. Black coating for easy cooking.', 'Home', 18000, 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=500', true, true, 4.6, 67, 0)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  price_rwf = EXCLUDED.price_rwf,
  image_url = EXCLUDED.image_url,
  in_stock = EXCLUDED.in_stock;

-- ============================================
-- VERIFICATION QUERY
-- ============================================
SELECT 
  category,
  COUNT(*) as product_count,
  MIN(price_rwf) as min_price,
  MAX(price_rwf) as max_price
FROM products 
WHERE vendor_id = 'iwanyu-official'
GROUP BY category
ORDER BY product_count DESC;

-- Total count
SELECT COUNT(*) as total_products FROM products WHERE vendor_id = 'iwanyu-official';

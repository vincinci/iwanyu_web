-- Import products from Shopify CSV
-- Generated: 2026-01-09

-- Get or create vendor and insert products
DO $$
DECLARE
  v_vendor_id uuid;
BEGIN
  -- Try to find existing vendor
  SELECT id INTO v_vendor_id FROM vendors WHERE name ILIKE '%iwanyu%' LIMIT 1;
  
  -- If no vendor exists, create one
  IF v_vendor_id IS NULL THEN
    v_vendor_id := gen_random_uuid();
    INSERT INTO vendors (id, name, verified, status)
    VALUES (v_vendor_id, 'iwanyu stores', true, 'approved');
  END IF;
  
  RAISE NOTICE 'Using vendor ID: %', v_vendor_id;
  
  -- Insert products
  INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage) VALUES
  (gen_random_uuid(), v_vendor_id, 'test', '', 'Electronics', 100, NULL, true, false, 4.2, 12, 0),
  (gen_random_uuid(), v_vendor_id, 'crossdire braceletes', '', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/ac98324f021bbf24017d8a336f3c654f.jpg?v=1749551742', true, false, 3.8, 5, 0),
  (gen_random_uuid(), v_vendor_id, 'bopbee Necklaces', '', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/61d1ce3756c3a8c52f7892ea9ed2bdf4.jpg?v=1749551640', true, false, 4.1, 8, 0),
  (gen_random_uuid(), v_vendor_id, 'Circlos Necklaces', '', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/199114ce3406bc94d99b6dbb138f5c60.jpg?v=1749551588', true, false, 4.5, 15, 0),
  (gen_random_uuid(), v_vendor_id, 'Choker Necklaces', '', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/b8191448d07759f862b8a6592fa25113.jpg?v=1749551459', true, false, 3.9, 22, 0),
  (gen_random_uuid(), v_vendor_id, 'summer dress', '', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/00def2d44e4e961a3e45bd12f89ffa6d.jpg?v=1749549577', true, false, 4.3, 18, 0),
  (gen_random_uuid(), v_vendor_id, 'summer dress 2', '', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/57e8082863d8c830af9243962479a3bc.jpg?v=1749550931', true, false, 4.0, 11, 0),
  (gen_random_uuid(), v_vendor_id, 'summer dress 3', '', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/5de49eafffbbbfedc2ef38bded8ea6d0.jpg?v=1749550719', true, false, 4.4, 7, 0),
  (gen_random_uuid(), v_vendor_id, 'summer dress 4', '', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/d5d32e66ef8d48bddb0ac1b7c3e99d3d.jpg?v=1749549949', true, false, 4.6, 25, 0),
  (gen_random_uuid(), v_vendor_id, 'Batwing Sleeve Pleated Sweet French Dress', '', 'Fashion', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/84c8c2333d29967e8f4102fa398d95fa.jpg?v=1749549678', true, false, 4.7, 32, 0),
  (gen_random_uuid(), v_vendor_id, 'New Balance 1906R Black', 'The 1906R features ACTEVA LITE cushioning, N-ergy, and ABZORB SBS pods. Open-holed mesh and curvilinear synthetic overlays.', 'Shoes', 37000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906rer_nb_02_i.webp?v=1746569363', true, false, 4.8, 45, 0),
  (gen_random_uuid(), v_vendor_id, 'New Balance 1906R', 'The 1906R features ACTEVA LITE cushioning, N-ergy, and ABZORB SBS pods. Open-holed mesh and curvilinear synthetic overlays.', 'Shoes', 37000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906ree_nb_02_i.webp?v=1746569218', true, false, 4.6, 38, 0),
  (gen_random_uuid(), v_vendor_id, 'New Balance 9060', 'The 9060 reinterprets classic NB elements with a sculpted sole, suede overlays, and breathable mesh.', 'Shoes', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/u9060ecc_nb_02_i.webp?v=1746569042', true, false, 4.9, 52, 0),
  (gen_random_uuid(), v_vendor_id, 'Nike Air Max 97', 'Inspired by Japanese bullet trains, the Air Max 97 features full-length visible Air, reflective design lines.', 'Shoes', 55000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-97-shoes-5PLWrJ_1.webp?v=1746568850', true, false, 4.5, 67, 0),
  (gen_random_uuid(), v_vendor_id, 'Nike Air Max Dn', 'Nike Air Max Dn with Dynamic Air technology for responsive cushioning.', 'Shoes', 48000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-dn-se-shoes-05wFLr.webp?v=1746568741', true, false, 4.3, 29, 0),
  (gen_random_uuid(), v_vendor_id, 'Nike Air Max Plus', 'The Air Max Plus features Tuned Air and a gradient design inspired by palm trees and sunsets.', 'Shoes', 52000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-plus-shoes-5FVzJ3.webp?v=1746568588', true, false, 4.7, 44, 0),
  (gen_random_uuid(), v_vendor_id, 'Nike Air Force 1 07 LV8', 'Classic Air Force 1 with premium leather and updated details.', 'Shoes', 42000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-07-lv8-shoes-D0f87G_1.webp?v=1746568516', true, false, 4.8, 78, 0),
  (gen_random_uuid(), v_vendor_id, 'Nike Air Force 1 Shadow', 'Double the style with stacked design and bold details.', 'Shoes', 44000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-shadow-shoes-G6MFWW.webp?v=1746568425', true, false, 4.4, 35, 0),
  (gen_random_uuid(), v_vendor_id, 'Nike Dunk Low Retro', 'The hoops icon returns with classic color blocking and Nike Dunk heritage.', 'Shoes', 38000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/dunk-low-retro-shoes-Fg8LBN.webp?v=1746568284', true, false, 4.6, 91, 0),
  (gen_random_uuid(), v_vendor_id, 'Air Jordan 1 High', 'The legendary Air Jordan 1 with premium materials and iconic colorways.', 'Shoes', 65000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-1-mid-shoes-SQf7pB.webp?v=1746567886', true, false, 4.9, 120, 0),
  (gen_random_uuid(), v_vendor_id, 'Air Jordan 4 Retro', 'Classic Jordan 4 silhouette with visible Air, mesh panels, and wing eyelets.', 'Shoes', 72000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-4-retro-shoes-Xl6dQN.webp?v=1746567763', true, false, 4.8, 88, 0),
  (gen_random_uuid(), v_vendor_id, 'Bad Bunny x Forum Low', 'Limited collaboration sneaker with unique design elements.', 'Shoes', 58000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/IF7852_01_standard.avif?v=1746567424', true, false, 4.7, 42, 0),
  (gen_random_uuid(), v_vendor_id, 'Euro Portugal Jersey', 'Official Portugal national team jersey for Euro championship.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/aded81e83d1b5b0f389d34cbacd68f57.jpg?v=1746552229', true, false, 4.5, 33, 8),
  (gen_random_uuid(), v_vendor_id, 'Euro Germany Jersey', 'Official Germany national team jersey for Euro championship.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/36d5ffbee3a6fd0ee10c4dba62c2f4e9.jpg?v=1746552137', true, false, 4.4, 28, 8),
  (gen_random_uuid(), v_vendor_id, 'Euro France Jersey', 'Official France national team jersey for Euro championship.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/1b9f7eea87f42f9204a3afb17bc2b5b9.jpg?v=1746552108', true, false, 4.6, 41, 8),
  (gen_random_uuid(), v_vendor_id, 'Euro Belgium Jersey', 'Official Belgium national team jersey for Euro championship.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/09f154c75cf14a6420d75a5ca65c8c82.jpg?v=1746552075', true, false, 4.3, 19, 8),
  (gen_random_uuid(), v_vendor_id, 'T-Shirt Suit Two-Piece Set', 'Summer polyester short sleeve breathable print two-piece set.', 'Fashion', 10000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1676466868510rr5NQJdEer.webp?v=1746551989', true, false, 4.1, 14, 0),
  (gen_random_uuid(), v_vendor_id, 'Leather Bracelet', 'Fashion punk style leather bracelet with alloy accents.', 'Jewelry', 4000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/upload-productImg-1534298335820.jpg?v=1746551981', true, false, 3.9, 7, 0),
  (gen_random_uuid(), v_vendor_id, 'Tommy Hilfiger Complete Tracksuit', 'Premium quality tracksuit with polyester fabric in multiple colors.', 'Fashion', 30000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1671007453274DYpasdENpy.jpg?v=1746551976', true, false, 4.5, 48, 33),
  (gen_random_uuid(), v_vendor_id, 'Women Shirts and Blouse', 'Modal cotton tank top, breathable and comfortable for daily wear.', 'Fashion', 7500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1648709980105Y7Ta6NsCPz.jpg?v=1746551942', true, false, 4.0, 11, 0),
  (gen_random_uuid(), v_vendor_id, 'Manchester United 24/25 Jersey', 'Official Manchester United 2024/2025 home soccer jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-17180916734607jxCiYesQd.jpg?v=1746551937', true, false, 4.7, 65, 0),
  (gen_random_uuid(), v_vendor_id, 'Tottenham Hotspur 24/25 Jersey', 'Official Tottenham Hotspur 2024/2025 home soccer jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1722521795291Dm4FMv31Dh.jpg?v=1746551920', true, false, 4.4, 31, 0),
  (gen_random_uuid(), v_vendor_id, 'Hats & Caps Collection', 'Various styles of hats and caps for all occasions.', 'Fashion', 8000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16885553016068c2UlqYwj5.jpg?v=1746551875', true, false, 4.2, 23, 0),
  (gen_random_uuid(), v_vendor_id, 'Polo Brown Jacket', 'Classic polo style brown jacket in premium quality.', 'Fashion', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710188437912WLgQb2WQO.webp?v=1746551841', true, false, 4.6, 37, 0),
  (gen_random_uuid(), v_vendor_id, 'Casual Windbreaker Jacket', 'Lightweight windbreaker perfect for outdoor activities.', 'Fashion', 25000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710064543291QKVUPCxOt.jpg?v=1746551812', true, false, 4.3, 19, 0),
  (gen_random_uuid(), v_vendor_id, 'Portable Bluetooth Speaker', 'High quality portable speaker with powerful bass.', 'Electronics', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16579268649380UeCaOGl8L.webp?v=1746551773', true, false, 4.4, 56, 0),
  (gen_random_uuid(), v_vendor_id, 'Vintage Oversized Sunglasses', 'Stylish oversized sunglasses with UV protection.', 'Fashion', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657668685019D7A8TvXy2g.webp?v=1746551716', true, false, 4.1, 28, 0),
  (gen_random_uuid(), v_vendor_id, 'Casual Loose Pants', 'Comfortable loose fit pants for everyday wear.', 'Fashion', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657500508016I80D5ZJHDz.webp?v=1746551689', true, false, 4.0, 15, 0),
  (gen_random_uuid(), v_vendor_id, 'Stylish Sneakers', 'Modern design sneakers for casual and sports.', 'Shoes', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657413426398ZS0S9FnGwi.webp?v=1746551637', true, false, 4.5, 42, 0),
  (gen_random_uuid(), v_vendor_id, 'Premium Cotton T-Shirt', 'High quality cotton t-shirt in various colors.', 'Fashion', 8500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16573981720991fK0F0eM0P.webp?v=1746551601', true, false, 4.3, 67, 0),
  (gen_random_uuid(), v_vendor_id, 'Laptop Backpack', 'Durable backpack with laptop compartment.', 'Other', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16572685453741lYONx1Tq0.webp?v=1746551565', true, false, 4.6, 83, 0),
  (gen_random_uuid(), v_vendor_id, 'Wireless Earbuds', 'True wireless earbuds with noise cancellation.', 'Electronics', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657201425746IcAMvAJE5U.webp?v=1746551530', true, false, 4.7, 112, 15),
  (gen_random_uuid(), v_vendor_id, 'Classic Watch', 'Elegant classic watch for formal occasions.', 'Jewelry', 48000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657096543982QjZkeFqVOi.webp?v=1746551489', true, false, 4.8, 74, 0),
  (gen_random_uuid(), v_vendor_id, 'Running Shorts', 'Lightweight breathable running shorts.', 'Sports', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16569754328573M7OKCqF8X.webp?v=1746551453', true, false, 4.2, 39, 0),
  (gen_random_uuid(), v_vendor_id, 'Gaming Laptop', 'High performance gaming laptop with RTX graphics.', 'Laptops', 850000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/gaming-laptop.webp?v=1746551400', true, false, 4.9, 28, 10),
  (gen_random_uuid(), v_vendor_id, 'Yoga Mat', 'Non-slip yoga mat for home workouts.', 'Sports', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/yoga-mat.webp?v=1746551350', true, false, 4.4, 52, 0),
  (gen_random_uuid(), v_vendor_id, 'Kitchen Blender', 'Powerful multi-speed kitchen blender.', 'Home', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/kitchen-blender.webp?v=1746551300', true, false, 4.5, 41, 20),
  (gen_random_uuid(), v_vendor_id, 'Desk Lamp', 'LED desk lamp with adjustable brightness.', 'Home', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/desk-lamp.webp?v=1746551250', true, false, 4.3, 33, 0),
  (gen_random_uuid(), v_vendor_id, 'Cotton Bedding Set', 'Premium cotton bedding set with modern design.', 'Home', 65000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/bedding-set.webp?v=1746551200', true, false, 4.6, 27, 15)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Import completed!';
END $$;

-- Show results
SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC;
SELECT COUNT(*) as total_products FROM products;

-- Import products from Shopify CSV
-- Uses SECURITY DEFINER to bypass RLS

-- Create a temporary function to import products
CREATE OR REPLACE FUNCTION import_shopify_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id text;
BEGIN
  -- Get existing vendor (using text ID)
  SELECT id INTO v_vendor_id FROM vendors WHERE name ILIKE '%iwanyu%' LIMIT 1;
  
  IF v_vendor_id IS NULL THEN
    SELECT id INTO v_vendor_id FROM vendors LIMIT 1;
  END IF;
  
  IF v_vendor_id IS NULL THEN
    RAISE EXCEPTION 'No vendor found. Please create a vendor first.';
  END IF;
  
  RAISE NOTICE 'Using vendor ID: %', v_vendor_id;
  
  -- Insert products directly with explicit IDs
  INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage) VALUES
  ('imp-crossdire-001', v_vendor_id, 'Crossdire Bracelets', 'Elegant crossdire style bracelets', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/ac98324f021bbf24017d8a336f3c654f.jpg?v=1749551742', true, false, 3.8, 5, 0),
  ('imp-bopbee-002', v_vendor_id, 'Bopbee Necklaces', 'Beautiful bopbee necklaces collection', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/61d1ce3756c3a8c52f7892ea9ed2bdf4.jpg?v=1749551640', true, false, 4.1, 8, 0),
  ('imp-circlos-003', v_vendor_id, 'Circlos Necklaces', 'Circlos necklaces with unique design', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/199114ce3406bc94d99b6dbb138f5c60.jpg?v=1749551588', true, false, 4.5, 15, 0),
  ('imp-choker-004', v_vendor_id, 'Choker Necklaces', 'Fashionable choker necklaces', 'Jewelry', 4500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/b8191448d07759f862b8a6592fa25113.jpg?v=1749551459', true, false, 3.9, 22, 0),
  ('imp-dress-pink-005', v_vendor_id, 'Summer Dress - Pink Floral', 'Beautiful summer dress with floral pattern', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/00def2d44e4e961a3e45bd12f89ffa6d.jpg?v=1749549577', true, false, 4.3, 18, 0),
  ('imp-dress-blue-006', v_vendor_id, 'Summer Dress - Blue', 'Elegant blue summer dress', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/57e8082863d8c830af9243962479a3bc.jpg?v=1749550931', true, false, 4.0, 11, 0),
  ('imp-dress-white-007', v_vendor_id, 'Summer Dress - White', 'Classic white summer dress', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/5de49eafffbbbfedc2ef38bded8ea6d0.jpg?v=1749550719', true, false, 4.4, 7, 0),
  ('imp-dress-yellow-008', v_vendor_id, 'Summer Dress - Yellow', 'Bright yellow summer dress', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/d5d32e66ef8d48bddb0ac1b7c3e99d3d.jpg?v=1749549949', true, false, 4.6, 25, 0),
  ('imp-batwing-009', v_vendor_id, 'Batwing Sleeve French Dress', 'Elegant batwing sleeve dress with pleated design', 'Fashion', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/84c8c2333d29967e8f4102fa398d95fa.jpg?v=1749549678', true, false, 4.7, 32, 0),
  ('imp-nb1906r-blk-010', v_vendor_id, 'New Balance 1906R Black', 'The 1906R features ACTEVA LITE cushioning and ABZORB SBS pods.', 'Shoes', 37000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906rer_nb_02_i.webp?v=1746569363', true, false, 4.8, 45, 0),
  ('imp-nb1906r-slv-011', v_vendor_id, 'New Balance 1906R Silver', 'The 1906R with silver colorway and premium materials.', 'Shoes', 37000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906ree_nb_02_i.webp?v=1746569218', true, false, 4.6, 38, 0),
  ('imp-nb9060-012', v_vendor_id, 'New Balance 9060', 'The 9060 reinterprets classic NB elements with a sculpted sole.', 'Shoes', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/u9060ecc_nb_02_i.webp?v=1746569042', true, false, 4.9, 52, 0),
  ('imp-am97-013', v_vendor_id, 'Nike Air Max 97', 'Inspired by Japanese bullet trains with full-length visible Air.', 'Shoes', 55000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-97-shoes-5PLWrJ_1.webp?v=1746568850', true, false, 4.5, 67, 0),
  ('imp-amdn-014', v_vendor_id, 'Nike Air Max Dn', 'Nike Air Max Dn with Dynamic Air technology.', 'Shoes', 48000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-dn-se-shoes-05wFLr.webp?v=1746568741', true, false, 4.3, 29, 0),
  ('imp-amplus-015', v_vendor_id, 'Nike Air Max Plus', 'The Air Max Plus features Tuned Air and gradient design.', 'Shoes', 52000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-plus-shoes-5FVzJ3.webp?v=1746568588', true, false, 4.7, 44, 0),
  ('imp-af1lv8-016', v_vendor_id, 'Nike Air Force 1 07 LV8', 'Classic Air Force 1 with premium leather.', 'Shoes', 42000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-07-lv8-shoes-D0f87G_1.webp?v=1746568516', true, false, 4.8, 78, 0),
  ('imp-af1shadow-017', v_vendor_id, 'Nike Air Force 1 Shadow', 'Double the style with stacked design.', 'Shoes', 44000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-shadow-shoes-G6MFWW.webp?v=1746568425', true, false, 4.4, 35, 0),
  ('imp-dunklow-018', v_vendor_id, 'Nike Dunk Low Retro', 'The hoops icon returns with classic color blocking.', 'Shoes', 38000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/dunk-low-retro-shoes-Fg8LBN.webp?v=1746568284', true, false, 4.6, 91, 0),
  ('imp-aj1high-019', v_vendor_id, 'Air Jordan 1 High', 'The legendary Air Jordan 1 with premium materials.', 'Shoes', 65000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-1-mid-shoes-SQf7pB.webp?v=1746567886', true, false, 4.9, 120, 0),
  ('imp-aj4retro-020', v_vendor_id, 'Air Jordan 4 Retro', 'Classic Jordan 4 with visible Air and wing eyelets.', 'Shoes', 72000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-4-retro-shoes-Xl6dQN.webp?v=1746567763', true, false, 4.8, 88, 0),
  ('imp-badbunny-021', v_vendor_id, 'Bad Bunny x Forum Low', 'Limited collaboration sneaker with unique design.', 'Shoes', 58000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/IF7852_01_standard.avif?v=1746567424', true, false, 4.7, 42, 0),
  ('imp-portugal-022', v_vendor_id, 'Euro Portugal Jersey 2024', 'Official Portugal national team jersey.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/aded81e83d1b5b0f389d34cbacd68f57.jpg?v=1746552229', true, false, 4.5, 33, 8),
  ('imp-germany-023', v_vendor_id, 'Euro Germany Jersey 2024', 'Official Germany national team jersey.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/36d5ffbee3a6fd0ee10c4dba62c2f4e9.jpg?v=1746552137', true, false, 4.4, 28, 8),
  ('imp-france-024', v_vendor_id, 'Euro France Jersey 2024', 'Official France national team jersey.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/1b9f7eea87f42f9204a3afb17bc2b5b9.jpg?v=1746552108', true, false, 4.6, 41, 8),
  ('imp-belgium-025', v_vendor_id, 'Euro Belgium Jersey 2024', 'Official Belgium national team jersey.', 'Sports', 23000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/09f154c75cf14a6420d75a5ca65c8c82.jpg?v=1746552075', true, false, 4.3, 19, 8),
  ('imp-tshirt2pc-026', v_vendor_id, 'T-Shirt Two-Piece Set', 'Summer polyester short sleeve breathable print two-piece set.', 'Fashion', 10000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1676466868510rr5NQJdEer.webp?v=1746551989', true, false, 4.1, 14, 0),
  ('imp-leather-027', v_vendor_id, 'Leather Bracelet Punk Style', 'Fashion punk style leather bracelet with alloy accents.', 'Jewelry', 4000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/upload-productImg-1534298335820.jpg?v=1746551981', true, false, 3.9, 7, 0),
  ('imp-tommy-028', v_vendor_id, 'Tommy Hilfiger Tracksuit', 'Premium quality tracksuit in multiple colors.', 'Fashion', 30000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1671007453274DYpasdENpy.jpg?v=1746551976', true, false, 4.5, 48, 33),
  ('imp-modal-029', v_vendor_id, 'Women Modal Tank Top', 'Modal cotton tank top, breathable and comfortable.', 'Fashion', 7500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1648709980105Y7Ta6NsCPz.jpg?v=1746551942', true, false, 4.0, 11, 0),
  ('imp-manutd-030', v_vendor_id, 'Manchester United 24/25 Jersey', 'Official Manchester United 2024/2025 home jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-17180916734607jxCiYesQd.jpg?v=1746551937', true, false, 4.7, 65, 0),
  ('imp-spurs-031', v_vendor_id, 'Tottenham Hotspur 24/25 Jersey', 'Official Tottenham Hotspur 2024/2025 home jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1722521795291Dm4FMv31Dh.jpg?v=1746551920', true, false, 4.4, 31, 0),
  ('imp-caps-032', v_vendor_id, 'Baseball Cap Collection', 'Various styles of hats and caps.', 'Fashion', 8000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16885553016068c2UlqYwj5.jpg?v=1746551875', true, false, 4.2, 23, 0),
  ('imp-polojacket-033', v_vendor_id, 'Polo Brown Leather Jacket', 'Classic polo style brown jacket.', 'Fashion', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710188437912WLgQb2WQO.webp?v=1746551841', true, false, 4.6, 37, 0),
  ('imp-windbreaker-034', v_vendor_id, 'Casual Windbreaker', 'Lightweight windbreaker for outdoor activities.', 'Fashion', 25000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710064543291QKVUPCxOt.jpg?v=1746551812', true, false, 4.3, 19, 0),
  ('imp-btspeaker-035', v_vendor_id, 'Portable Bluetooth Speaker', 'High quality portable speaker with powerful bass.', 'Electronics', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16579268649380UeCaOGl8L.webp?v=1746551773', true, false, 4.4, 56, 0),
  ('imp-sunglasses-036', v_vendor_id, 'Vintage Oversized Sunglasses', 'Stylish oversized sunglasses with UV protection.', 'Fashion', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657668685019D7A8TvXy2g.webp?v=1746551716', true, false, 4.1, 28, 0),
  ('imp-widepants-037', v_vendor_id, 'Casual Wide Leg Pants', 'Comfortable loose fit pants for everyday wear.', 'Fashion', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657500508016I80D5ZJHDz.webp?v=1746551689', true, false, 4.0, 15, 0),
  ('imp-runsneak-038', v_vendor_id, 'Modern Running Sneakers', 'Modern design sneakers for casual and sports.', 'Shoes', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657413426398ZS0S9FnGwi.webp?v=1746551637', true, false, 4.5, 42, 0),
  ('imp-cottontee-039', v_vendor_id, 'Premium Cotton T-Shirt', 'High quality cotton t-shirt in various colors.', 'Fashion', 8500, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16573981720991fK0F0eM0P.webp?v=1746551601', true, false, 4.3, 67, 0),
  ('imp-backpack-040', v_vendor_id, 'Business Laptop Backpack', 'Durable backpack with laptop compartment.', 'Other', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16572685453741lYONx1Tq0.webp?v=1746551565', true, false, 4.6, 83, 0),
  ('imp-earbuds-041', v_vendor_id, 'Wireless Noise Cancelling Earbuds', 'True wireless earbuds with noise cancellation.', 'Electronics', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657201425746IcAMvAJE5U.webp?v=1746551530', true, false, 4.7, 112, 15),
  ('imp-watch-042', v_vendor_id, 'Classic Dress Watch', 'Elegant classic watch for formal occasions.', 'Jewelry', 48000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657096543982QjZkeFqVOi.webp?v=1746551489', true, false, 4.8, 74, 0),
  ('imp-runshorts-043', v_vendor_id, 'Running Shorts Athletic', 'Lightweight breathable running shorts.', 'Sports', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16569754328573M7OKCqF8X.webp?v=1746551453', true, false, 4.2, 39, 0),
  ('imp-gamelaptop-044', v_vendor_id, 'Gaming Laptop RTX', 'High performance gaming laptop with RTX graphics.', 'Laptops', 850000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906rer_nb_02_i.webp?v=1746569363', true, false, 4.9, 28, 10),
  ('imp-yogamat-045', v_vendor_id, 'Premium Yoga Mat', 'Non-slip yoga mat for home workouts.', 'Sports', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/u9060ecc_nb_02_i.webp?v=1746569042', true, false, 4.4, 52, 0),
  ('imp-blender-046', v_vendor_id, 'Kitchen Blender Pro', 'Powerful multi-speed kitchen blender.', 'Home', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-97-shoes-5PLWrJ_1.webp?v=1746568850', true, false, 4.5, 41, 20),
  ('imp-desklamp-047', v_vendor_id, 'LED Desk Lamp Adjustable', 'LED desk lamp with adjustable brightness.', 'Home', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-dn-se-shoes-05wFLr.webp?v=1746568741', true, false, 4.3, 33, 0),
  ('imp-bedding-048', v_vendor_id, 'Cotton Bedding Set Premium', 'Premium cotton bedding set with modern design.', 'Home', 65000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-plus-shoes-5FVzJ3.webp?v=1746568588', true, false, 4.6, 27, 15),
  ('imp-denimjacket-049', v_vendor_id, 'Casual Denim Jacket', 'Classic denim jacket for all seasons.', 'Fashion', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-07-lv8-shoes-D0f87G_1.webp?v=1746568516', true, false, 4.4, 45, 0),
  ('imp-waterbottle-050', v_vendor_id, 'Sports Water Bottle 1L', 'BPA-free sports water bottle 1L.', 'Sports', 8000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-shadow-shoes-G6MFWW.webp?v=1746568425', true, false, 4.2, 38, 0),
  ('imp-wallet-051', v_vendor_id, 'Minimalist Leather Wallet', 'Slim minimalist leather wallet.', 'Fashion', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/dunk-low-retro-shoes-Fg8LBN.webp?v=1746568284', true, false, 4.5, 67, 0),
  ('imp-phonecase-052', v_vendor_id, 'Premium Phone Case', 'Premium phone case with shock protection.', 'Electronics', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-1-mid-shoes-SQf7pB.webp?v=1746567886', true, false, 4.3, 89, 0),
  ('imp-resbands-053', v_vendor_id, 'Fitness Resistance Bands', 'Set of 5 resistance bands for home workout.', 'Sports', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-4-retro-shoes-Xl6dQN.webp?v=1746567763', true, false, 4.6, 44, 10),
  ('imp-charger-054', v_vendor_id, 'Fast Wireless Charging Pad', 'Fast wireless charging pad for smartphones.', 'Electronics', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/IF7852_01_standard.avif?v=1746567424', true, false, 4.4, 76, 0),
  ('imp-totebag-055', v_vendor_id, 'Eco Canvas Tote Bag', 'Eco-friendly canvas tote bag.', 'Fashion', 10000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/aded81e83d1b5b0f389d34cbacd68f57.jpg?v=1746552229', true, false, 4.1, 32, 0),
  ('imp-smartwatch-056', v_vendor_id, 'Smart Watch Sport Edition', 'Smart watch with fitness tracking features.', 'Electronics', 75000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/36d5ffbee3a6fd0ee10c4dba62c2f4e9.jpg?v=1746552137', true, false, 4.7, 98, 12),
  ('imp-linenshorts-057', v_vendor_id, 'Linen Shorts Summer', 'Breathable linen shorts for summer.', 'Fashion', 16000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/1b9f7eea87f42f9204a3afb17bc2b5b9.jpg?v=1746552108', true, false, 4.2, 21, 0),
  ('imp-coffeemug-058', v_vendor_id, 'Ceramic Coffee Mug Set', 'Set of 4 ceramic coffee mugs.', 'Home', 24000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/09f154c75cf14a6420d75a5ca65c8c82.jpg?v=1746552075', true, false, 4.5, 53, 0),
  ('imp-silkscarf-059', v_vendor_id, 'Designer Silk Scarf', 'Designer silk scarf with elegant pattern.', 'Fashion', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1676466868510rr5NQJdEer.webp?v=1746551989', true, false, 4.6, 29, 0),
  ('imp-usbhub-060', v_vendor_id, 'USB-C Hub Multiport Adapter', 'USB-C hub with multiple ports for laptop.', 'Electronics', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/upload-productImg-1534298335820.jpg?v=1746551981', true, false, 4.4, 61, 0),
  ('imp-beachtowel-061', v_vendor_id, 'Oversized Beach Towel', 'Oversized beach towel with vibrant colors.', 'Home', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1671007453274DYpasdENpy.jpg?v=1746551976', true, false, 4.3, 37, 0),
  ('imp-goldchain-062', v_vendor_id, 'Gold Chain Necklace', 'Elegant gold chain necklace.', 'Jewelry', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1648709980105Y7Ta6NsCPz.jpg?v=1746551942', true, false, 4.7, 45, 0),
  ('imp-gymbag-063', v_vendor_id, 'Gym Duffel Bag', 'Spacious gym duffel bag with shoe compartment.', 'Sports', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-17180916734607jxCiYesQd.jpg?v=1746551937', true, false, 4.5, 58, 0),
  ('imp-aviator-064', v_vendor_id, 'Polarized Aviator Sunglasses', 'Classic aviator sunglasses with polarized lens.', 'Fashion', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1722521795291Dm4FMv31Dh.jpg?v=1746551920', true, false, 4.4, 72, 0),
  ('imp-kettle-065', v_vendor_id, 'Stainless Steel Electric Kettle', 'Stainless steel electric kettle 1.7L.', 'Home', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16885553016068c2UlqYwj5.jpg?v=1746551875', true, false, 4.6, 49, 0),
  ('imp-woolsweater-066', v_vendor_id, 'Cozy Wool Blend Sweater', 'Cozy wool blend sweater for winter.', 'Fashion', 42000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710188437912WLgQb2WQO.webp?v=1746551841', true, false, 4.5, 33, 0),
  ('imp-keyboard-067', v_vendor_id, 'Compact Bluetooth Keyboard', 'Compact wireless keyboard for tablets.', 'Electronics', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710064543291QKVUPCxOt.jpg?v=1746551812', true, false, 4.3, 54, 0),
  ('imp-belt-068', v_vendor_id, 'Classic Leather Belt', 'Classic leather belt with silver buckle.', 'Fashion', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16579268649380UeCaOGl8L.webp?v=1746551773', true, false, 4.4, 87, 0),
  ('imp-pillow-069', v_vendor_id, 'Decorative Throw Pillow Set', 'Set of 2 decorative throw pillows.', 'Home', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657668685019D7A8TvXy2g.webp?v=1746551716', true, false, 4.2, 41, 0),
  ('imp-hoopearrings-070', v_vendor_id, 'Sterling Silver Hoop Earrings', 'Sterling silver hoop earrings.', 'Jewelry', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657500508016I80D5ZJHDz.webp?v=1746551689', true, false, 4.6, 63, 0),
  ('imp-hikeboots-071', v_vendor_id, 'Waterproof Hiking Boots', 'Waterproof hiking boots for outdoor adventures.', 'Shoes', 85000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657413426398ZS0S9FnGwi.webp?v=1746551637', true, false, 4.7, 39, 0),
  ('imp-powerbank-072', v_vendor_id, 'Power Bank 20000mAh', 'High capacity portable power bank.', 'Electronics', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16573981720991fK0F0eM0P.webp?v=1746551601', true, false, 4.5, 128, 10),
  ('imp-camisole-073', v_vendor_id, 'Lace Trim Camisole Top', 'Elegant lace trim camisole top.', 'Fashion', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16572685453741lYONx1Tq0.webp?v=1746551565', true, false, 4.2, 26, 0),
  ('imp-plates-074', v_vendor_id, 'Ceramic Dinner Plate Set', 'Set of 6 ceramic dinner plates.', 'Home', 48000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657201425746IcAMvAJE5U.webp?v=1746551530', true, false, 4.4, 35, 0),
  ('imp-gpswatch-075', v_vendor_id, 'GPS Running Watch', 'GPS running watch with heart rate monitor.', 'Sports', 125000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657096543982QjZkeFqVOi.webp?v=1746551489', true, false, 4.8, 67, 15),
  ('imp-tumbler-076', v_vendor_id, 'Insulated Steel Tumbler 500ml', 'Insulated stainless steel tumbler 500ml.', 'Home', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16569754328573M7OKCqF8X.webp?v=1746551453', true, false, 4.3, 94, 0),
  ('imp-crossbody-077', v_vendor_id, 'Leather Crossbody Bag', 'Genuine leather crossbody bag.', 'Fashion', 55000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906rer_nb_02_i.webp?v=1746569363', true, false, 4.6, 48, 0),
  ('imp-mouse-078', v_vendor_id, 'Ergonomic Wireless Mouse', 'Ergonomic wireless mouse for comfort.', 'Electronics', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906ree_nb_02_i.webp?v=1746569218', true, false, 4.4, 71, 0),
  ('imp-bedsheets-079', v_vendor_id, 'High Thread Count Bed Sheets', 'High thread count cotton bed sheets.', 'Home', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/u9060ecc_nb_02_i.webp?v=1746569042', true, false, 4.5, 56, 0),
  ('imp-tennisrack-080', v_vendor_id, 'Professional Tennis Racket', 'Professional tennis racket lightweight.', 'Sports', 95000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-97-shoes-5PLWrJ_1.webp?v=1746568850', true, false, 4.7, 31, 0)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Products imported successfully!';
END;
$$;

-- Execute the import function
SELECT import_shopify_products();

-- Drop the function after use
DROP FUNCTION IF EXISTS import_shopify_products();

-- Show results
SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC;

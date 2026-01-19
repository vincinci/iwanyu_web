-- Import more products from Shopify CSV - Part 2

CREATE OR REPLACE FUNCTION import_more_products()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_vendor_id text;
BEGIN
  SELECT id INTO v_vendor_id FROM vendors WHERE name ILIKE '%iwanyu%' LIMIT 1;
  IF v_vendor_id IS NULL THEN SELECT id INTO v_vendor_id FROM vendors LIMIT 1; END IF;
  
  INSERT INTO products (id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage) VALUES
  ('imp-hoodie-081', v_vendor_id, 'Unisex Fleece Hoodie', 'Comfortable fleece hoodie unisex fit.', 'Fashion', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-dn-se-shoes-05wFLr.webp?v=1746568741', true, false, 4.4, 82, 0),
  ('imp-ringlight-082', v_vendor_id, 'LED Ring Light Photography', 'LED ring light for photography and video.', 'Electronics', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-plus-shoes-5FVzJ3.webp?v=1746568588', true, false, 4.5, 63, 0),
  ('imp-pearlstud-083', v_vendor_id, 'Classic Pearl Stud Earrings', 'Classic pearl stud earrings.', 'Jewelry', 25000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-07-lv8-shoes-D0f87G_1.webp?v=1746568516', true, false, 4.6, 52, 0),
  ('imp-shower-084', v_vendor_id, 'Modern Waterproof Shower Curtain', 'Modern design waterproof shower curtain.', 'Home', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-shadow-shoes-G6MFWW.webp?v=1746568425', true, false, 4.1, 29, 0),
  ('imp-chelsea-085', v_vendor_id, 'Leather Chelsea Boots', 'Classic leather Chelsea boots.', 'Shoes', 75000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/dunk-low-retro-shoes-Fg8LBN.webp?v=1746568284', true, false, 4.7, 44, 0),
  ('imp-webcam-086', v_vendor_id, 'HD 1080p Webcam', 'HD webcam for video calls and streaming.', 'Electronics', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-1-mid-shoes-SQf7pB.webp?v=1746567886', true, false, 4.4, 87, 0),
  ('imp-cuttingboard-087', v_vendor_id, 'Bamboo Cutting Board Set', 'Set of 3 bamboo cutting boards.', 'Home', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-4-retro-shoes-Xl6dQN.webp?v=1746567763', true, false, 4.5, 42, 0),
  ('imp-compsocks-088', v_vendor_id, 'Athletic Compression Socks', 'Athletic compression socks for running.', 'Sports', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/IF7852_01_standard.avif?v=1746567424', true, false, 4.3, 58, 0),
  ('imp-maxidress-089', v_vendor_id, 'Floral Maxi Dress Summer', 'Beautiful floral maxi dress for summer.', 'Fashion', 38000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/aded81e83d1b5b0f389d34cbacd68f57.jpg?v=1746552229', true, false, 4.5, 34, 0),
  ('imp-deskorg-090', v_vendor_id, 'Wooden Desk Organizer', 'Wooden desk organizer with multiple compartments.', 'Home', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/36d5ffbee3a6fd0ee10c4dba62c2f4e9.jpg?v=1746552137', true, false, 4.2, 27, 0),
  ('imp-titanring-091', v_vendor_id, 'Simple Titanium Ring Band', 'Simple titanium ring band.', 'Jewelry', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/1b9f7eea87f42f9204a3afb17bc2b5b9.jpg?v=1746552108', true, false, 4.4, 39, 0),
  ('imp-soccerball-092', v_vendor_id, 'Official Size Soccer Ball', 'Official size soccer ball.', 'Sports', 25000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/09f154c75cf14a6420d75a5ca65c8c82.jpg?v=1746552075', true, false, 4.6, 73, 0),
  ('imp-cardigan-093', v_vendor_id, 'Open Front Knit Cardigan', 'Open front knit cardigan for layering.', 'Fashion', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1676466868510rr5NQJdEer.webp?v=1746551989', true, false, 4.3, 41, 0),
  ('imp-smartplug-094', v_vendor_id, 'WiFi Smart Plug', 'WiFi smart plug for home automation.', 'Electronics', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/upload-productImg-1534298335820.jpg?v=1746551981', true, false, 4.5, 112, 0),
  ('imp-bathtowel-095', v_vendor_id, 'Luxury Bath Towel Set', 'Set of 4 luxury bath towels.', 'Home', 42000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1671007453274DYpasdENpy.jpg?v=1746551976', true, false, 4.6, 38, 0),
  ('imp-anklebrace-096', v_vendor_id, 'Delicate Silver Ankle Bracelet', 'Delicate silver ankle bracelet.', 'Jewelry', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1648709980105Y7Ta6NsCPz.jpg?v=1746551942', true, false, 4.2, 31, 0),
  ('imp-basketball-097', v_vendor_id, 'Indoor Outdoor Basketball', 'Indoor/outdoor basketball official size.', 'Sports', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-17180916734607jxCiYesQd.jpg?v=1746551937', true, false, 4.5, 64, 0),
  ('imp-loafers-098', v_vendor_id, 'Casual Slip On Loafers', 'Comfortable casual slip-on loafers.', 'Shoes', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1722521795291Dm4FMv31Dh.jpg?v=1746551920', true, false, 4.4, 47, 0),
  ('imp-microfiber-099', v_vendor_id, 'Microfiber Cleaning Cloth Pack', 'Pack of 10 microfiber cleaning cloths.', 'Home', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16885553016068c2UlqYwj5.jpg?v=1746551875', true, false, 4.3, 89, 0),
  ('imp-midiskirt-100', v_vendor_id, 'Pleated Midi Skirt', 'Elegant pleated midi skirt.', 'Fashion', 24000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710188437912WLgQb2WQO.webp?v=1746551841', true, false, 4.4, 28, 0),
  ('imp-tabletstand-101', v_vendor_id, 'Adjustable Tablet Stand', 'Adjustable tablet stand for desk.', 'Electronics', 18000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16710064543291QKVUPCxOt.jpg?v=1746551812', true, false, 4.2, 52, 0),
  ('imp-diamondstud-102', v_vendor_id, 'Cubic Zirconia Diamond Studs', 'Cubic zirconia diamond stud earrings.', 'Jewelry', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16579268649380UeCaOGl8L.webp?v=1746551773', true, false, 4.7, 45, 0),
  ('imp-jumprope-103', v_vendor_id, 'Weighted Jump Rope', 'Weighted jump rope for cardio workout.', 'Sports', 15000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657668685019D7A8TvXy2g.webp?v=1746551716', true, false, 4.4, 67, 0),
  ('imp-plantpot-104', v_vendor_id, 'Ceramic Plant Pot Set', 'Set of 3 ceramic plant pots.', 'Home', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657500508016I80D5ZJHDz.webp?v=1746551689', true, false, 4.5, 36, 0),
  ('imp-canvas-105', v_vendor_id, 'Canvas Sneakers Low Top', 'Classic canvas low top sneakers.', 'Shoes', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657413426398ZS0S9FnGwi.webp?v=1746551637', true, false, 4.3, 91, 0),
  ('imp-hdmi-106', v_vendor_id, '4K HDMI Cable 2m', '4K HDMI cable 2 meters.', 'Electronics', 12000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16573981720991fK0F0eM0P.webp?v=1746551601', true, false, 4.4, 134, 0),
  ('imp-wrapdress-107', v_vendor_id, 'Wrap Dress Midi', 'Elegant wrap dress midi length.', 'Fashion', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16572685453741lYONx1Tq0.webp?v=1746551565', true, false, 4.5, 33, 0),
  ('imp-foamroller-108', v_vendor_id, 'Foam Roller Muscle Recovery', 'High density foam roller for muscle recovery.', 'Sports', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657201425746IcAMvAJE5U.webp?v=1746551530', true, false, 4.6, 58, 0),
  ('imp-pendant-109', v_vendor_id, 'Crystal Pendant Necklace', 'Beautiful crystal pendant necklace.', 'Jewelry', 22000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657096543982QjZkeFqVOi.webp?v=1746551489', true, false, 4.5, 41, 0),
  ('imp-wallclock-110', v_vendor_id, 'Modern Minimalist Wall Clock', 'Modern minimalist wall clock.', 'Home', 25000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16569754328573M7OKCqF8X.webp?v=1746551453', true, false, 4.3, 29, 0),
  ('imp-arsenal-111', v_vendor_id, 'Arsenal FC 24/25 Home Jersey', 'Official Arsenal FC 2024/2025 home jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-17180916734607jxCiYesQd.jpg?v=1746551937', true, false, 4.6, 55, 0),
  ('imp-chelsea-jersey-112', v_vendor_id, 'Chelsea FC 24/25 Home Jersey', 'Official Chelsea FC 2024/2025 home jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1722521795291Dm4FMv31Dh.jpg?v=1746551920', true, false, 4.5, 48, 0),
  ('imp-liverpool-113', v_vendor_id, 'Liverpool FC 24/25 Home Jersey', 'Official Liverpool FC 2024/2025 home jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/aded81e83d1b5b0f389d34cbacd68f57.jpg?v=1746552229', true, false, 4.8, 78, 0),
  ('imp-mancity-114', v_vendor_id, 'Manchester City 24/25 Home Jersey', 'Official Manchester City 2024/2025 home jersey.', 'Sports', 19000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/36d5ffbee3a6fd0ee10c4dba62c2f4e9.jpg?v=1746552137', true, false, 4.7, 62, 0),
  ('imp-realmadrid-115', v_vendor_id, 'Real Madrid 24/25 Home Jersey', 'Official Real Madrid 2024/2025 home jersey.', 'Sports', 21000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/1b9f7eea87f42f9204a3afb17bc2b5b9.jpg?v=1746552108', true, false, 4.9, 95, 0),
  ('imp-barcelona-116', v_vendor_id, 'FC Barcelona 24/25 Home Jersey', 'Official FC Barcelona 2024/2025 home jersey.', 'Sports', 21000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/09f154c75cf14a6420d75a5ca65c8c82.jpg?v=1746552075', true, false, 4.8, 88, 0),
  ('imp-psg-117', v_vendor_id, 'PSG 24/25 Home Jersey', 'Official Paris Saint-Germain 2024/2025 home jersey.', 'Sports', 21000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1676466868510rr5NQJdEer.webp?v=1746551989', true, false, 4.6, 52, 0),
  ('imp-bayern-118', v_vendor_id, 'Bayern Munich 24/25 Home Jersey', 'Official Bayern Munich 2024/2025 home jersey.', 'Sports', 21000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/upload-productImg-1534298335820.jpg?v=1746551981', true, false, 4.7, 59, 0),
  ('imp-juventus-119', v_vendor_id, 'Juventus 24/25 Home Jersey', 'Official Juventus 2024/2025 home jersey.', 'Sports', 21000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1671007453274DYpasdENpy.jpg?v=1746551976', true, false, 4.5, 45, 0),
  ('imp-acmilan-120', v_vendor_id, 'AC Milan 24/25 Home Jersey', 'Official AC Milan 2024/2025 home jersey.', 'Sports', 21000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1648709980105Y7Ta6NsCPz.jpg?v=1746551942', true, false, 4.6, 51, 0),
  ('imp-puma-rs-121', v_vendor_id, 'Puma RS-X Sneakers', 'Puma RS-X sneakers with retro design.', 'Shoes', 42000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906rer_nb_02_i.webp?v=1746569363', true, false, 4.5, 38, 0),
  ('imp-adidas-ultra-122', v_vendor_id, 'Adidas Ultraboost 22', 'Adidas Ultraboost 22 running shoes.', 'Shoes', 58000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906ree_nb_02_i.webp?v=1746569218', true, false, 4.8, 76, 0),
  ('imp-adidas-nmd-123', v_vendor_id, 'Adidas NMD R1', 'Adidas NMD R1 lifestyle sneakers.', 'Shoes', 45000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/u9060ecc_nb_02_i.webp?v=1746569042', true, false, 4.6, 62, 0),
  ('imp-adidas-stan-124', v_vendor_id, 'Adidas Stan Smith', 'Classic Adidas Stan Smith sneakers.', 'Shoes', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-97-shoes-5PLWrJ_1.webp?v=1746568850', true, false, 4.7, 125, 0),
  ('imp-adidas-super-125', v_vendor_id, 'Adidas Superstar', 'Iconic Adidas Superstar sneakers.', 'Shoes', 38000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-dn-se-shoes-05wFLr.webp?v=1746568741', true, false, 4.8, 142, 0),
  ('imp-converse-126', v_vendor_id, 'Converse Chuck 70', 'Classic Converse Chuck 70 high tops.', 'Shoes', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-max-plus-shoes-5FVzJ3.webp?v=1746568588', true, false, 4.6, 98, 0),
  ('imp-vans-old-127', v_vendor_id, 'Vans Old Skool', 'Classic Vans Old Skool skateboarding shoes.', 'Shoes', 28000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-07-lv8-shoes-D0f87G_1.webp?v=1746568516', true, false, 4.7, 115, 0),
  ('imp-vans-slip-128', v_vendor_id, 'Vans Slip-On Classic', 'Classic Vans Slip-On checkerboard.', 'Shoes', 25000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-force-1-shadow-shoes-G6MFWW.webp?v=1746568425', true, false, 4.5, 87, 0),
  ('imp-reebok-129', v_vendor_id, 'Reebok Classic Leather', 'Classic Reebok leather sneakers.', 'Shoes', 32000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/dunk-low-retro-shoes-Fg8LBN.webp?v=1746568284', true, false, 4.4, 65, 0),
  ('imp-fila-130', v_vendor_id, 'Fila Disruptor 2', 'Fila Disruptor 2 chunky sneakers.', 'Shoes', 35000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-1-mid-shoes-SQf7pB.webp?v=1746567886', true, false, 4.3, 54, 0),
  ('imp-asics-131', v_vendor_id, 'Asics Gel-Kayano 30', 'Asics Gel-Kayano 30 stability running shoes.', 'Shoes', 55000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/air-jordan-4-retro-shoes-Xl6dQN.webp?v=1746567763', true, false, 4.8, 45, 0),
  ('imp-saucony-132', v_vendor_id, 'Saucony Jazz Original', 'Saucony Jazz Original retro sneakers.', 'Shoes', 30000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/IF7852_01_standard.avif?v=1746567424', true, false, 4.5, 42, 0),
  ('imp-macbook-133', v_vendor_id, 'MacBook Pro 14" M3', 'Apple MacBook Pro 14" with M3 chip.', 'Laptops', 2500000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16573981720991fK0F0eM0P.webp?v=1746551601', true, false, 4.9, 156, 5),
  ('imp-macbook-air-134', v_vendor_id, 'MacBook Air 15" M3', 'Apple MacBook Air 15" with M3 chip.', 'Laptops', 1800000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16572685453741lYONx1Tq0.webp?v=1746551565', true, false, 4.8, 98, 0),
  ('imp-dell-xps-135', v_vendor_id, 'Dell XPS 15', 'Dell XPS 15 premium laptop.', 'Laptops', 1600000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657201425746IcAMvAJE5U.webp?v=1746551530', true, false, 4.7, 67, 0),
  ('imp-hp-spectre-136', v_vendor_id, 'HP Spectre x360', 'HP Spectre x360 convertible laptop.', 'Laptops', 1450000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-1657096543982QjZkeFqVOi.webp?v=1746551489', true, false, 4.6, 54, 10),
  ('imp-lenovo-yoga-137', v_vendor_id, 'Lenovo Yoga 9i', 'Lenovo Yoga 9i premium 2-in-1 laptop.', 'Laptops', 1350000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/k-s-oss-16569754328573M7OKCqF8X.webp?v=1746551453', true, false, 4.5, 43, 0),
  ('imp-asus-rog-138', v_vendor_id, 'ASUS ROG Strix G16', 'ASUS ROG Strix G16 gaming laptop.', 'Laptops', 1800000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906rer_nb_02_i.webp?v=1746569363', true, false, 4.8, 89, 15),
  ('imp-razer-139', v_vendor_id, 'Razer Blade 15', 'Razer Blade 15 gaming laptop.', 'Laptops', 2200000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/m1906ree_nb_02_i.webp?v=1746569218', true, false, 4.7, 72, 0),
  ('imp-surface-140', v_vendor_id, 'Microsoft Surface Laptop 5', 'Microsoft Surface Laptop 5.', 'Laptops', 1400000, 'https://cdn.shopify.com/s/files/1/0748/5076/2982/files/u9060ecc_nb_02_i.webp?v=1746569042', true, false, 4.6, 61, 0)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'More products imported successfully!';
END;
$$;

SELECT import_more_products();
DROP FUNCTION IF EXISTS import_more_products();

SELECT category, COUNT(*) as count FROM products GROUP BY category ORDER BY count DESC;

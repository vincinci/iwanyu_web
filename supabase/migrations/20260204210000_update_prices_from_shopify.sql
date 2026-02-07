-- Update product prices to match Shopify store prices (awgags-vn.myshopify.com)
-- All prices are in RWF (Rwandan Francs)

-- Shoes
UPDATE public.products SET price_rwf = 29000 WHERE id = 'jordan-4-retro-universal-blue';
UPDATE public.products SET price_rwf = 28000 WHERE id = 'air-jordan-retro-4-oreo-shoes-for-men';
UPDATE public.products SET price_rwf = 29500 WHERE id = 'air-force-1';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'luis-vuitton-air-force-1';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'dark-air-jordan-4';
UPDATE public.products SET price_rwf = 28000 WHERE id = 'high-fade-puma';
UPDATE public.products SET price_rwf = 26000 WHERE id = 'air-jordan-1-ice-blue';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'air-jordan-11';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'air-jordan-11-retro-dmp-gratitude-black-white-metallic-gold';
UPDATE public.products SET price_rwf = 35000 WHERE id = 'travis-scott-x-nike-air-max-1-baroque-brown';
UPDATE public.products SET price_rwf = 28800 WHERE id = 'canvas-new-balance-xc-72-beige-black-snekers';
UPDATE public.products SET price_rwf = 35000 WHERE id = 'louis-vuitton-skate-sneaker';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'nike-air-max-90-tan-olive-orange';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'reebok-unisex-adult-zig-kinetica-edge-sneaker';
UPDATE public.products SET price_rwf = 29000 WHERE id = 'converse-chuck-taylor';
UPDATE public.products SET price_rwf = 28000 WHERE id = 'jordan-1-low-brown';
UPDATE public.products SET price_rwf = 32000 WHERE id = 'air-jordan-4-black-white-gray';
-- T-Shirts & Tops
UPDATE public.products SET price_rwf = 8000 WHERE id = 'plain-casual-t-shirt';
UPDATE public.products SET price_rwf = 9750 WHERE id = 'supreme-t-shirt';
UPDATE public.products SET price_rwf = 8350 WHERE id = 'nike-t-shirt';
UPDATE public.products SET price_rwf = 14600 WHERE id = 'black-and-white-shirt';
UPDATE public.products SET price_rwf = 7500 WHERE id = 'women-shirts-and-blouse';
UPDATE public.products SET price_rwf = 15000 WHERE id = 'palm-angels';
UPDATE public.products SET price_rwf = 12000 WHERE id = 'brooklyn';
UPDATE public.products SET price_rwf = 14000 WHERE id = 'supreme';
UPDATE public.products SET price_rwf = 10000 WHERE id = 'blackie';
UPDATE public.products SET price_rwf = 9000 WHERE id = 'h-smile';
-- Hoodies & Jackets
UPDATE public.products SET price_rwf = 16900 WHERE id = 'nike-blue-hoodie';
UPDATE public.products SET price_rwf = 15000 WHERE id = 'brown-jumper-hoodie';
UPDATE public.products SET price_rwf = 10000 WHERE id = 'crop-top-sweatshirts';
UPDATE public.products SET price_rwf = 11100 WHERE id = 'polo-brown-jacket';
UPDATE public.products SET price_rwf = 18000 WHERE id = 'essentials';
UPDATE public.products SET price_rwf = 12000 WHERE id = 'g-vest';
-- Pants & Bottoms
UPDATE public.products SET price_rwf = 12200 WHERE id = 'black-fades-jeans';
UPDATE public.products SET price_rwf = 15000 WHERE id = 'levis-vintage-jeans';
UPDATE public.products SET price_rwf = 17300 WHERE id = 'pocket-sides-cargo-pants';
UPDATE public.products SET price_rwf = 18800 WHERE id = 'mens-track-pants';
UPDATE public.products SET price_rwf = 18300 WHERE id = 'stylish-pocket-pants';
-- Outfits & Sets
UPDATE public.products SET price_rwf = 17800 WHERE id = 't-shirt-suit-two-piece-set';
UPDATE public.products SET price_rwf = 30000 WHERE id = 'tommy-hilfiger-complete-tracksuit';
UPDATE public.products SET price_rwf = 31700 WHERE id = 'men-plus-flap-pocket-shirt-outfit';
-- Sports Jerseys
UPDATE public.products SET price_rwf = 19000 WHERE id = 'manchester-united-24-25-jersey';
UPDATE public.products SET price_rwf = 23000 WHERE id = 'euro-france-jersey';
UPDATE public.products SET price_rwf = 23000 WHERE id = 'euro-germany-jersey';
UPDATE public.products SET price_rwf = 23000 WHERE id = 'euro-england-jersey';
UPDATE public.products SET price_rwf = 23000 WHERE id = 'euro-england-jersey-1';
-- Italy
UPDATE public.products SET price_rwf = 23000 WHERE id = 'euro-belgium-jersey';
-- Accessories
UPDATE public.products SET price_rwf = 4000 WHERE id = 'leather-bracelet';
UPDATE public.products SET price_rwf = 8000 WHERE id = 'crossfire-bracelets';
UPDATE public.products SET price_rwf = 5300 WHERE id = 'ny-hat-cap';
UPDATE public.products SET price_rwf = 7000 WHERE id = 'la-stylish-hat-cap';
UPDATE public.products SET price_rwf = 25000 WHERE id = 'nike-socks';
-- Log the update
DO $$
BEGIN
  RAISE NOTICE 'Product prices updated from Shopify store data';
END $$;

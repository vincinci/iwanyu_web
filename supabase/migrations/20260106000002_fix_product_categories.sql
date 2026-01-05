-- Update all product categories to main category names

-- Uncategorized and NULL -> Other
UPDATE products SET category = 'Other' WHERE category IS NULL;
UPDATE products SET category = 'Other' WHERE category = 'Uncategorized';

-- Shoes variations -> Shoes
UPDATE products SET category = 'Shoes' WHERE category = 'Sneakers';

-- Fashion variations -> Fashion
UPDATE products SET category = 'Fashion' WHERE category IN (
  'Dresses', 'T-Shirts', 'Shirts', 'Hoodies', 'Vests', 'Outfit Sets',
  'Coats & Jackets', 'Pants', 'Clothing Tops', 'Undershorts', 'Jackets',
  'Activewear', 'Sweaters', 'Crop Tops', 'Track Pants', 'Tank Tops'
);

-- Jewelry variations -> Jewelry
UPDATE products SET category = 'Jewelry' WHERE category IN ('Necklaces', 'Bracelets');

-- Sports variations -> Sports
UPDATE products SET category = 'Sports' WHERE category IN ('Sports Uniforms', 'Sporting Goods');

-- Home variations -> Home
UPDATE products SET category = 'Home' WHERE category = 'Wallpapers';

-- Electronics variations
UPDATE products SET category = 'Electronics' WHERE category = 'Cameras & Optics';

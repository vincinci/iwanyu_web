# Smart Auto-Categorization System

## Overview

The iwanyu marketplace uses an intelligent keyword-based categorization system that automatically assigns products to the correct categories based on their titles.

## How It Works

### Keyword Matching

Products are categorized by scanning their titles for specific keywords. The system checks categories in priority order (specific categories first, then general ones).

### Example Categorizations

#### Shoes Category 👟
**Keywords:** shoe, shoes, sneaker, sneakers, boot, boots, heel, heels, sandal, sandals, adidas, nike, new balance, trainer, slipper, loafer, footwear, award

**Examples:**
- "New Balance 1906R" → **Shoes** ✓
- "Nike Air Max" → **Shoes** ✓
- "Adidas Ultraboost" → **Shoes** ✓
- "Award Ceremony Heels" → **Shoes** ✓

#### Fashion Category 👕
**Keywords:** dress, dresses, shirt, t-shirt, tshirt, pant, pants, pantaloon, trouser, jumper, hoodie, hoodies, sweater, jacket, coat, jeans, skirt, blouse, top, polo, legging, short, shorts

**Examples:**
- "Summer Dress" → **Fashion** ✓
- "Cotton T-Shirt" → **Fashion** ✓
- "Men's Pantaloons" → **Fashion** ✓
- "Hooded Jumper" → **Fashion** ✓
- "Winter Hoodie" → **Fashion** ✓

#### Jewelry Category 💍
**Keywords:** jewelry, jewellery, necklace, necklaces, bracelet, bracelets, earring, earrings, ring, rings, chain, pendant, watch, watches

**Examples:**
- "bopbee Necklaces" → **Jewelry** ✓
- "Crossdire Bracelets" → **Jewelry** ✓
- "Gold Chain Necklace" → **Jewelry** ✓

#### Electronics & Tech 📱
**Phone Keywords:** phone, smartphone, iphone, android, mobile, cell, samsung
**Laptop Keywords:** laptop, notebook, macbook, chromebook
**Electronics Keywords:** electronic, electronics, gadget, camera, charger, adapter, cable

**Examples:**
- "iPhone 15 Pro" → **Phones** ✓
- "MacBook Pro M3" → **Laptops** ✓
- "USB-C Charger" → **Electronics** ✓

#### Home & Kitchen 🏠
**Home Keywords:** home, decor, bedding, household, wallpaper, wallpapers, furniture, lamp, cushion, pillow, curtain
**Kitchen Keywords:** kitchen, cookware, utensil, pot, pan, appliance, blender

**Examples:**
- "Floral Wallpapers" → **Home** ✓
- "Non-Stick Pan Set" → **Kitchen** ✓

#### Other Categories 💄
- **Beauty:** cosmetic, makeup, perfume, lipstick, skincare
- **Bags:** bag, backpack, handbag, purse, luggage
- **Sports:** sport, sports, gym, athletic, workout
- **Toys:** toy, toys, kids, children, baby
- **Books:** book, books, stationery, pen
- **Gaming:** game, console, playstation, xbox
- **Health:** health, wellness, supplement, vitamin

## Running Auto-Categorization

### For New Products

The system automatically categorizes new products when they're added to the database.

### For Existing Products

To recategorize all existing products:

```bash
node auto-categorize.mjs
```

This will:
1. Fetch all products from the database
2. Analyze each product title against keyword rules
3. Update products with new categories (batch update)
4. Show before/after category distribution

### Example Output

```
🤖 Smart Product Auto-Categorization

📦 Analyzing 160 products...

📊 Found 154 products to recategorize:

   Shoes: 30 products
   Fashion: 37 products
   Jewelry: 5 products
   Home: 2 products
   Kitchen: 2 products
   Books: 3 products
   Other: 75 products

🔄 Sample changes (first 10):

1. "New Balance 1906R..."
   Sneakers → Shoes

2. "Summer Dress..."
   Dresses → Fashion

3. "Crossdire Bracelets..."
   Necklaces → Jewelry

💾 Applying 154 updates...
   ✓ 154/154 updated...

✅ Done! Successfully updated 154 products
```

## Technical Implementation

### Database Structure

Products in the database may have granular categories like:
- "Sneakers" (specific)
- "T-Shirts" (specific)
- "Necklaces" (specific)

These are automatically normalized to main categories:
- "Sneakers" → **Shoes**
- "T-Shirts" → **Fashion**
- "Necklaces" → **Jewelry**

### Frontend Normalization

The `normalizeCategoryName()` function in `src/lib/categories.ts` performs keyword matching:

```typescript
function normalizeCategoryName(raw: string): string {
  const value = String(raw ?? "").trim();
  const key = value.toLowerCase();
  
  // Check exact matches first
  const byName = CATEGORY_BY_NAME_KEY.get(key);
  if (byName) return byName.name;
  
  // Check keyword matches
  for (const cat of CATEGORIES) {
    if (!cat.keywords || cat.keywords.length === 0) continue;
    for (const kw of cat.keywords) {
      if (key.includes(kw)) return cat.name;
    }
  }
  
  return "Other";
}
```

### Homepage Product Grouping

The homepage uses `normalizeCategoryName` to group products:

```typescript
const productsByCategory = CATEGORIES.map(category => {
  const categoryProducts = products.filter(product => {
    const normalizedProductCategory = normalizeCategoryName(product.category);
    return normalizedProductCategory === category.name;
  });
  return { category, products: categoryProducts };
});
```

## Adding New Keywords

To add new keywords for categorization:

1. Edit `auto-categorize.mjs` and add keywords to `CATEGORY_RULES`
2. Edit `src/lib/categories.ts` and add keywords to `CATEGORIES` array
3. Run `node auto-categorize.mjs` to recategorize existing products
4. Commit and deploy changes

### Example: Adding "Boots" Keyword

```javascript
// In auto-categorize.mjs and src/lib/categories.ts
{
  category: 'Shoes',
  keywords: [
    'shoe', 'shoes', 'sneaker', 'sneakers',
    'boot', 'boots', 'chelsea boot', 'combat boot', // Added boot variants
    // ... other keywords
  ]
}
```

## Benefits

✅ **Automatic:** New products are categorized without manual intervention
✅ **Flexible:** Handles both exact matches and keyword-based matching
✅ **Maintainable:** Easy to add new keywords or categories
✅ **Efficient:** Batch updates minimize database operations
✅ **User-Friendly:** Products appear in correct category sections on homepage

## Maintenance

### Regular Checks

1. Run `node auto-categorize.mjs` monthly to catch any miscategorized products
2. Review "Other" category products to identify missing keywords
3. Update keyword lists based on new product types

### Monitoring

Check category distribution:
```bash
node auto-categorize.mjs
# Review the "Final Category Distribution" output
```

If "Other" category has too many products (>10% of total), review those products and add missing keywords.

## Files

- `auto-categorize.mjs` - Main categorization script
- `src/lib/categories.ts` - Category definitions and normalization logic
- `src/pages/Index.tsx` - Homepage using normalized categories
- `SMART_CATEGORIZATION.md` - This documentation

## Last Updated

- **Date:** January 6, 2026
- **Products Processed:** 160
- **Products Recategorized:** 154
- **Categories Active:** 17 (Shoes, Fashion, Jewelry, Phones, Laptops, etc.)

# Product Creation & Publishing - Deep Test Guide

## Overview
This guide provides comprehensive manual testing steps for the complete product creation and publishing flow in the iwanyu marketplace.

## Prerequisites
- ✅ Development server running (`npm run dev`)
- ✅ Supabase backend connected
- ✅ Cloudinary configured (for image uploads)
- ✅ Test user account with seller permissions

## Test Credentials
For manual testing, you'll need either:
- **Seller Account**: A user with an approved vendor
- **Admin Account**: Full access to create vendors and products

---

## Test 1: Complete Product Creation Flow

### 1.1 Authentication
1. Navigate to `http://localhost:8081/login`
2. Enter credentials:
   - Email: Your seller account email
   - Password: Your password
3. Click "Sign in"
4. ✅ **Verify**: Redirected to account/dashboard page

### 1.2 Navigate to Product Creation
1. Click on "Seller Products" or navigate to `/seller/products`
2. ✅ **Verify**: Product list page loads
3. Click "New Product" button
4. ✅ **Verify**: Redirected to `/seller/products/new`
5. ✅ **Verify**: Page title shows "Create product"

### 1.3 Fill Basic Product Information

#### Vendor Selection
- ✅ **Verify**: Vendor dropdown is pre-populated with approved vendors
- If no vendors: System should show message "No approved store yet"
- **Action**: Select a vendor from the dropdown

#### Product Title
- **Field**: Title input
- **Test Value**: `Premium Cotton T-Shirt - Test ${Date.now()}`
- **Expected**: Input accepts text, min 3 characters

#### Product Description
- **Field**: Description textarea
- **Test Value**: 
  ```
  High-quality premium cotton t-shirt with modern fit.
  Features: 100% cotton, breathable fabric, durable stitching.
  Perfect for casual wear and all-day comfort.
  ```
- **Expected**: Multiline text accepted

#### Category Selection
- **Action**: Click category dropdown
- **Test Value**: Select "Electronics" or "Clothing"
- ✅ **Verify**: Category options visible and selectable

#### Price
- **Field**: Price input (RWF)
- **Test Value**: `25000`
- ✅ **Verify**: Numeric input, proper formatting

#### Stock Status
- **Field**: Stock dropdown
- **Test Value**: "In stock"
- ✅ **Verify**: Toggle between "In stock" and "Out of stock"

#### Discount
- **Field**: Discount percentage
- **Test Value**: `15`
- ✅ **Verify**: Accepts 0-100 range

### 1.4 Upload Product Media

#### Single Image Upload
1. Click "Add media" button or drag & drop zone
2. Select a test image file (< 8MB)
3. ✅ **Verify**: 
   - Preview thumbnail appears
   - Image shows in gallery
   - Media counter shows "1/8"
   - "Primary" badge appears on first image

#### Multiple Images
1. Upload 2-3 additional images
2. ✅ **Verify**:
   - All thumbnails appear in gallery
   - Counter updates (e.g., "3/8")
   - Can click thumbnails to set as primary

#### Set Primary Image
1. Click on the second thumbnail
2. ✅ **Verify**: "Primary" badge moves to selected image

#### Remove Media
1. Click trash icon on any thumbnail
2. ✅ **Verify**:
   - Image removed from gallery
   - Counter decrements
   - If primary removed, next image becomes primary

### 1.5 Configure Product Variants

#### Default Colors
- ✅ **Verify**: Default colors present: Black, White, Red
- Each color shows:
  - Color swatch (correct hex)
  - Color name
  - Remove button (×)

#### Add Custom Color
1. Find "Add a color" input
2. Enter color name: `Navy Blue`
3. Click + button
4. ✅ **Verify**:
   - Color appears in list
   - Color swatch displays (auto-mapped to #1e3a8a or similar)
5. Repeat with hex value: `#166534`
6. ✅ **Verify**: Hex code accepted and rendered correctly

#### Remove Color
1. Click × on any color chip
2. ✅ **Verify**: Color removed from list

#### Default Sizes
- ✅ **Verify**: Default sizes present: S, M, L, XL

#### Add Custom Size
1. Find "Add a size" input
2. Enter: `XXL`
3. Click + button
4. ✅ **Verify**: Size appears in list

#### Remove Size
1. Click × on any size chip
2. ✅ **Verify**: Size removed from list

#### Disable Variants
1. Click "Disable" button in Variants section
2. ✅ **Verify**:
   - Message shows "Variants are disabled"
   - Color and size options hidden
3. Click "Enable" to restore
4. ✅ **Verify**: Variant options reappear

### 1.6 Publish Product

#### Pre-Publish Validation
- ✅ **Verify**: "Ready to publish" section shows:
  - ✅ "Looks good" indicator with green checkmark
  - Media count: X/8
  - Variants status: "5 colors · 5 sizes" or "Off"

#### Publish Button States
- With incomplete form:
  - ✅ **Verify**: Button is disabled
  - ✅ **Verify**: Tooltip/message indicates missing fields
- With complete form:
  - ✅ **Verify**: Button is enabled and shows "Publish product"

#### Publish Action
1. Click "Publish product" button
2. ✅ **Verify**: Button text changes to "Uploading..."
3. ✅ **Verify**: Button becomes disabled during upload
4. **Wait for**: Upload completion (may take 5-30 seconds)
5. ✅ **Verify**: Success toast appears: "Product uploaded" / "Your product is live"
6. ✅ **Verify**: Redirected to `/seller/products`

---

## Test 2: Verify Published Product

### 2.1 Product List View
1. On `/seller/products` page
2. ✅ **Verify**: New product appears in list
3. ✅ **Verify**: Product card shows:
   - Product title
   - Vendor name
   - Price (formatted: "25,000 RWF")
   - Stock status: "In stock"
   - "View" button

### 2.2 Product Detail Page
1. Click "View" button on the new product
2. ✅ **Verify**: Redirected to `/product/p_XXXXXXXXXX`
3. ✅ **Verify**: Page displays:
   - Product title (h1 or prominent heading)
   - Product description
   - Price with currency
   - Discount badge (if applicable)
   - Category breadcrumb or badge
   - Vendor information
   - "Add to Cart" button

### 2.3 Media Gallery
- ✅ **Verify**: Primary image displays in main viewer
- ✅ **Verify**: Thumbnail gallery below/beside main image
- Click different thumbnails:
  - ✅ **Verify**: Main image switches to selected thumbnail
  - ✅ **Verify**: Smooth transition animation (if implemented)
- If video uploaded:
  - ✅ **Verify**: Video thumbnail has play indicator
  - ✅ **Verify**: Clicking video loads video player

### 2.4 Variant Display
- ✅ **Verify**: "Color" section visible
- ✅ **Verify**: Color options rendered as:
  - Buttons or swatches
  - Each showing color name and visual representation
- ✅ **Verify**: "Size" section visible
- ✅ **Verify**: Size options rendered as buttons/pills

### 2.5 Variant Selection
1. Click a color option (e.g., "Navy Blue")
2. ✅ **Verify**: Color button shows selected state (highlight/border)
3. Click a size option (e.g., "M")
4. ✅ **Verify**: Size button shows selected state
5. ✅ **Verify**: Price remains consistent (variants don't affect base price currently)

### 2.6 Add to Cart
1. With color & size selected, click "Add to Cart"
2. ✅ **Verify**: Success feedback (toast notification)
3. ✅ **Verify**: Cart icon badge increments
4. Navigate to cart (`/cart`)
5. ✅ **Verify**: Product appears in cart with:
   - Selected color
   - Selected size
   - Correct price
   - Correct quantity (1)

---

## Test 3: Product Visibility in Marketplace

### 3.1 Homepage
1. Navigate to `/` (homepage)
2. Scroll through featured/recent products
3. ✅ **Verify**: New product may appear (depends on sorting/filtering)

### 3.2 Category Page
1. Navigate to category page: `/category/{category-name}`
   - Use the category you selected during creation
2. ✅ **Verify**: Product appears in category listing
3. ✅ **Verify**: Product card displays correctly:
   - Thumbnail image (primary image)
   - Title
   - Price
   - Discount badge (if applicable)

### 3.3 Search Functionality
1. Use search bar (if implemented)
2. Search for product title keywords
3. ✅ **Verify**: Product appears in search results

---

## Test 4: Database Verification

### 4.1 Products Table
Using Supabase dashboard or SQL:
```sql
SELECT * FROM products 
WHERE title LIKE '%Test%' 
ORDER BY created_at DESC 
LIMIT 5;
```
✅ **Verify**:
- Product row exists
- `vendor_id` matches selected vendor
- `price_rwf` is correct (25000)
- `in_stock` is true
- `discount_percentage` is correct (15)
- `variants` column contains JSON:
  ```json
  {
    "colors": [...],
    "sizes": [...]
  }
  ```

### 4.2 Product Media Table
```sql
SELECT * FROM product_media 
WHERE product_id = 'p_XXXXXXXXXX' 
ORDER BY position ASC;
```
✅ **Verify**:
- One row per uploaded image
- `kind` is "image" or "video"
- `url` contains Cloudinary URL
- `public_id` contains Cloudinary public ID
- `position` is sequential (0, 1, 2...)
- `vendor_id` matches product's vendor

---

## Test 5: Edge Cases & Error Handling

### 5.1 Incomplete Form Submission
1. Fill only title and price
2. Leave category blank
3. ✅ **Verify**: Publish button remains disabled
4. ✅ **Verify**: Helpful message indicates what's missing

### 5.2 Large File Upload
1. Attempt to upload image > 8MB
2. ✅ **Verify**: Error toast appears
3. ✅ **Verify**: File is rejected, not added to media list

### 5.3 Maximum Media Limit
1. Upload 8 images (the maximum)
2. ✅ **Verify**: Counter shows "8/8"
3. Attempt to add 9th image
4. ✅ **Verify**: Image is rejected or queue is trimmed to 8

### 5.4 Cloudinary Upload Failure
This requires network interruption or Cloudinary credentials issue:
1. Fill product form completely
2. Upload media
3. Click publish
4. If upload fails:
   - ✅ **Verify**: Error toast appears with clear message
   - ✅ **Verify**: User remains on creation page
   - ✅ **Verify**: Form data is preserved

### 5.5 No Vendor Available
1. Sign in with account that has no approved vendors
2. Navigate to `/seller/products/new`
3. ✅ **Verify**: Warning message appears:
   - "No approved store yet"
   - Link to vendor application/onboarding
4. ✅ **Verify**: Publish button is disabled

---

## Test 6: Product Variants Deep Dive

### 6.1 Variants Data Persistence
1. Create product with:
   - Colors: Black, White, Navy Blue, Forest Green
   - Sizes: S, M, L, XL, XXL
2. Publish product
3. Query database:
```sql
SELECT variants FROM products WHERE id = 'p_XXXXXXXXXX';
```
4. ✅ **Verify** JSON structure:
```json
{
  "colors": [
    {"name": "Black", "hex": "#111827"},
    {"name": "White", "hex": "#ffffff"},
    {"name": "Navy Blue", "hex": "#1e3a8a"},
    {"name": "Forest Green", "hex": "#166534"}
  ],
  "sizes": ["S", "M", "L", "XL", "XXL"]
}
```

### 6.2 Variant Display on Product Page
1. Navigate to product detail page
2. ✅ **Verify**: All colors render with correct swatches
3. ✅ **Verify**: Color hex codes match database
4. ✅ **Verify**: All sizes render as selectable options

### 6.3 Product Without Variants
1. Create new product
2. Disable variants before publishing
3. Publish product
4. Navigate to product page
5. ✅ **Verify**: No color/size selectors appear
6. ✅ **Verify**: Can still add to cart without selecting variants
7. Check database:
```sql
SELECT variants FROM products WHERE id = 'p_XXXXXXXXXX';
```
8. ✅ **Verify**: `variants` column is NULL or empty

---

## Test 7: Media Gallery Advanced

### 7.1 Primary Image Switching
1. Product with 4 images uploaded
2. During creation, click 3rd thumbnail to set as primary
3. ✅ **Verify**: "Primary" badge moves to 3rd image
4. Publish product
5. Navigate to product page
6. ✅ **Verify**: 3rd image appears as main image by default

### 7.2 Video Upload (if supported)
1. Create new product
2. Upload video file (< 50MB)
3. ✅ **Verify**: Video thumbnail shows in gallery
4. ✅ **Verify**: Video preview plays in creation page
5. Publish product
6. On product page:
   - ✅ **Verify**: Video thumbnail in gallery
   - Click video thumbnail
   - ✅ **Verify**: Video plays in main viewer

### 7.3 Mixed Media (Images + Video)
1. Upload 2 images + 1 video
2. ✅ **Verify**: All 3 items appear in gallery
3. Set video as primary (if allowed)
4. Publish and view
5. ✅ **Verify**: Appropriate media type displays

---

## Test 8: Permissions & Access Control

### 8.1 Seller Permission Check
1. Sign in as regular customer (no seller role)
2. Navigate directly to `/seller/products/new`
3. ✅ **Verify**: Redirected or access denied message

### 8.2 Vendor Ownership
1. Sign in as Seller A with Vendor "Store A"
2. Create product under Vendor "Store A"
3. Sign out, sign in as Seller B with Vendor "Store B"
4. Navigate to `/seller/products`
5. ✅ **Verify**: Seller B does NOT see Seller A's product
6. ✅ **Verify**: Seller B only sees products from "Store B"

### 8.3 Admin Override
1. Sign in as admin
2. Navigate to `/seller/products/new`
3. ✅ **Verify**: Can create vendor on the fly
4. ✅ **Verify**: Can see all vendors in dropdown
5. Create product under any vendor
6. ✅ **Verify**: Publish succeeds
7. Navigate to `/seller/products`
8. ✅ **Verify**: Admin sees ALL products from all vendors

---

## Test 9: RLS Policy Verification

### 9.1 Product Insert Permission
Using authenticated session in Supabase dashboard:
1. Sign in as seller with vendor ownership
2. Run:
```sql
INSERT INTO products (vendor_id, title, price_rwf, category, in_stock)
VALUES ('{owned_vendor_id}', 'RLS Test Product', 10000, 'Test', true)
RETURNING *;
```
3. ✅ **Verify**: Insert succeeds (RLS policy allows)
4. Try with vendor_id you don't own:
```sql
INSERT INTO products (vendor_id, title, price_rwf, category, in_stock)
VALUES ('{other_vendor_id}', 'RLS Test Fail', 10000, 'Test', true);
```
5. ✅ **Verify**: Insert is blocked by RLS

### 9.2 Product Media Insert Permission
1. Create product (get product_id)
2. Insert media row:
```sql
INSERT INTO product_media (product_id, vendor_id, kind, url, public_id, position)
VALUES ('p_XXXXX', '{owned_vendor_id}', 'image', 'https://...', 'test_public_id', 0)
RETURNING *;
```
3. ✅ **Verify**: Insert succeeds
4. Try with vendor_id you don't own:
5. ✅ **Verify**: Insert is blocked by RLS

---

## Test 10: Performance & UX

### 10.1 Form Responsiveness
- Fill title: ✅ No lag
- Switch categories: ✅ Instant dropdown
- Add colors/sizes: ✅ Immediate UI update
- Remove variants: ✅ Smooth removal

### 10.2 Image Upload Speed
1. Upload 1MB image
2. ✅ **Measure**: Time to preview (should be < 1 second)
3. Upload 5MB image
4. ✅ **Measure**: Time to preview (should be < 2 seconds)

### 10.3 Publishing Time
1. Product with 1 image
   - ✅ **Expected**: < 5 seconds to publish
2. Product with 5 images
   - ✅ **Expected**: < 15 seconds to publish
3. Product with 8 images
   - ✅ **Expected**: < 30 seconds to publish

### 10.4 Mobile Responsiveness
Using browser DevTools mobile emulation:
1. iPhone SE (375px width)
   - ✅ Form elements stack vertically
   - ✅ Buttons are tap-friendly (min 44px)
   - ✅ Media gallery is scrollable/swipeable
2. iPad (768px width)
   - ✅ Two-column layout works
   - ✅ Media thumbnails properly sized

---

## Test 11: Data Integrity

### 11.1 Price Formatting
1. Enter price: `25000.50`
2. ✅ **Verify**: Stored as `25001` (rounded to int in RWF)
3. On product page: ✅ Displays as "25,001 RWF"

### 11.2 Discount Clamping
1. Enter discount: `-5`
2. ✅ **Verify**: Stored as `0` (min clamp)
3. Enter discount: `150`
4. ✅ **Verify**: Stored as `100` (max clamp)

### 11.3 Special Characters in Title
1. Title: `Test Product™ with "Quotes" & Symbols`
2. ✅ **Verify**: Saved and displayed correctly
3. ✅ **Verify**: No SQL injection or XSS issues

---

## Test 12: Error Recovery

### 12.1 Network Interruption
1. Start creating product
2. Fill all fields, add media
3. Before publishing, disconnect network
4. Click "Publish product"
5. ✅ **Verify**: Error toast appears
6. Reconnect network
7. Click "Publish product" again
8. ✅ **Verify**: Upload succeeds (form data preserved)

### 12.2 Browser Refresh
1. Fill product form halfway
2. Refresh browser (F5)
3. ✅ **Verify**: Form data is lost (no localStorage persistence currently)
4. **Note**: Consider implementing draft save feature

---

## Success Criteria Summary

### Core Functionality
- ✅ Product creation form loads without errors
- ✅ All form fields accept and validate input
- ✅ Media upload to Cloudinary succeeds
- ✅ Variants (colors, sizes) can be added/removed
- ✅ Publish button correctly validates required fields
- ✅ Product is saved to database with correct data
- ✅ Product media is saved to `product_media` table
- ✅ Product appears in seller's product list
- ✅ Product detail page displays all information
- ✅ Product appears in marketplace category pages

### Database Integrity
- ✅ Products table has correct vendor_id, price, variants
- ✅ Product_media table has correct URLs and positions
- ✅ RLS policies enforce vendor ownership
- ✅ Foreign key constraints maintained

### User Experience
- ✅ Form is responsive and mobile-friendly
- ✅ Upload progress is indicated
- ✅ Success/error feedback is clear
- ✅ Navigation flows logically
- ✅ Performance is acceptable (< 30s for full upload)

---

## Issues Found During Testing

Document any issues here:

1. **Issue**: [Description]
   - **Severity**: High/Medium/Low
   - **Steps to reproduce**: ...
   - **Expected**: ...
   - **Actual**: ...

2. **Issue**: ...

---

## Recommendations

Based on testing, consider:
- ✅ Cloudinary integration working
- ✅ Variant system functional
- ✅ RLS policies properly configured
- 🔄 Add form draft saving to localStorage
- 🔄 Add bulk image upload optimization
- 🔄 Implement variant pricing (different prices per size/color)
- 🔄 Add product preview before publish
- 🔄 Add product editing capability
- 🔄 Add product analytics/views tracking

---

## Testing Complete

Date: _______________  
Tester: _______________  
Environment: Development / Staging / Production  
Status: ✅ Pass / ❌ Fail / ⚠️ Partial

Notes:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

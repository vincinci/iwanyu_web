# iwanyu Marketplace - Manual Testing Checklist

## Test Date: January 6, 2026
## Environment: Local Development (http://localhost:8081)

---

## ✅ 1. AUTHENTICATION FEATURES

### 1.1 User Registration (Sign Up)
- [ ] Navigate to `/signup`
- [ ] Enter email: test@example.com
- [ ] Enter password: Test123!
- [ ] Enter full name: Test User
- [ ] Click "Create account"
- [ ] **Expected**: User should be created and redirected to `/account`
- [ ] **Verify**: Check browser console for successful auth
- [ ] **Verify**: Check Supabase auth.users table for new user

### 1.2 User Login
- [ ] Sign out if logged in
- [ ] Navigate to `/login`
- [ ] Enter email: test@example.com
- [ ] Enter password: Test123!
- [ ] Click "Sign in"
- [ ] **Expected**: User should be logged in and redirected to `/account`
- [ ] **Verify**: Header should show profile dropdown instead of "Sign in" button
- [ ] **Verify**: Profile picture or avatar initial should display

### 1.3 User Logout
- [ ] Click on profile dropdown in header
- [ ] Click "Sign Out" button
- [ ] **Expected**: User should be logged out
- [ ] **Verify**: Header should show "Sign in" button
- [ ] **Verify**: Redirected to homepage

### 1.4 Google OAuth (Optional)
- [ ] Navigate to `/login` or `/signup`
- [ ] Click "Continue with Google"
- [ ] **Expected**: Google OAuth popup should appear
- [ ] **Note**: Requires valid Google OAuth setup in Supabase

---

## ✅ 2. SELLER ACCOUNT CREATION

### 2.1 Apply to Become Seller
- [ ] Log in as a buyer account
- [ ] Navigate to `/vendor-application`
- [ ] Enter store name: "Test Store"
- [ ] Enter location: "Kigali, Rwanda"
- [ ] Click "Next" through steps
- [ ] Click "Submit Application"
- [ ] **Expected**: Vendor should be created in database
- [ ] **Expected**: User role should be updated to "seller"
- [ ] **Expected**: Redirected to `/seller` dashboard
- [ ] **Verify**: Check `vendors` table in Supabase
- [ ] **Verify**: Check `profiles` table - role should be "seller"

### 2.2 Access Seller Dashboard
- [ ] Navigate to `/seller`
- [ ] **Expected**: Seller dashboard should load
- [ ] **Verify**: Shows store name and stats
- [ ] **Verify**: Links to Products, Orders visible

---

## ✅ 3. PRODUCT MANAGEMENT

### 3.1 Add New Product
- [ ] Log in as seller
- [ ] Navigate to `/seller/products/new`
- [ ] Select vendor from dropdown
- [ ] Enter product title: "Test Product"
- [ ] Enter description: "This is a test product"
- [ ] Select category: "Shoes"
- [ ] Enter price: 50000 (RWF)
- [ ] Enter discount: 10 (%)
- [ ] Upload product image (optional)
- [ ] Toggle "In stock" switch to ON
- [ ] Click "Create product"
- [ ] **Expected**: Product should be created
- [ ] **Expected**: Redirected to `/seller/products`
- [ ] **Verify**: Product appears in seller products list
- [ ] **Verify**: Check `products` table in Supabase
- [ ] **Verify**: Product shows on homepage

### 3.2 View Product List
- [ ] Navigate to `/seller/products`
- [ ] **Expected**: All seller's products should be listed
- [ ] **Verify**: Shows product title, price, stock status
- [ ] **Verify**: "View" and "Delete" buttons visible

### 3.3 Delete Product
- [ ] Navigate to `/seller/products`
- [ ] Click "Delete" button on a test product
- [ ] **Expected**: Toast notification shows "Product removed"
- [ ] **Expected**: Product disappears from list
- [ ] **Verify**: Product removed from `products` table
- [ ] **Verify**: Product no longer appears on homepage

---

## ✅ 4. SHOPPING FEATURES

### 4.1 Browse Products
- [ ] Navigate to homepage `/`
- [ ] **Expected**: Product grid should display with all products
- [ ] **Verify**: Products show in 2-5 column responsive grid
- [ ] **Verify**: Category filter tabs show correct counts
- [ ] **Verify**: "All Products (160)" tab displays

### 4.2 Filter by Category
- [ ] Click "Shoes" category tab
- [ ] **Expected**: Only shoe products should display
- [ ] **Verify**: Product count matches category count
- [ ] Click "All Products" tab
- [ ] **Expected**: All products should display again

### 4.3 Search Products
- [ ] In header search bar, type "shoes"
- [ ] Click "Search" button or press Enter
- [ ] **Expected**: Navigate to `/search?q=shoes`
- [ ] **Expected**: Search results page shows matching products
- [ ] **Verify**: Result count is displayed
- [ ] **Verify**: Products match search query

### 4.4 View Product Details
- [ ] Click on any product card
- [ ] **Expected**: Navigate to `/product/{id}`
- [ ] **Expected**: Product details page shows:
  - [ ] Product images
  - [ ] Title, price, description
  - [ ] Category, stock status
  - [ ] Add to cart button
  - [ ] Quantity selector

### 4.5 Add Product to Cart
- [ ] On product detail page, click "Add to Cart"
- [ ] **Expected**: Toast shows "Added to cart"
- [ ] **Expected**: Cart icon in header shows item count badge
- [ ] **Verify**: Cart count increases
- [ ] Hover over product card on homepage
- [ ] Click quick "Add to Cart" button
- [ ] **Expected**: Product added to cart

### 4.6 Add to Wishlist
- [ ] Click heart icon on product card
- [ ] **Expected**: Heart icon fills/changes color
- [ ] **Expected**: Product added to wishlist
- [ ] Navigate to `/wishlist`
- [ ] **Expected**: Product appears in wishlist

---

## ✅ 5. CART & CHECKOUT

### 5.1 View Cart
- [ ] Click cart icon in header or navigate to `/cart`
- [ ] **Expected**: Cart page shows all added items
- [ ] **Verify**: Shows product image, title, price
- [ ] **Verify**: Quantity controls (+/-) work
- [ ] **Verify**: Line total updates when quantity changes
- [ ] **Verify**: Subtotal is correct

### 5.2 Update Cart Quantity
- [ ] Click "+" button on an item
- [ ] **Expected**: Quantity increases
- [ ] **Expected**: Line total and subtotal update
- [ ] Click "-" button
- [ ] **Expected**: Quantity decreases

### 5.3 Remove from Cart
- [ ] Click trash icon on a cart item
- [ ] **Expected**: Item removed from cart
- [ ] **Expected**: Cart updates immediately
- [ ] Click "Clear cart" button
- [ ] **Expected**: All items removed

### 5.4 Proceed to Checkout
- [ ] Add products to cart
- [ ] Navigate to `/cart`
- [ ] Click "Checkout" button
- [ ] **Expected**: Navigate to `/checkout`
- [ ] **Expected**: Checkout page loads with cart items

### 5.5 Complete Checkout Form
- [ ] Enter email: test@example.com
- [ ] Enter address: "123 Test Street, Kigali"
- [ ] Select payment method: Mobile Money
- [ ] Select network: MTN
- [ ] Enter phone: 0780000000
- [ ] **Verify**: "Place order" button becomes enabled
- [ ] **Verify**: Form validation works

### 5.6 Place Order (Payment)
- [ ] Click "Place order" button
- [ ] **Expected**: Order created in database
- [ ] **Expected**: Flutterwave payment modal opens
- [ ] **Expected**: Order ID and transaction reference created
- [ ] **Verify**: Check `orders` table in Supabase
- [ ] **Verify**: Check `order_items` table
- [ ] **Note**: Test payment in sandbox mode
- [ ] After payment: Cart should be cleared
- [ ] After payment: Redirected to order confirmation

---

## ✅ 6. ORDER MANAGEMENT

### 6.1 View Orders (Buyer)
- [ ] Navigate to `/orders`
- [ ] **Expected**: Shows all user's orders
- [ ] **Verify**: Displays order number, date, status, total
- [ ] Click on an order
- [ ] **Expected**: Shows order details

### 6.2 View Orders (Seller)
- [ ] Log in as seller
- [ ] Navigate to `/seller/orders`
- [ ] **Expected**: Shows orders for seller's products
- [ ] **Verify**: Shows customer info, product details
- [ ] **Verify**: Can update order status

---

## ✅ 7. ADDITIONAL FEATURES

### 7.1 Account Page
- [ ] Navigate to `/account`
- [ ] **Expected**: Shows user profile info
- [ ] **Verify**: Can view/edit email, name
- [ ] **Verify**: Shows order history
- [ ] **Verify**: Shows wishlist items

### 7.2 Responsive Design
- [ ] Resize browser to mobile width (< 768px)
- [ ] **Verify**: Mobile menu works
- [ ] **Verify**: Product grid shows 2 columns
- [ ] **Verify**: All features accessible on mobile

### 7.3 Loading States
- [ ] Refresh homepage
- [ ] **Verify**: Products load from Supabase
- [ ] **Verify**: No flash of empty state
- [ ] Check browser console for "Products loaded: X"

---

## ✅ 8. DATABASE VERIFICATION

### 8.1 Check Tables in Supabase
- [ ] Open Supabase dashboard
- [ ] Verify `products` table has 160 products
- [ ] Verify `vendors` table has test vendor
- [ ] Verify `orders` table has test orders
- [ ] Verify `order_items` table has order details
- [ ] Verify `profiles` table has user roles
- [ ] Verify `vendor_applications` table has applications

### 8.2 Check RLS Policies
- [ ] Verify anonymous users can read products
- [ ] Verify sellers can only edit their own products
- [ ] Verify buyers can read all products
- [ ] Verify orders are protected (users see only their orders)

---

## ✅ 9. ERROR HANDLING

### 9.1 Network Errors
- [ ] Disconnect internet
- [ ] Try to load homepage
- [ ] **Expected**: Graceful error message
- [ ] Reconnect internet
- [ ] **Expected**: Data loads successfully

### 9.2 Validation Errors
- [ ] Try to create product with empty title
- [ ] **Expected**: Form validation prevents submission
- [ ] Try to checkout with empty address
- [ ] **Expected**: Button disabled

### 9.3 Authentication Errors
- [ ] Try to access `/seller` without logging in
- [ ] **Expected**: Redirected to login page
- [ ] Try to access another seller's products
- [ ] **Expected**: Access denied or filtered out

---

## ✅ 10. PRODUCTION DEPLOYMENT

### 10.1 Verify Production Site
- [ ] Visit https://www.iwanyu.store
- [ ] Run all tests above on production
- [ ] **Verify**: Environment variables loaded
- [ ] **Verify**: Products display correctly
- [ ] **Verify**: All features work as expected

### 10.2 Performance
- [ ] Check page load time (< 3 seconds)
- [ ] Check bundle size (< 1MB gzipped)
- [ ] Test on slow 3G connection
- [ ] Verify images load optimally

---

## 📊 TEST RESULTS SUMMARY

### Passed: ____ / 100
### Failed: ____ / 100
### Blocked: ____ / 100

### Critical Issues Found:
1. 
2. 
3. 

### Non-Critical Issues:
1. 
2. 
3. 

### Recommendations:
1. 
2. 
3. 

---

## 🔍 QUICK AUTOMATED CHECKS

Run these commands to verify setup:

```bash
# Check products in database
node test-db.mjs

# Check RLS policies
node test-rls.mjs

# Build for production
npm run build

# Start dev server
npm run dev
```

---

## 📝 NOTES

- All tests should be performed on a fresh browser session
- Clear cache between tests if needed
- Use incognito/private mode for clean testing
- Document any unexpected behavior
- Take screenshots of critical issues

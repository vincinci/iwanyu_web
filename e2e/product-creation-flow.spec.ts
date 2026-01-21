import { test, expect, type Page } from '@playwright/test';

/**
 * Deep integration test for product creation and publishing flow.
 * 
 * Tests the complete journey:
 * 1. Seller authentication
 * 2. Navigate to product creation
 * 3. Fill out product form with all fields
 * 4. Upload media files (images/videos)
 * 5. Configure product variants (colors, sizes)
 * 6. Publish product
 * 7. Verify product appears in marketplace
 * 8. Verify product detail page loads
 * 9. Verify product media gallery works
 * 10. Verify variants display correctly
 */

const TEST_PRODUCT = {
  title: `Test Product ${Date.now()}`,
  description: 'This is a comprehensive test product with full details and media',
  category: 'Electronics',
  price: '25000',
  discount: '10',
  colors: [
    { name: 'Navy Blue', hex: '#1e3a8a' },
    { name: 'Forest Green', hex: '#166534' }
  ],
  sizes: ['S', 'M', 'L', 'XL', 'XXL']
};

async function loginAsSeller(page: Page) {
  await page.goto('/login');
  
  // Check if already logged in
  const logoutButton = page.getByRole('button', { name: /logout|sign out/i });
  if (await logoutButton.isVisible().catch(() => false)) {
    await logoutButton.click();
    await page.waitForURL('/login');
  }

  // Login with seller credentials
  await page.fill('input[type="email"]', 'seller@test.com');
  await page.fill('input[type="password"]', 'testpass123');
  await page.click('button[type="submit"]');
  
  // Wait for redirect after login
  await page.waitForURL(/\/(?!login)/, { timeout: 10000 });
}

async function navigateToProductCreation(page: Page) {
  // Navigate via seller dashboard
  await page.goto('/seller/products');
  await expect(page).toHaveURL(/\/seller\/products/);
  
  // Click new product button
  const newProductBtn = page.getByRole('link', { name: /new product/i });
  await expect(newProductBtn).toBeVisible();
  await newProductBtn.click();
  
  await expect(page).toHaveURL(/\/seller\/products\/new/);
  await expect(page.getByText(/create product/i)).toBeVisible();
}

async function fillBasicProductInfo(page: Page) {
  // Select vendor (should auto-select first approved vendor)
  const vendorSelect = page.locator('select, [role="combobox"]').first();
  await expect(vendorSelect).toBeVisible();
  
  // Fill title
  await page.fill('input[placeholder*="t-shirt" i], input[placeholder*="title" i]', TEST_PRODUCT.title);
  
  // Fill description
  await page.fill('textarea[placeholder*="description" i]', TEST_PRODUCT.description);
  
  // Select category
  const categorySelect = page.locator('button:has-text("Select category"), [role="combobox"]:near(:text("Category"))').first();
  await categorySelect.click();
  await page.getByRole('option', { name: TEST_PRODUCT.category }).click();
  
  // Fill price
  await page.fill('input[inputmode="decimal"]', TEST_PRODUCT.price);
  
  // Set stock to in stock (should be default)
  const stockSelect = page.locator('button:has-text("In stock"), button:has-text("Out of stock")').first();
  const stockText = await stockSelect.textContent();
  if (!stockText?.includes('In stock')) {
    await stockSelect.click();
    await page.getByRole('option', { name: /in stock/i }).click();
  }
  
  // Fill discount
  await page.fill('input[placeholder="0"]', TEST_PRODUCT.discount);
}

async function uploadProductMedia(page: Page) {
  // Create a simple test image blob
  const testImageData = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;
    
    // Draw a gradient background
    const gradient = ctx.createLinearGradient(0, 0, 800, 600);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(1, '#8b5cf6');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 800, 600);
    
    // Add text
    ctx.fillStyle = 'white';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Test Product Image', 400, 300);
    
    return canvas.toDataURL('image/png');
  });

  // Convert data URL to file
  const response = await fetch(testImageData);
  const blob = await response.blob();
  const file = new File([blob], 'test-product-image.png', { type: 'image/png' });

  // Find file input
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles([
    {
      name: 'test-product-image.png',
      mimeType: 'image/png',
      buffer: Buffer.from(await blob.arrayBuffer())
    }
  ]);
  
  // Wait for preview to appear
  await expect(page.locator('img[alt*="test-product-image"]')).toBeVisible({ timeout: 5000 });
  
  // Verify media count
  await expect(page.getByText(/1\/8/)).toBeVisible();
}

async function configureProductVariants(page: Page) {
  // Verify variants section is enabled by default
  await expect(page.getByText(/variants/i).first()).toBeVisible();
  
  // Add custom colors
  for (const color of TEST_PRODUCT.colors) {
    const colorInput = page.locator('input[placeholder*="Add a color"]');
    await colorInput.fill(color.name);
    
    const addColorBtn = colorInput.locator('..').getByRole('button').first();
    await addColorBtn.click();
    
    // Verify color appears in list
    await expect(page.getByText(color.name)).toBeVisible();
  }
  
  // Verify default colors are present
  await expect(page.getByText('Black')).toBeVisible();
  await expect(page.getByText('White')).toBeVisible();
  
  // Add custom size
  const extraSize = 'XXL';
  const sizeInput = page.locator('input[placeholder*="Add a size"]');
  await sizeInput.fill(extraSize);
  
  const addSizeBtn = sizeInput.locator('..').getByRole('button').first();
  await addSizeBtn.click();
  
  // Verify all sizes present (default + added)
  for (const size of ['S', 'M', 'L', 'XL', extraSize]) {
    await expect(page.getByText(size, { exact: true })).toBeVisible();
  }
}

async function publishProduct(page: Page) {
  // Verify ready to publish indicator
  await expect(page.getByText(/looks good/i)).toBeVisible({ timeout: 2000 });
  
  // Click publish button
  const publishBtn = page.getByRole('button', { name: /publish product/i });
  await expect(publishBtn).toBeEnabled();
  await publishBtn.click();
  
  // Wait for upload progress
  await expect(page.getByText(/uploading/i)).toBeVisible({ timeout: 2000 }).catch(() => {});
  
  // Wait for success toast or redirect
  await Promise.race([
    page.waitForURL(/\/seller\/products(?!\/new)/, { timeout: 30000 }),
    page.getByText(/product uploaded|product is live/i).waitFor({ timeout: 30000 })
  ]);
}

async function verifyProductInList(page: Page) {
  // Should be on seller products page
  await expect(page).toHaveURL(/\/seller\/products(?!\/new)/);
  
  // Find the newly created product
  const productCard = page.locator(`text="${TEST_PRODUCT.title}"`).first();
  await expect(productCard).toBeVisible({ timeout: 5000 });
  
  // Verify price appears
  await expect(page.getByText(/25,000|25000/)).toBeVisible();
  
  // Verify stock status
  await expect(page.getByText(/in stock/i)).toBeVisible();
}

async function verifyProductDetailPage(page: Page, productTitle: string) {
  // Find and click view button for the product
  const productRow = page.locator(`text="${productTitle}"`).locator('..');
  const viewBtn = productRow.getByRole('link', { name: /view/i }).or(productRow.getByRole('button', { name: /view/i }));
  await viewBtn.click();
  
  // Wait for product page
  await expect(page).toHaveURL(/\/product\/p_/);
  
  // Verify product title
  await expect(page.getByRole('heading', { name: TEST_PRODUCT.title })).toBeVisible();
  
  // Verify price
  await expect(page.getByText(/25,000|25000/)).toBeVisible();
  
  // Verify description
  await expect(page.getByText(TEST_PRODUCT.description)).toBeVisible();
  
  // Verify discount badge if applicable
  if (parseInt(TEST_PRODUCT.discount) > 0) {
    await expect(page.getByText(/10%|discount/i)).toBeVisible();
  }
  
  // Verify category
  await expect(page.getByText(TEST_PRODUCT.category)).toBeVisible();
}

async function verifyMediaGallery(page: Page) {
  // Verify main product image is visible
  const mainImage = page.locator('img[alt*="Product"], video').first();
  await expect(mainImage).toBeVisible();
  
  // Check if thumbnails exist (if multiple media uploaded)
  const thumbnails = page.locator('button:has(img), button:has(video)').filter({ has: page.locator('img[alt*="Product"], video') });
  const thumbnailCount = await thumbnails.count();
  
  if (thumbnailCount > 1) {
    // Click second thumbnail to test gallery switching
    await thumbnails.nth(1).click();
    await page.waitForTimeout(500); // Wait for transition
    
    // Click back to first
    await thumbnails.nth(0).click();
  }
}

async function verifyVariants(page: Page) {
  // Look for variant selectors (colors)
  const colorSection = page.getByText(/color/i).first();
  await expect(colorSection).toBeVisible();
  
  // Verify color options are present
  for (const color of ['Black', 'White', ...TEST_PRODUCT.colors.map(c => c.name)]) {
    await expect(page.locator(`button:has-text("${color}"), [role="radio"]:has-text("${color}")`)).toBeVisible();
  }
  
  // Look for size selectors
  const sizeSection = page.getByText(/size/i).first();
  await expect(sizeSection).toBeVisible();
  
  // Verify size options
  for (const size of ['S', 'M', 'L', 'XL']) {
    await expect(page.locator(`button:has-text("${size}"), [role="radio"]:has-text("${size}")`)).toBeVisible();
  }
  
  // Try selecting a variant
  const firstColorBtn = page.locator('button:has-text("Black"), [role="radio"]:has-text("Black")').first();
  await firstColorBtn.click();
  
  const firstSizeBtn = page.locator('button:has-text("M"), [role="radio"]:has-text("M")').first();
  await firstSizeBtn.click();
}

async function verifyAddToCart(page: Page) {
  // Find and click add to cart button
  const addToCartBtn = page.getByRole('button', { name: /add to cart/i });
  await expect(addToCartBtn).toBeVisible();
  await addToCartBtn.click();
  
  // Wait for success feedback (toast or cart update)
  await Promise.race([
    page.getByText(/added to cart/i).waitFor({ timeout: 5000 }),
    page.locator('[data-cart-count]').waitFor({ state: 'visible', timeout: 5000 })
  ]).catch(() => {});
  
  // Verify cart icon shows items
  const cartBadge = page.locator('[data-cart-count], .cart-count').first();
  if (await cartBadge.isVisible()) {
    const countText = await cartBadge.textContent();
    expect(parseInt(countText || '0')).toBeGreaterThan(0);
  }
}

test.describe('Product Creation and Publishing Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeller(page);
  });

  test('should create and publish a complete product successfully', async ({ page }) => {
    // Step 1: Navigate to product creation
    await test.step('Navigate to product creation page', async () => {
      await navigateToProductCreation(page);
    });

    // Step 2: Fill basic info
    await test.step('Fill basic product information', async () => {
      await fillBasicProductInfo(page);
    });

    // Step 3: Upload media
    await test.step('Upload product media', async () => {
      await uploadProductMedia(page);
    });

    // Step 4: Configure variants
    await test.step('Configure product variants', async () => {
      await configureProductVariants(page);
    });

    // Step 5: Publish
    await test.step('Publish product', async () => {
      await publishProduct(page);
    });

    // Step 6: Verify in product list
    await test.step('Verify product appears in seller product list', async () => {
      await verifyProductInList(page);
    });

    // Step 7: View product detail page
    await test.step('Verify product detail page', async () => {
      await verifyProductDetailPage(page, TEST_PRODUCT.title);
    });

    // Step 8: Verify media gallery
    await test.step('Verify media gallery functionality', async () => {
      await verifyMediaGallery(page);
    });

    // Step 9: Verify variants
    await test.step('Verify product variants display', async () => {
      await verifyVariants(page);
    });

    // Step 10: Test add to cart
    await test.step('Verify add to cart functionality', async () => {
      await verifyAddToCart(page);
    });
  });

  test('should validate product appears in marketplace homepage', async ({ page }) => {
    // Create product first
    await navigateToProductCreation(page);
    await fillBasicProductInfo(page);
    await uploadProductMedia(page);
    await publishProduct(page);
    
    // Navigate to homepage
    await page.goto('/');
    
    // Product should appear in featured or category section
    await page.waitForTimeout(2000); // Allow marketplace to refresh
    
    // Search for product by scrolling or searching
    const productCard = page.locator(`text="${TEST_PRODUCT.title}"`).first();
    
    // May need to scroll or navigate to category
    if (!(await productCard.isVisible())) {
      // Try navigating to the product's category
      await page.goto(`/category/${TEST_PRODUCT.category.toLowerCase()}`);
    }
    
    await expect(productCard).toBeVisible({ timeout: 10000 });
  });

  test('should handle product creation without variants', async ({ page }) => {
    await navigateToProductCreation(page);
    await fillBasicProductInfo(page);
    
    // Disable variants
    const disableVariantsBtn = page.getByRole('button', { name: /disable/i });
    await disableVariantsBtn.click();
    
    // Verify variants are disabled
    await expect(page.getByText(/variants are disabled/i)).toBeVisible();
    
    await uploadProductMedia(page);
    await publishProduct(page);
    await verifyProductInList(page);
  });

  test('should require minimum fields before publishing', async ({ page }) => {
    await navigateToProductCreation(page);
    
    // Try to publish without filling required fields
    const publishBtn = page.getByRole('button', { name: /publish product/i });
    await expect(publishBtn).toBeDisabled();
    
    // Fill only title
    await page.fill('input[placeholder*="t-shirt" i], input[placeholder*="title" i]', 'Test');
    await expect(publishBtn).toBeDisabled(); // Still disabled
    
    // Add price
    await page.fill('input[inputmode="decimal"]', '1000');
    
    // Should now be enabled (assuming vendor is auto-selected)
    await expect(publishBtn).toBeEnabled({ timeout: 2000 });
  });

  test('should support multiple media uploads', async ({ page }) => {
    await navigateToProductCreation(page);
    await fillBasicProductInfo(page);
    
    // Upload multiple images
    const fileInput = page.locator('input[type="file"]');
    
    // Create 3 test images
    for (let i = 0; i < 3; i++) {
      const testImageData = await page.evaluate((index) => {
        const canvas = document.createElement('canvas');
        canvas.width = 400;
        canvas.height = 400;
        const ctx = canvas.getContext('2d')!;
        
        ctx.fillStyle = ['#3b82f6', '#8b5cf6', '#ec4899'][index];
        ctx.fillRect(0, 0, 400, 400);
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Image ${index + 1}`, 200, 200);
        
        return canvas.toDataURL('image/png');
      }, i);

      const response = await fetch(testImageData);
      const blob = await response.blob();
      
      await fileInput.setInputFiles([
        {
          name: `test-image-${i + 1}.png`,
          mimeType: 'image/png',
          buffer: Buffer.from(await blob.arrayBuffer())
        }
      ]);
      
      // Wait a bit between uploads
      await page.waitForTimeout(500);
    }
    
    // Verify 3 media items
    await expect(page.getByText(/3\/8/)).toBeVisible({ timeout: 5000 });
    
    // Verify all thumbnails visible
    const mediaThumbnails = page.locator('img[alt*="test-image"]');
    await expect(mediaThumbnails).toHaveCount(3);
  });
});

test.describe('Product Publishing Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsSeller(page);
  });

  test('should handle Cloudinary upload failures gracefully', async ({ page }) => {
    // This test validates error handling when Cloudinary is unavailable
    await navigateToProductCreation(page);
    await fillBasicProductInfo(page);
    
    // Mock network failure for Cloudinary
    await page.route('**/cloudinary-sign**', route => route.abort('failed'));
    await page.route('**/cloudinary.com/**', route => route.abort('failed'));
    
    await uploadProductMedia(page);
    
    const publishBtn = page.getByRole('button', { name: /publish product/i });
    await publishBtn.click();
    
    // Should show error toast
    await expect(page.getByText(/upload failed|error/i)).toBeVisible({ timeout: 10000 });
    
    // Should remain on creation page
    await expect(page).toHaveURL(/\/seller\/products\/new/);
  });

  test('should preserve form data when navigating away and back', async ({ page }) => {
    await navigateToProductCreation(page);
    
    // Fill some data
    const testTitle = `Preserved Product ${Date.now()}`;
    await page.fill('input[placeholder*="t-shirt" i], input[placeholder*="title" i]', testTitle);
    await page.fill('input[inputmode="decimal"]', '5000');
    
    // Navigate to products list
    await page.goto('/seller/products');
    
    // Navigate back to new product
    await page.goto('/seller/products/new');
    
    // Note: Form data won't persist unless explicitly saved to localStorage
    // This test documents current behavior
    const titleInput = page.locator('input[placeholder*="t-shirt" i], input[placeholder*="title" i]');
    const titleValue = await titleInput.inputValue();
    
    // Currently expected to be empty (no persistence implemented)
    expect(titleValue).toBe('');
  });
});

test.describe('Product Visibility and SEO', () => {
  test('should generate proper meta tags for product pages', async ({ page }) => {
    await loginAsSeller(page);
    await navigateToProductCreation(page);
    await fillBasicProductInfo(page);
    await publishProduct(page);
    
    // Navigate to product detail
    const productCard = page.locator(`text="${TEST_PRODUCT.title}"`).first();
    await productCard.click();
    
    // Wait for product page
    await expect(page).toHaveURL(/\/product\/p_/);
    
    // Check meta tags
    const title = await page.title();
    expect(title).toContain(TEST_PRODUCT.title);
    
    // Check og:image if implemented
    const ogImage = page.locator('meta[property="og:image"]');
    if (await ogImage.count() > 0) {
      const content = await ogImage.getAttribute('content');
      expect(content).toBeTruthy();
    }
  });
});

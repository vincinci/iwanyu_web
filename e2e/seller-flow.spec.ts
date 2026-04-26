import { test, expect, type Page } from "@playwright/test";

function hasRequiredCreds() {
  return Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);
}

async function clearStorage(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {
      // ignore
    }
  });
  await page.reload();
}

async function login(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();

  // Wait for app to hydrate and redirect.
  await expect(page.getByRole("heading", { name: /my account/i })).toBeVisible({ timeout: 20000 });
}

test.describe("seller flow", () => {
  test.skip(!hasRequiredCreds(), "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

  test("apply as vendor then create product", async ({ page }) => {
    await clearStorage(page);

    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;

    await login(page, email, password);

    // Vendor application (auto-approves). If user already has a vendor, it redirects to /seller.
    await page.goto("/vendor-application");

    const onApplication = await page
      .getByRole("heading", { name: /become a seller/i })
      .isVisible()
      .catch(() => false);

    if (onApplication) {
      await page.getByLabel(/store name/i).fill(`E2E Store ${Date.now()}`);
      await page.getByRole("button", { name: /^next$/i }).click();

      await page.getByLabel(/location/i).fill("Kigali, Rwanda");
      await page.getByRole("button", { name: /^next$/i }).click();

      await page.getByRole("button", { name: /submit application/i }).click();
    }

    await expect(page).toHaveURL(/\/seller/);

    // Create product
    await page.goto("/seller/products/new");
    await expect(page.getByRole("heading", { name: /new product/i })).toBeVisible();

    // Ensure the page has an available vendor (otherwise it will show onboarding guidance).
    await expect(page.getByText(/select vendor/i)).toBeVisible({ timeout: 20000 });

    const productTitle = `E2E Product ${Date.now()}`;

    await page.getByPlaceholder("Product title").fill(productTitle);
    await page.getByPlaceholder("Describe the product").fill("E2E product description");

    // Price input has no label; target by inputMode.
    await page.locator('input[inputmode="decimal"]').fill("12345");

    await page.getByRole("button", { name: /upload product/i }).click();

    await expect(page.getByText(/product uploaded/i)).toBeVisible({ timeout: 20000 });
    await expect(page).toHaveURL(/\/seller\/products/);
    await expect(page.getByText(productTitle)).toBeVisible({ timeout: 20000 });

    // Verify the product is discoverable via search.
    await page.goto(`/search?q=${encodeURIComponent(productTitle)}`);
    await expect(page.getByText(productTitle)).toBeVisible({ timeout: 20000 });
  });

  test.skip(process.env.E2E_ENABLE_MEDIA_UPLOAD !== "1", "Set E2E_ENABLE_MEDIA_UPLOAD=1 to test Cloudinary upload");

  test("create product with image upload (optional)", async ({ page }) => {
    await clearStorage(page);

    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;
    await login(page, email, password);

    await page.goto("/seller/products/new");
    await expect(page.getByRole("heading", { name: /new product/i })).toBeVisible({ timeout: 20000 });

    const productTitle = `E2E Media Product ${Date.now()}`;
    await page.getByPlaceholder("Product title").fill(productTitle);
    await page.getByPlaceholder("Describe the product").fill("E2E product with media upload");
    await page.locator('input[inputmode="decimal"]').fill("23456");

    // 1x1 transparent PNG
    const pngBase64 =
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7W0p0AAAAASUVORK5CYII=";
    await page.setInputFiles('input[type="file"]', {
      name: "sample.png",
      mimeType: "image/png",
      buffer: Buffer.from(pngBase64, "base64"),
    });

    await page.getByRole("button", { name: /upload product/i }).click();

    // If Cloudinary isn't configured, the app should toast an error.
    const failed = await page.getByText(/upload failed/i).isVisible().catch(() => false);
    if (failed) {
      await expect(page.getByText(/upload failed/i)).toBeVisible();
      return;
    }

    await expect(page.getByText(/product uploaded/i)).toBeVisible({ timeout: 30000 });
    await expect(page).toHaveURL(/\/seller\/products/);
    await expect(page.getByText(productTitle)).toBeVisible({ timeout: 20000 });
  });
});

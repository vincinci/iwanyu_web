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
  await expect(page.getByRole("heading", { name: /my account/i })).toBeVisible({ timeout: 20000 });
}

test.describe("admin flow", () => {
  test.skip(!hasRequiredCreds(), "Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD");

  test("upgrade to admin (dev-only) then access admin dashboard", async ({ page }) => {
    await clearStorage(page);

    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;
    await login(page, email, password);

    // Dev-only role switcher is on /account.
    await page.getByRole("button", { name: /^admin$/i }).click();
    await expect(page.getByText(/role updated/i)).toBeVisible({ timeout: 20000 });

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /admin dashboard/i })).toBeVisible({ timeout: 20000 });

    // Basic sanity checks for key admin sections.
    await expect(page.getByText(/vendor applications/i)).toBeVisible();
    await expect(page.getByText(/total vendors/i)).toBeVisible();
  });

  test("non-admin is blocked from /admin", async ({ page }) => {
    await clearStorage(page);

    const email = process.env.E2E_TEST_EMAIL!;
    const password = process.env.E2E_TEST_PASSWORD!;
    await login(page, email, password);

    // Ensure not admin
    await page.getByRole("button", { name: /^buyer$/i }).click();
    await expect(page.getByText(/role updated/i)).toBeVisible({ timeout: 20000 });

    await page.goto("/admin");
    await expect(page.getByText(/access denied/i)).toBeVisible({ timeout: 20000 });
  });
});

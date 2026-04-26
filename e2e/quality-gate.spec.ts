import { test, expect, type Page } from "@playwright/test";

function isSameOrigin(url: string, baseURL: string) {
  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
}

function attachQualityGateGuards(page: Page, baseURL: string) {
  const severe: { type: string; text: string }[] = [];

  page.on("pageerror", (err: Error) => {
    severe.push({ type: "pageerror", text: err?.message ?? String(err) });
  });

  page.on("requestfailed", (request: Parameters<Parameters<Page["on"]>[1]>[0]) => {
    const url = request.url?.() ?? "";
    const resourceType = request.resourceType?.() ?? "other";
    const failure = request.failure?.()?.errorText ?? "request failed";

    // Only fail for critical same-origin resources.
    if (!isSameOrigin(url, baseURL)) return;
    if (!["document", "script", "stylesheet", "xhr", "fetch"].includes(resourceType)) return;

    severe.push({ type: `requestfailed:${resourceType}`, text: `${failure} ${url}` });
  });

  page.on("console", (msg: Parameters<Parameters<Page["on"]>[1]>[0]) => {
    const type = msg.type?.() ?? "log";
    if (type !== "error") return;
    const text = msg.text?.() ?? "";

    // This message is usually emitted for external asset failures (DNS/adblock/offline).
    if (/^Failed to load resource: net::ERR_/i.test(text)) return;

    severe.push({ type: "console.error", text });
  });

  return {
    assertNoSevereErrors: async () => {
      // Allow some time for async errors after navigation.
      await page.waitForTimeout(250);
      expect(severe, `Severe browser errors:\n${severe.map((e) => `- [${e.type}] ${e.text}`).join("\n")}`).toEqual([]);
    },
  };
}

test.beforeEach(async ({ page }) => {
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
});

test("quality gate: core navigation + no runtime crashes", async ({ page }) => {
  test.setTimeout(120_000);
  const baseURL = (test.info().project.use.baseURL as string | undefined) ?? "http://127.0.0.1:8080";
  const guard = attachQualityGateGuards(page, baseURL);

  // Home
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
  await guard.assertNoSevereErrors();

  // Category navigation from home
  const categoryHref = await page.locator('a[href^="/category/"]').evaluateAll((nodes) => {
    const hrefs = nodes
      .map((n) => n.getAttribute("href") || "")
      .filter(Boolean);
    return hrefs.find((h) => h !== "/category/all" && !h.endsWith("/all")) || null;
  });

  if (categoryHref) {
    await page.goto(categoryHref, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/category\//);
    await expect(page.getByRole("heading", { name: /recommended products/i })).toBeVisible();
    await guard.assertNoSevereErrors();
  }

  // Product details
  const inStockProduct = page.locator('a[href^="/product/"]', { hasText: "✓ In Stock" }).first();
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(inStockProduct).toBeVisible();
  const productHref = await inStockProduct.getAttribute("href");
  expect(productHref).toBeTruthy();
  await page.goto(productHref!, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/product\//);
  await expect(page.getByRole("heading", { name: /recommended products/i })).toBeVisible();
  await guard.assertNoSevereErrors();

  // Search should return the current product when searching for a keyword from its title
  const title = await page.locator("h1").first().textContent();
  const token = (title ?? "").trim().split(/\s+/).filter(Boolean)[0] ?? "";
  if (token) {
    await page.goto(`/search?q=${encodeURIComponent(token)}`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/search\?q=/);
    await expect(page.locator('a[href^="/product/"]').first()).toBeVisible();
    await guard.assertNoSevereErrors();
  }

  // Cart add → cart page
  await page.goto(productHref!, { waitUntil: "domcontentloaded" });
  await page.getByRole("button", { name: /add to cart/i }).first().click();
  await page.getByRole("button", { name: /view cart/i }).click();
  await expect(page.getByRole("heading", { name: /your shopping cart/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /recommended products/i })).toBeVisible();
  await guard.assertNoSevereErrors();

  // Wishlist page should load (even if empty).
  await page.goto("/wishlist", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Your Wishlist", exact: true })).toBeVisible();
  await guard.assertNoSevereErrors();

  // Static/info pages should not 404.
  for (const path of ["/about", "/help", "/privacy", "/terms"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/not found/i)).toHaveCount(0);
    await guard.assertNoSevereErrors();
  }
});

import { test, expect } from "@playwright/test";

test("Customer: track order status page exists (requires sign-in)", async ({ page }) => {
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Your Orders", exact: true })).toBeVisible();
  // Check for sign-in prompt (either in heading or text)
  await expect(page.getByText(/sign in/i).first()).toBeVisible();
});

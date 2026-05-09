import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type SeedContext = {
  userId: string;
  vendorId: string;
};

// Official pawaPay sandbox Rwanda success MSISDN from the payout docs.
const PAWAPAY_SANDBOX_SUCCESS_MSISDN = "+250783456789";

const hasSupabase = process.env.E2E_SUPABASE_ENABLED === "1";
const isSupabaseRuntimeEnabled = process.env.VITE_E2E_DISABLE_SUPABASE !== "1";

const supabaseUrl = process.env.E2E_SUPABASE_URL;
const supabaseAnonKey = process.env.E2E_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.E2E_SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.E2E_TEST_EMAIL;
const password = process.env.E2E_TEST_PASSWORD;

function requireEnv(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

async function clearStorageAndSetEnglish(page: Page) {
  await page.goto("/");
  await page.evaluate(() => {
    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
      window.localStorage.setItem("iwanyu_language", "en");
    } catch {
      // ignore
    }
  });
  await page.reload();
}

async function login(page: Page, userEmail: string, userPassword: string) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(userEmail);
  await page.getByLabel(/password/i).fill(userPassword);
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/account/, { timeout: 20_000 });
}

async function seedSellerAndVendor(): Promise<SeedContext> {
  const url = requireEnv(supabaseUrl, "E2E_SUPABASE_URL");
  const anonKey = requireEnv(supabaseAnonKey, "E2E_SUPABASE_ANON_KEY");
  const serviceKey = requireEnv(supabaseServiceRoleKey, "E2E_SUPABASE_SERVICE_ROLE_KEY");
  const userEmail = requireEnv(email, "E2E_TEST_EMAIL");
  const userPassword = requireEnv(password, "E2E_TEST_PASSWORD");

  const anonClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email: userEmail,
    password: userPassword,
  });

  if (signInError || !signInData.user) {
    throw new Error(`Unable to sign in e2e user: ${signInError?.message ?? "unknown"}`);
  }

  const userId = signInData.user.id;
  const vendorId = `vendor-e2e-${userId.slice(0, 8)}`;

  const serviceClient = createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error: vendorError } = await serviceClient.from("vendors").upsert(
    {
      id: vendorId,
      owner_user_id: userId,
      name: "E2E Seller Store",
      email: userEmail,
      phone: "+250700000000",
      location: "Kigali",
      description: "E2E store description",
      logo_url: "https://example.com/e2e-logo.png",
      banner_url: "https://example.com/e2e-banner.png",
      status: "approved",
      profile_completed: true,
      payout_balance_rwf: 20000,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (vendorError) throw new Error(`Unable to seed vendor: ${vendorError.message}`);

  const { error: profileError } = await serviceClient.from("profiles").upsert({
    id: userId,
    email: userEmail,
    phone: "+250788000111",
    full_name: "E2E Seller",
    role: "seller",
    profile_completed: true,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" });

  if (profileError) throw new Error(`Unable to update e2e profile: ${profileError.message}`);

  return { userId, vendorId };
}

test.describe("seller publish guard + live payout initiation", () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!hasSupabase, "Requires E2E_SUPABASE_ENABLED=1");
    test.skip(!isSupabaseRuntimeEnabled, "Set VITE_E2E_DISABLE_SUPABASE=0 for Supabase-backed integration tests");
    test.skip(!email || !password, "Requires E2E_TEST_EMAIL and E2E_TEST_PASSWORD");
    test.skip(!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey, "Requires E2E_SUPABASE_URL, E2E_SUPABASE_ANON_KEY and E2E_SUPABASE_SERVICE_ROLE_KEY");

    await clearStorageAndSetEnglish(page);
  });

  test("blocks publishing when seller profile is incomplete", async ({ page }) => {
    await seedSellerAndVendor();
    await login(page, email!, password!);

    await page.goto("/seller/settings");
    await expect(page.getByRole("heading", { name: /store settings/i })).toBeVisible({ timeout: 20_000 });

    const supportPhoneInput = page.getByPlaceholder("+2507...");
    await supportPhoneInput.fill("");

    await page.getByRole("button", { name: /save changes/i }).click();
    await expect(page.getByText(/settings saved/i)).toBeVisible({ timeout: 20_000 });

    await page.goto("/seller/products/new");
    await expect(page.getByRole("heading", { name: /create product/i })).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/complete store settings before publishing/i)).toBeVisible({ timeout: 20_000 });

    const publishButton = page.getByRole("button", { name: /publish product/i });
    await expect(publishButton).toBeDisabled();
  });

  test("seller can save payout settings and initiate mobile money withdrawal", async ({ page }) => {
    const { userId, vendorId } = await seedSellerAndVendor();

    const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    await serviceClient.from("vendor_payout_settings").delete().eq("vendor_id", vendorId);
    await serviceClient.from("seller_withdrawals").delete().eq("vendor_id", vendorId);

    const productId = `product-e2e-${Date.now()}`;
    const orderId = crypto.randomUUID();

    const { error: productError } = await serviceClient.from("products").upsert({
      id: productId,
      vendor_id: vendorId,
      title: "E2E Seller Payout Product",
      description: "Seed product for payout availability",
      category: "General",
      price_rwf: 6000,
      image_url: "https://example.com/e2e-product.png",
      in_stock: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });

    if (productError) throw new Error(`Unable to seed payout product: ${productError.message}`);

    const { error: orderError } = await serviceClient.from("orders").insert({
      id: orderId,
      buyer_user_id: userId,
      buyer_email: email,
      shipping_address: "Kigali, Rwanda",
      status: "Delivered",
      total_rwf: 6000,
      payment: { provider: "test", verified: true },
    });

    if (orderError) throw new Error(`Unable to seed payout order: ${orderError.message}`);

    const { error: itemError } = await serviceClient.from("order_items").insert({
      order_id: orderId,
      product_id: productId,
      vendor_id: vendorId,
      title: "E2E Seller Payout Product",
      price_rwf: 6000,
      quantity: 1,
      image_url: "https://example.com/e2e-product.png",
      status: "Delivered",
      vendor_payout_rwf: 5580,
    });

    if (itemError) throw new Error(`Unable to seed payout order item: ${itemError.message}`);

    const savedMobile = PAWAPAY_SANDBOX_SUCCESS_MSISDN;
    let requestSeen = false;

    await page.route("**/functions/v1/seller-withdrawal-callback", async (route) => {
      requestSeen = true;
      const body = route.request().postDataJSON() as {
        vendorId: string;
        amountRwf: number;
        mobileNetwork: string;
        phoneNumber: string;
        reason?: string;
      };

      expect(body.vendorId).toBe(vendorId);
      expect(body.amountRwf).toBe(1500);
      expect(body.mobileNetwork).toBe("MTN");
      expect(body.phoneNumber).toBe("250783456789");
      expect(body.reason).toBe("Seller earnings withdrawal");

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          withdrawalId: "00000000-0000-4000-8000-000000000001",
          amountRwf: 1500,
          newBalance: 18500,
          message: "1,500 RWF is on the way to +250783456789",
        }),
      });
    });

    await login(page, email!, password!);

    await page.goto("/seller/payout-settings");
    await expect(page.getByRole("heading", { name: /payout settings/i })).toBeVisible({ timeout: 20_000 });

    await page.getByRole("button", { name: /^mtn$/i }).click();
    await page.getByPlaceholder("+250 7XX XXX XXX").fill(savedMobile);
    await page.getByPlaceholder("Registered name").fill("E2E Seller");
    await page.getByRole("button", { name: /save mobile money/i }).click();
    await expect(page.getByText(/mobile money saved/i)).toBeVisible({ timeout: 20_000 });

    await page.goto("/seller/payouts");
    await expect(page.getByRole("heading", { name: /payouts/i })).toBeVisible({ timeout: 20_000 });

    await expect(page.getByText(/available now/i)).toBeVisible({ timeout: 20_000 });
    await page.getByPlaceholder("50000").fill("1500");
    await page.getByRole("button", { name: /withdraw funds/i }).click();

    await expect(page.getByText(/withdrawal started/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/1,500 RWF is on the way to \+250783456789/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/MTN: \+250783456789|MTN: 250783456789/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/processing/i).last()).toBeVisible({ timeout: 20_000 });

    expect(requestSeen).toBe(true);
  });
});

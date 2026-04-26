import { test, expect, type Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

type SeedContext = {
  userId: string;
  vendorId: string;
};

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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (vendorError) throw new Error(`Unable to seed vendor: ${vendorError.message}`);

  return { userId, vendorId };
}

test.describe("seller publish guard + admin withdrawal review", () => {
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

  test("admin can approve and mark paid a pending withdrawal request", async ({ page }) => {
    const { userId, vendorId } = await seedSellerAndVendor();

    const serviceClient = createClient(supabaseUrl!, supabaseServiceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const destination = `E2E-DEST-${Date.now()}`;
    const { error: insertError } = await serviceClient.from("vendor_withdrawal_requests").insert({
      vendor_id: vendorId,
      requested_by: userId,
      amount_rwf: 1500,
      payout_method: "bank_transfer",
      payout_destination: destination,
      note: "E2E pending withdrawal",
      status: "pending",
    });

    if (insertError) throw new Error(`Unable to seed withdrawal request: ${insertError.message}`);

    await login(page, email!, password!);

    await page.goto("/account");
    await page.getByRole("button", { name: /^admin$/i }).click();
    await expect(page.getByText(/role updated/i)).toBeVisible({ timeout: 20_000 });

    await page.goto("/admin");
    await expect(page.getByRole("heading", { name: /dashboard overview/i })).toBeVisible({ timeout: 20_000 });

    const row = page.locator("tr", { hasText: destination }).first();
    await expect(row).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: /approve/i }).click();
    await expect(page.getByText(/request approved/i)).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(/approved/i);

    await row.getByRole("button", { name: /mark paid/i }).click();
    await expect(page.getByText(/marked as paid/i)).toBeVisible({ timeout: 20_000 });
    await expect(row).toContainText(/paid/i);
  });
});

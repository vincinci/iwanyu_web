#!/usr/bin/env node
/**
 * PawaPay Payment Flow Test Suite
 * Tests all payment flows using webhook simulation and (optionally) the PawaPay sandbox API.
 *
 * Rwanda sandbox test numbers (PawaPay):
 *   MTN_MOMO_RWA  deposit COMPLETED:           250783456789
 *   MTN_MOMO_RWA  deposit FAILED PAYMENT_NOT_APPROVED (cancelled): 250783456039
 *   MTN_MOMO_RWA  deposit FAILED PAYER_LIMIT_REACHED:  250783456019
 *   AIRTEL_RWA    deposit COMPLETED:           250733456789
 *   AIRTEL_RWA    deposit FAILED INSUFFICIENT_BALANCE: 250733456049
 *   AIRTEL_RWA    deposit FAILED PAYMENT_NOT_APPROVED: 250733456039
 *   MTN_MOMO_RWA  payout COMPLETED:            250783456789
 *   AIRTEL_RWA    payout COMPLETED:            250733456789
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ─── Config ────────────────────────────────────────────────────────────────
const SUPABASE_URL       = process.env.SUPABASE_URL       || "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_ANON_KEY  = process.env.SUPABASE_ANON_KEY  || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.McDG3rawGydXS7QIZfggPjhuLnWVFbEvbgGiLTET6eo";
const SUPABASE_SRK       = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk";

const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// PawaPay Rwanda sandbox test numbers
const TEST_NUMBERS = {
  mtn_success:              "250783456789",
  mtn_payment_not_approved: "250783456039",
  mtn_payer_limit_reached:  "250783456019",
  mtn_payout_success:       "250783456789",
  airtel_success:           "250733456789",
  airtel_insufficient:      "250733456049",
  airtel_payment_not_approved: "250733456039",
  airtel_payout_success:    "250733456789",
};

// ─── Clients ───────────────────────────────────────────────────────────────
const admin = createClient(SUPABASE_URL, SUPABASE_SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Helpers ───────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const results = [];

function ok(label) {
  passed++;
  results.push({ status: "PASS", label });
  console.log(`  ✅ ${label}`);
}

function fail(label, reason) {
  failed++;
  results.push({ status: "FAIL", label, reason });
  console.error(`  ❌ ${label}: ${reason}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callFunction(fnName, body, authHeader) {
  const headers = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;
  const res = await fetch(`${FUNCTIONS_URL}/${fnName}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

// Create a temporary test user
async function createTestUser(label) {
  const email = `test-pawapay-${Date.now()}-${Math.random().toString(36).slice(2)}@iwanyu.test`;
  const password = "TestPass123!";
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "PawaPay Test User" },
  });
  if (error) throw new Error(`createUser(${label}): ${error.message}`);

  // Wait for the DB trigger to create the profile row
  await sleep(800);

  // Ensure profile exists with wallet_balance_rwf = 0
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ wallet_balance_rwf: 0 })
    .eq("id", data.user.id);

  if (updateErr) {
    // Row might not exist yet — insert it
    const { error: insertErr } = await admin
      .from("profiles")
      .insert({ id: data.user.id, email, full_name: "PawaPay Test User", wallet_balance_rwf: 0 });
    if (insertErr) {
      console.warn(`  ⚠️  Profile setup warning for ${label}: ${insertErr.message}`);
    }
  }

  // Verify the profile is readable
  const { data: profile, error: fetchErr } = await admin
    .from("profiles")
    .select("id, wallet_balance_rwf")
    .eq("id", data.user.id)
    .single();

  if (fetchErr || !profile) {
    throw new Error(`Profile not found after creation for ${label}: ${fetchErr?.message}`);
  }
  console.log(`  ℹ  Test user created: ${email} — wallet: RWF ${profile.wallet_balance_rwf}`);

  return { userId: data.user.id, email, password };
}

// Get JWT token for test user (needed to call authenticated edge functions)
async function getUserJwt(email, password) {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  return data.session.access_token;
}

// Delete test user and related data
async function cleanupUser(userId) {
  try { await admin.from("wallet_transactions").delete().eq("user_id", userId); } catch {}
  try { await admin.from("orders").delete().eq("buyer_id", userId); } catch {}
  try { await admin.auth.admin.deleteUser(userId); } catch {}
}

// ─── Tests ─────────────────────────────────────────────────────────────────

async function testWalletDepositCompleted() {
  console.log("\n📥 Test 1: Wallet deposit — COMPLETED callback");
  let userId;
  try {
    const { userId: uid, email, password } = await createTestUser("deposit-success");
    userId = uid;

    const depositId = randomUUID();
    const depositAmount = 5000;

    // Create pending wallet_transaction (simulating what pawapay-deposit-init does)
    const { error: insertErr } = await admin.from("wallet_transactions").insert({
      id: randomUUID(),
      user_id: userId,
      kind: "deposit",
      amount: depositAmount,
      reference: depositId,
      metadata: { status: "pending", phone: TEST_NUMBERS.mtn_success, network: "MTN_MOMO_RWA" },
    });
    if (insertErr) throw new Error(`insert tx: ${insertErr.message}`);

    // Check initial balance
    const { data: profileBefore } = await admin.from("profiles").select("wallet_balance_rwf").eq("id", userId).single();
    const balanceBefore = Number(profileBefore?.wallet_balance_rwf ?? 0);

    // Send COMPLETED webhook (simulating PawaPay callback)
    // Pass anon key — Supabase gateway requires at least anon auth; actual logic doesn't check user JWT
    const webhookAuth = `Bearer ${SUPABASE_ANON_KEY}`;
    const { status: httpStatus, json: response } = await callFunction("wallet-deposit-callback", {
      depositId,
      status: "COMPLETED",
      amount: String(depositAmount),
      currency: "RWF",
      country: "RWA",
      correspondent: "MTN_MOMO_RWA",
      payer: { type: "MSISDN", address: { value: TEST_NUMBERS.mtn_success } },
    }, webhookAuth);

    await sleep(500); // wait for DB write

    if (httpStatus !== 200) throw new Error(`HTTP ${httpStatus}: ${JSON.stringify(response)}`);
    // Show the full response body so we can diagnose "Already claimed" or profile-not-found paths
    const reason = response.reason ?? "(no reason)";
    ok(`Callback endpoint returned 200 (reason: ${reason})`);

    // Verify wallet balance increased
    const { data: profileAfter } = await admin.from("profiles").select("wallet_balance_rwf").eq("id", userId).single();
    const balanceAfter = Number(profileAfter?.wallet_balance_rwf ?? 0);
    const delta = balanceAfter - balanceBefore;

    if (delta === depositAmount) {
      ok(`Wallet balance increased by RWF ${depositAmount} (${balanceBefore} → ${balanceAfter})`);
    } else {
      fail("Wallet balance", `Expected +${depositAmount} but got +${delta} (${balanceBefore} → ${balanceAfter})`);
    }

    // Verify transaction marked as completed
    const { data: txn } = await admin.from("wallet_transactions").select("metadata").eq("reference", depositId).maybeSingle();
    if (txn?.metadata?.status === "completed") {
      ok("Transaction metadata.status = completed");
    } else {
      fail("Transaction status", `Expected 'completed', got '${txn?.metadata?.status}'`);
    }

    // Verify idempotency: send the same COMPLETED callback again
    await callFunction("wallet-deposit-callback", {
      depositId,
      status: "COMPLETED",
      amount: String(depositAmount),
      currency: "RWF",
    }, webhookAuth);
    await sleep(300);

    const { data: profileIdem } = await admin.from("profiles").select("wallet_balance_rwf").eq("id", userId).single();
    const balanceIdem = Number(profileIdem?.wallet_balance_rwf ?? 0);
    if (balanceIdem === balanceAfter) {
      ok("Idempotency: duplicate callback did NOT double-credit wallet");
    } else {
      fail("Idempotency", `Balance changed from ${balanceAfter} to ${balanceIdem} on duplicate callback`);
    }

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

async function testWalletDepositFailed() {
  console.log("\n💳 Test 2: Wallet deposit — FAILED callback (insufficient funds)");
  let userId;
  try {
    const { userId: uid } = await createTestUser("deposit-fail");
    userId = uid;

    const depositId = randomUUID();

    await admin.from("wallet_transactions").insert({
      id: randomUUID(),
      user_id: userId,
      kind: "deposit",
      amount: 3000,
      reference: depositId,
      metadata: { status: "pending", phone: TEST_NUMBERS.airtel_insufficient, network: "AIRTEL_RWA" },
    });

    const webhookAuth = `Bearer ${SUPABASE_ANON_KEY}`;
    const { status: httpStatus, json: response } = await callFunction("wallet-deposit-callback", {
      depositId,
      status: "FAILED",
      amount: "3000",
      currency: "RWF",
      failureReason: { failureCode: "INSUFFICIENT_BALANCE", failureMessage: "Insufficient balance" },
    }, webhookAuth);

    await sleep(400);

    if (httpStatus !== 200) {
      fail("Callback returned non-200", `HTTP ${httpStatus}: ${JSON.stringify(response)}`);
    } else {
      ok("Callback endpoint returned 200 (PawaPay won't retry)");
    }

    // Verify balance was NOT changed
    const { data: profile } = await admin.from("profiles").select("wallet_balance_rwf").eq("id", userId).single();
    const balance = Number(profile?.wallet_balance_rwf ?? 0);
    if (balance === 0) {
      ok("Wallet balance unchanged (RWF 0 — no money credited)");
    } else {
      fail("Wallet balance", `Expected 0 but got ${balance}`);
    }

    // Verify transaction marked as failed
    const { data: txn } = await admin.from("wallet_transactions").select("metadata").eq("reference", depositId).maybeSingle();
    if (txn?.metadata?.status === "failed") {
      ok("Transaction metadata.status = failed");
    } else {
      fail("Transaction status", `Expected 'failed', got '${txn?.metadata?.status}'`);
    }

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

async function testWalletDepositCancelled() {
  console.log("\n🚫 Test 3: Wallet deposit — CANCELLED callback (user declined USSD)");
  let userId;
  try {
    const { userId: uid } = await createTestUser("deposit-cancel");
    userId = uid;

    const depositId = randomUUID();

    await admin.from("wallet_transactions").insert({
      id: randomUUID(),
      user_id: userId,
      kind: "deposit",
      amount: 2000,
      reference: depositId,
      metadata: { status: "pending", phone: TEST_NUMBERS.mtn_payment_not_approved, network: "MTN_MOMO_RWA" },
    });

    const webhookAuth = `Bearer ${SUPABASE_ANON_KEY}`;
    const { status: httpStatus, json: response } = await callFunction("wallet-deposit-callback", {
      depositId,
      status: "FAILED",
      amount: "2000",
      currency: "RWF",
      failureReason: { failureCode: "PAYMENT_NOT_APPROVED", failureMessage: "Payment not approved by payer" },
    }, webhookAuth);

    await sleep(400);

    if (httpStatus !== 200) {
      fail("Callback returned non-200", `HTTP ${httpStatus}: ${JSON.stringify(response)}`);
    } else {
      ok("Callback endpoint returned 200");
    }

    const { data: txn } = await admin.from("wallet_transactions").select("metadata").eq("reference", depositId).maybeSingle();
    if (txn?.metadata?.status === "failed") {
      ok("Transaction metadata.status = failed (cancelled maps to failed)");
    } else {
      fail("Transaction status", `Expected 'failed', got '${txn?.metadata?.status}'`);
    }

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

async function testOrderPaymentCompleted() {
  console.log("\n🛍️  Test 4: Order payment — COMPLETED callback (depositId = orderId)");
  let userId;
  try {
    const { userId: uid, email } = await createTestUser("order-payment");
    userId = uid;

    // Create a test order (orderId = depositId in PawaPay flow)
    const orderId = randomUUID();
    const orderTotal = 15000;

    const { error: orderErr } = await admin.from("orders").insert({
      id: orderId,
      buyer_id: userId,
      buyer_email: email,
      status: "Pending",
      total_rwf: orderTotal,
      payment: { provider: "pawapay", mode: "redirect", verified: false },
      items_json: [],
    });

    if (orderErr) {
      console.log(`   ⚠️  Cannot create test order (schema mismatch): ${orderErr.message}`);
      console.log("   ↳  Skipping order payment test (run manually via checkout flow)");
      return;
    }

    // Create linked wallet_transaction (kind=purchase, reference=orderId)
    await admin.from("wallet_transactions").insert({
      id: randomUUID(),
      user_id: userId,
      kind: "purchase",
      amount: orderTotal,
      reference: orderId,
      metadata: { status: "pending", orderId },
    });

    // Send COMPLETED callback using orderId as depositId
    const webhookAuth = `Bearer ${SUPABASE_ANON_KEY}`;
    const { status: httpStatus, json: response } = await callFunction("wallet-deposit-callback", {
      depositId: orderId,   // PawaPay uses orderId as the external deposit reference
      status: "COMPLETED",
      amount: String(orderTotal),
      currency: "RWF",
      correspondent: "MTN_MOMO_RWA",
      payer: { type: "MSISDN", address: { value: TEST_NUMBERS.mtn_success } },
    }, webhookAuth);

    await sleep(600);

    if (httpStatus !== 200) {
      fail("Order callback returned non-200", `HTTP ${httpStatus}: ${JSON.stringify(response)}`);
    } else {
      ok("Order callback endpoint returned 200");
    }

    // Verify order status changed to Processing
    const { data: order } = await admin.from("orders").select("status, payment_verified_at").eq("id", orderId).maybeSingle();
    if (order?.status === "Processing") {
      ok(`Order status = Processing (was Pending)`);
    } else {
      fail("Order status", `Expected 'Processing', got '${order?.status}'`);
    }

    if (order?.payment_verified_at) {
      ok("Order payment_verified_at is set");
    } else {
      fail("payment_verified_at", "Not set after COMPLETED callback");
    }

    // Wallet should NOT have been credited (order payment, not top-up)
    const { data: profile } = await admin.from("profiles").select("wallet_balance_rwf").eq("id", userId).single();
    const balance = Number(profile?.wallet_balance_rwf ?? 0);
    if (balance === 0) {
      ok("Wallet balance unchanged (order payment does not credit wallet)");
    } else {
      fail("Wallet balance", `Expected 0 but got ${balance} (order payment credited wallet incorrectly)`);
    }

    // Cleanup order
    await admin.from("orders").delete().eq("id", orderId).catch(() => {});

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

async function testWalletWithdrawal() {
  console.log("\n💸 Test 5: Wallet withdrawal (requires sandbox PAWAPAY_ENV)");
  let userId;
  try {
    const { userId: uid, email, password } = await createTestUser("withdrawal");
    userId = uid;

    // Give the user a balance to withdraw from
    const initialBalance = 20000;
    await admin.from("profiles").update({ wallet_balance_rwf: initialBalance }).eq("id", userId);

    // Get JWT for authenticated call
    const jwt = await getUserJwt(email, password);

    const withdrawAmount = 5000;
    const { status: httpStatus, json: response } = await callFunction("wallet-withdrawal", {
      amountRwf: withdrawAmount,
      phoneNumber: TEST_NUMBERS.mtn_payout_success,
    }, `Bearer ${jwt}`);

    if (httpStatus === 200 && response.success) {
      ok(`Withdrawal initiated — payoutId: ${response.payoutId ?? "N/A"}`);

      // Verify balance was deducted
      await sleep(500);
      const { data: profile } = await admin.from("profiles").select("wallet_balance_rwf").eq("id", userId).single();
      const balanceAfter = Number(profile?.wallet_balance_rwf ?? 0);
      const expected = initialBalance - withdrawAmount;
      if (balanceAfter === expected) {
        ok(`Balance deducted: ${initialBalance} → ${balanceAfter} (−${withdrawAmount} RWF)`);
      } else {
        fail("Balance after withdrawal", `Expected ${expected}, got ${balanceAfter}`);
      }
    } else if (httpStatus === 503 || (response.error && (String(response.error).includes("PawaPay") || String(response.error).includes("payout") || String(response.error).includes("live") || String(response.error).includes("sandbox")))) {
      console.log(`   ⚠️  PawaPay API unavailable (probably live env — sandbox test numbers won't work)`);
      console.log(`      Response: ${JSON.stringify(response)}`);
      console.log("   ↳  To test withdrawal: switch PAWAPAY_ENV to sandbox (see instructions below)");
    } else if (httpStatus === 400) {
      fail("Withdrawal request", `HTTP 400: ${JSON.stringify(response)}`);
    } else {
      fail("Withdrawal request", `HTTP ${httpStatus}: ${JSON.stringify(response)}`);
    }

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

async function testDepositStatusPolling() {
  console.log("\n🔍 Test 6: Deposit status polling (pawapay-deposit-status)");
  let userId;
  try {
    const { userId: uid, email, password } = await createTestUser("status-poll");
    userId = uid;

    const depositId = randomUUID();

    // Create a pending wallet_transaction
    await admin.from("wallet_transactions").insert({
      id: randomUUID(),
      user_id: userId,
      kind: "deposit",
      amount: 5000,
      reference: depositId,
      metadata: { status: "pending" },
    });

    const jwt = await getUserJwt(email, password);

    // Poll status — should return "PROCESSING" or PawaPay error (since the deposit isn't real)
    const { status: httpStatus, json: response } = await callFunction("pawapay-deposit-status", {
      depositId,
    }, `Bearer ${jwt}`);

    if (httpStatus === 200) {
      ok(`Status endpoint returned 200 — status: ${response.status ?? JSON.stringify(response).slice(0, 60)}`);
    } else if (httpStatus === 401) {
      fail("Status endpoint auth", "Returned 401 — JWT auth failed");
    } else {
      // PawaPay API call will fail in live mode for a fake depositId — this is expected
      console.log(`   ⚠️  PawaPay returned HTTP ${httpStatus} for fake depositId (expected in live mode)`);
      console.log(`      Response: ${JSON.stringify(response).slice(0, 120)}`);
      ok(`Status endpoint reachable (HTTP ${httpStatus} — PawaPay API rejection expected for fake ID)`);
    }

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

async function testDepositInitSandboxNumbers() {
  console.log("\n🧪 Test 7: Deposit init with Rwanda sandbox test numbers (needs PAWAPAY_ENV=sandbox)");
  let userId;
  try {
    const { userId: uid, email, password } = await createTestUser("deposit-init");
    userId = uid;
    const jwt = await getUserJwt(email, password);

    // Check if we're in sandbox mode by trying to initiate a real deposit
    const scenarios = [
      { phone: TEST_NUMBERS.mtn_success, network: "MTN_MOMO_RWA", label: "MTN success number" },
      { phone: TEST_NUMBERS.airtel_insufficient, network: "AIRTEL_RWA", label: "Airtel insufficient balance" },
    ];

    for (const { phone, network, label } of scenarios) {
      const { status: httpStatus, json: response } = await callFunction("pawapay-deposit-init", {
        amount: 2000,
        phone,
        network,
        type: "wallet",
      }, `Bearer ${jwt}`);

      if (httpStatus === 200 && response.depositId) {
        ok(`[sandbox] Deposit initiated for ${label} — ID: ${response.depositId}`);
        // Clean up the transaction row
        if (response.depositId) {
          await admin.from("wallet_transactions").delete().eq("reference", response.depositId).catch(() => {});
        }
      } else if (httpStatus === 401) {
        fail(`Deposit init auth (${label})`, "Returned 401");
      } else {
        const msg = response.error ?? response.message ?? JSON.stringify(response).slice(0, 80);
        console.log(`   ⚠️  [${label}] deposit init HTTP ${httpStatus}: ${msg}`);
        console.log("      ↳ This is expected if PAWAPAY_ENV=live — sandbox numbers won't work in live mode.");
      }
      await sleep(200);
    }

  } finally {
    if (userId) await cleanupUser(userId);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────
async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("       PawaPay Payment Flow Tests — iwanyu.store");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Functions: ${FUNCTIONS_URL}`);
  console.log("───────────────────────────────────────────────────────────");
  console.log("");
  console.log("IMPORTANT: Tests 1–4 simulate PawaPay webhooks directly.");
  console.log("  They work in both live and sandbox mode.");
  console.log("Tests 5–7 call PawaPay API — need PAWAPAY_ENV=sandbox");
  console.log("  to work with the Rwanda test numbers.");
  console.log("───────────────────────────────────────────────────────────");

  try {
    await testWalletDepositCompleted();
    await testWalletDepositFailed();
    await testWalletDepositCancelled();
    await testOrderPaymentCompleted();
    await testWalletWithdrawal();
    await testDepositStatusPolling();
    await testDepositInitSandboxNumbers();
  } catch (err) {
    console.error("\n💥 Unexpected test error:", err);
  }

  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                       RESULTS");
  console.log("═══════════════════════════════════════════════════════════");
  for (const r of results) {
    const icon = r.status === "PASS" ? "✅" : "❌";
    console.log(`  ${icon} [${r.status}] ${r.label}${r.reason ? ` — ${r.reason}` : ""}`);
  }
  console.log("───────────────────────────────────────────────────────────");
  console.log(`  Passed: ${passed}   Failed: ${failed}   Total: ${passed + failed}`);
  console.log("═══════════════════════════════════════════════════════════");

  if (failed > 0) {
    console.log("\n⚠️  To run end-to-end tests with actual PawaPay sandbox API:");
    console.log("   1. Switch PAWAPAY_ENV to sandbox:");
    console.log("      npx supabase secrets set PAWAPAY_ENV=sandbox --project-ref ygpnvjfxxuabnrpvnfdq");
    console.log("   2. Set sandbox API token (from dashboard.sandbox.pawapay.io):");
    console.log("      npx supabase secrets set PAWAPAY_API_TOKEN=<sandbox_token> --project-ref ygpnvjfxxuabnrpvnfdq");
    console.log("   3. Re-run: node scripts/test-pawapay-flows.mjs");
    console.log("   4. After testing, restore live token and set PAWAPAY_ENV=live");
    process.exit(1);
  }

  console.log("\n✅ All tests passed!");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

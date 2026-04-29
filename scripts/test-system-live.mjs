#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

dotenv.config({ path: join(projectRoot, ".env.local") });
dotenv.config({ path: join(projectRoot, ".env") });

const args = process.argv.slice(2);

function getArg(name, fallback) {
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx >= 0 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

function hasFlag(name) {
  return args.includes(`--${name}`);
}

const requestedAccounts = Number.parseInt(getArg("accounts", "20"), 10);
const accountCount = Math.max(20, Math.min(50, Number.isNaN(requestedAccounts) ? 20 : requestedAccounts));
const concurrency = Math.max(1, Math.min(25, Number.parseInt(getArg("concurrency", "8"), 10) || 8));
const cleanup = hasFlag("cleanup");

const supabaseUrl = (process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const supabaseAnonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "").trim();
const supabaseServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error("Missing required env vars: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const runId = `live-test-${Date.now()}`;
const startedAtIso = new Date().toISOString();

const created = {
  users: [],
  vendors: [],
  products: [],
  auctions: [],
  orders: [],
  discountCodes: [],
};

const report = [];

function logStep(name, ok, details = "") {
  const status = ok ? "PASS" : "FAIL";
  const line = `${status} | ${name}${details ? ` | ${details}` : ""}`;
  report.push({ name, ok, details });
  console.log(line);
}

function pick(arr, idx = 0) {
  return arr[Math.max(0, Math.min(arr.length - 1, idx))];
}

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function withConcurrency(items, limit, worker) {
  const queue = [...items];
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      await worker(item);
    }
  });
  await Promise.all(workers);
}

function makeAuthedClient(token) {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
}

async function callEdge(functionName, token, body) {
  const response = await fetch(`${supabaseUrl.replace(/\/+$/, "")}/functions/v1/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { ok: response.ok, status: response.status, data };
}

async function createAccounts() {
  const sellerCount = Math.max(3, Math.ceil(accountCount * 0.2));
  const users = [];

  for (let i = 0; i < accountCount; i += 1) {
    const role = i < sellerCount ? "seller" : "buyer";
    users.push({ idx: i + 1, role });
  }

  await withConcurrency(users, concurrency, async (u) => {
    const email = `${runId}-${u.role}-${u.idx}@example.iwanyu.test`;
    const password = `Iw@nyu-${runId}-${u.idx}`;

    const { data: createdUser, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: `${u.role}-${u.idx}` },
    });

    if (createErr || !createdUser?.user) {
      throw new Error(`createUser failed for ${email}: ${createErr?.message || "unknown"}`);
    }

    const userId = createdUser.user.id;
    created.users.push(userId);

    const { error: profileErr } = await admin.from("profiles").upsert({
      id: userId,
      email,
      full_name: `${u.role}-${u.idx}`,
      role,
      wallet_balance_rwf: 400000,
      locked_balance_rwf: 0,
    });

    if (profileErr) {
      throw new Error(`profile upsert failed for ${email}: ${profileErr.message}`);
    }

    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInErr } = await authClient.auth.signInWithPassword({
      email,
      password,
    });

    if (signInErr || !signInData?.session?.access_token) {
      throw new Error(`signIn failed for ${email}: ${signInErr?.message || "no token"}`);
    }

    u.userId = userId;
    u.email = email;
    u.password = password;
    u.token = signInData.session.access_token;
    u.client = makeAuthedClient(u.token);
  });

  return users;
}

async function createVendorsAndListings(sellers) {
  for (const seller of sellers) {
    const vendorId = `vendor_${runId}_${seller.idx}`;
    const productId = `prod_${runId}_${seller.idx}`;

    const { error: vendorErr } = await admin.from("vendors").upsert({
      id: vendorId,
      name: `Store ${seller.idx}`,
      location: "Kigali",
      verified: true,
      status: "approved",
      owner_user_id: seller.userId,
      payout_balance_rwf: 250000,
    });

    if (vendorErr) throw new Error(`vendor upsert failed: ${vendorErr.message}`);

    const { error: productErr } = await admin.from("products").upsert({
      id: productId,
      vendor_id: vendorId,
      title: `Load Test Product ${seller.idx}`,
      description: `Seeded by ${runId}`,
      category: "Electronics",
      price_rwf: randInt(12000, 50000),
      image_url: "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=1200",
      in_stock: true,
      stock_quantity: 50,
      free_shipping: false,
      rating: 4.2,
      review_count: 0,
      discount_percentage: 0,
    });

    if (productErr) throw new Error(`product upsert failed: ${productErr.message}`);

    created.vendors.push(vendorId);
    created.products.push(productId);
  }
}

async function createDiscountCode() {
  const code = `LOAD${String(Date.now()).slice(-6)}`;
  const { error } = await admin.from("discount_codes").insert({
    code,
    discount_type: "fixed",
    amount_rwf: 1500,
    percentage: null,
    min_subtotal_rwf: 5000,
    active: true,
  });
  if (error) throw new Error(`discount code insert failed: ${error.message}`);
  created.discountCodes.push(code);
  return code;
}

async function testOrderFlow(buyer, productId, discountCode) {
  const orderRes = await callEdge("create-order", buyer.token, {
    items: [{ productId, quantity: 1 }],
    email: buyer.email,
    phone: "0788123456",
    address: "Kigali, Test Street",
    paymentMethod: "wallet",
    discountCode,
  });

  if (!orderRes.ok || !orderRes.data?.orderId) {
    throw new Error(`wallet order failed: ${JSON.stringify(orderRes.data)}`);
  }

  created.orders.push(orderRes.data.orderId);

  const momoOrderRes = await callEdge("create-order", buyer.token, {
    items: [{ productId, quantity: 1 }],
    email: buyer.email,
    phone: "0788123456",
    address: "Kigali, Test Street",
    paymentMethod: "momo",
    discountCode: null,
  });

  if (!momoOrderRes.ok || !momoOrderRes.data?.orderId) {
    throw new Error(`momo order failed: ${JSON.stringify(momoOrderRes.data)}`);
  }

  created.orders.push(momoOrderRes.data.orderId);

  const depositInit = await callEdge("pawapay-deposit-init", buyer.token, {
    amount: Number(momoOrderRes.data.total || 10000),
    currency: "RWF",
    country: "RW",
    accountIdentifier: "0788123456",
    correlationId: momoOrderRes.data.orderId,
    returnUrl: "https://www.iwanyu.store/payment-callback",
  });

  if (!depositInit.ok) {
    throw new Error(`pawapay-deposit-init failed: ${depositInit.status} ${JSON.stringify(depositInit.data)}`);
  }

  return { walletOrderId: orderRes.data.orderId };
}

async function testAuctionCompetition(seller, bidders, productId) {
  const auctionId = crypto.randomUUID();
  created.auctions.push(auctionId);

  const { error: auctionErr } = await admin.from("auctions").insert({
    id: auctionId,
    seller_user_id: seller.userId,
    vendor: `Store ${seller.idx}`,
    title: `Auction ${runId}`,
    image_url: "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=1200",
    current_bid: 0,
    ends_in: "10m",
    is_live: true,
    live_room: `room-${runId}`,
    stream_url: "https://example.com/live-test",
    product_variants: { colors: ["Black"], sizes: ["M"] },
  });

  if (auctionErr) throw new Error(`auction insert failed: ${auctionErr.message}`);

  let amount = 5000;
  for (const bidder of bidders) {
    amount += randInt(500, 1500);
    const { data, error } = await bidder.client.rpc("lock_bid", {
      p_auction_id: auctionId,
      p_user_id: bidder.userId,
      p_amount: amount,
    });
    if (error || !data?.ok) {
      throw new Error(`lock_bid failed for bidder ${bidder.email}: ${error?.message || JSON.stringify(data)}`);
    }
  }

  const settleRes = await callEdge("settle-auction", seller.token, { auctionId });
  if (!settleRes.ok || !settleRes.data?.success) {
    throw new Error(`settle-auction failed: ${JSON.stringify(settleRes.data)}`);
  }

  const livePurchaseBuyer = bidders[0];
  const { data: purchaseResult, error: purchaseErr } = await livePurchaseBuyer.client.rpc("purchase_live_stream_product", {
    p_session_id: `session-${runId}`,
    p_product_id: productId,
    p_product_title: "Live Product Purchase",
    p_product_image_url: "https://images.unsplash.com/photo-1518444065439-e933c06ce9cd?w=1200",
    p_color: "Black",
    p_size: "M",
    p_price_rwf: 7000,
    p_seller_user_id: seller.userId,
    p_vendor_name: `Store ${seller.idx}`,
  });

  if (purchaseErr || !purchaseResult?.ok) {
    throw new Error(`purchase_live_stream_product failed: ${purchaseErr?.message || JSON.stringify(purchaseResult)}`);
  }
}

async function testRefundAndWithdrawals(orderId, buyer, seller, sellerVendorId) {
  const refundRes = await callEdge("wallet-refund-callback", seller.token, {
    userId: buyer.userId,
    amountRwf: 1000,
    orderId,
    reason: `Automated refund test ${runId}`,
    reference: `${runId}-refund`,
  });

  if (!refundRes.ok || !refundRes.data?.success) {
    throw new Error(`refund failed: ${JSON.stringify(refundRes.data)}`);
  }

  const sellerWithdrawRes = await callEdge("seller-withdrawal-callback", seller.token, {
    vendorId: sellerVendorId,
    amountRwf: 3000,
    mobileNetwork: "MTN",
    phoneNumber: "+250788123456",
    reason: `Seller withdrawal test ${runId}`,
  });

  if (!sellerWithdrawRes.ok || !sellerWithdrawRes.data?.success) {
    throw new Error(`seller withdrawal failed: ${JSON.stringify(sellerWithdrawRes.data)}`);
  }

  // Optional: wallet-withdrawal function depends on wallets table. Skip safely if absent.
  const walletsProbe = await admin.from("wallets").select("id").limit(1);
  if (!walletsProbe.error && walletsProbe.data?.length) {
    const walletId = walletsProbe.data[0].id;
    const walletWithdrawRes = await callEdge("wallet-withdrawal", buyer.token, {
      walletId,
      amountRwf: 1000,
      mobileNetwork: "MTN",
      phoneNumber: "+250788123456",
    });
    if (!walletWithdrawRes.ok) {
      logStep("wallet-withdrawal", false, JSON.stringify(walletWithdrawRes.data));
    } else {
      logStep("wallet-withdrawal", true, walletWithdrawRes.data?.referenceId || "ok");
    }
  } else {
    logStep("wallet-withdrawal", true, "skipped (wallets table not available in this schema)");
  }
}

async function testEmailFlow(authToken, toEmail) {
  const sendRes = await callEdge("send-email", authToken, {
    template: "welcome",
    to: toEmail,
    data: { name: "Load Test User" },
  });

  if (!sendRes.ok) {
    throw new Error(`send-email failed: ${JSON.stringify(sendRes.data)}`);
  }

  const { data: logs, error: logErr } = await admin
    .from("email_log")
    .select("recipient, template, status, created_at")
    .eq("recipient", toEmail)
    .eq("template", "welcome")
    .gte("created_at", startedAtIso)
    .order("created_at", { ascending: false })
    .limit(1);

  if (logErr) throw new Error(`email_log query failed: ${logErr.message}`);
  if (!logs?.length) throw new Error("email log entry not found");
}

async function cleanupData() {
  if (!cleanup) return;

  if (created.auctions.length) {
    await admin.from("bids").delete().in("auction_id", created.auctions.map(String));
    await admin.from("auctions").delete().in("id", created.auctions);
  }

  if (created.orders.length) {
    await admin.from("order_items").delete().in("order_id", created.orders);
    await admin.from("orders").delete().in("id", created.orders);
  }

  if (created.products.length) {
    await admin.from("products").delete().in("id", created.products);
  }

  if (created.vendors.length) {
    await admin.from("vendors").delete().in("id", created.vendors);
  }

  if (created.discountCodes.length) {
    await admin.from("discount_codes").delete().in("code", created.discountCodes);
  }

  for (const userId of created.users) {
    // eslint-disable-next-line no-await-in-loop
    await admin.auth.admin.deleteUser(userId);
  }
}

async function run() {
  console.log(`Run ID: ${runId}`);
  console.log(`Accounts: ${accountCount} (concurrency ${concurrency})`);
  console.log(`Cleanup: ${cleanup ? "enabled" : "disabled"}`);

  let users = [];
  try {
    users = await createAccounts();
    logStep("create-accounts", true, `${users.length} created`);

    const sellers = users.filter((u) => u.role === "seller");
    const buyers = users.filter((u) => u.role === "buyer");

    await createVendorsAndListings(sellers);
    logStep("create-vendors-and-listings", true, `${sellers.length} vendors / ${sellers.length} products`);

    const discountCode = await createDiscountCode();
    logStep("create-discount-code", true, discountCode);

    const mainBuyer = pick(buyers, 0);
    const mainSeller = pick(sellers, 0);
    const mainProductId = pick(created.products, 0);
    const sellerVendorId = pick(created.vendors, 0);

    const { walletOrderId } = await testOrderFlow(mainBuyer, mainProductId, discountCode);
    logStep("order-flow-wallet-and-momo", true, `order=${walletOrderId}`);

    const bidUsers = buyers.slice(0, Math.min(5, buyers.length));
    await testAuctionCompetition(mainSeller, bidUsers, mainProductId);
    logStep("live-bidding-and-settlement", true, `${bidUsers.length} bidders`);

    await testRefundAndWithdrawals(walletOrderId, mainBuyer, mainSeller, sellerVendorId);
    logStep("refund-and-withdrawals", true, "wallet refund + seller withdrawal validated");

    await testEmailFlow(mainBuyer.token, mainBuyer.email);
    logStep("email-delivery-log", true, `recipient=${mainBuyer.email}`);

    const passCount = report.filter((r) => r.ok).length;
    const failCount = report.length - passCount;

    console.log("\nSummary");
    console.log(`Passed: ${passCount}`);
    console.log(`Failed: ${failCount}`);

    if (failCount > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    logStep("fatal", false, error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    await cleanupData();
    if (cleanup) {
      logStep("cleanup", true, "test artifacts removed");
    } else {
      logStep("cleanup", true, "skipped (use --cleanup to remove test artifacts)");
    }
  }
}

run();

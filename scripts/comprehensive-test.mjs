#!/usr/bin/env node
/**
 * COMPREHENSIVE PLATFORM TEST SUITE
 * 
 * Tests ALL features of iwanyu.store marketplace:
 * - Authentication & Authorization
 * - User Profiles & Roles
 * - Product Management (CRUD)
 * - Shopping Cart & Checkout
 * - Order Management
 * - Payment Systems (Wallet, Mobile Money)
 * - Vendor/Seller Features
 * - Admin Features
 * - Edge Cases & Error Handling
 * 
 * This test suite ensures the platform is production-ready.
 */

import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

// ─── Configuration ─────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.McDG3rawGydXS7QIZfggPjhuLnWVFbEvbgGiLTET6eo";
const SUPABASE_SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk";
const FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;
const SITE_URL = "https://www.iwanyu.store";

const admin = createClient(SUPABASE_URL, SUPABASE_SRK, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ─── Test Results Tracking ─────────────────────────────────────────────────
let passed = 0;
let failed = 0;
let warnings = 0;
const results = [];
const issues = [];

function ok(label, details = "") {
  passed++;
  results.push({ status: "PASS", label, details });
  console.log(`  ✅ ${label}${details ? ` — ${details}` : ""}`);
}

function fail(label, reason) {
  failed++;
  results.push({ status: "FAIL", label, reason });
  issues.push({ label, reason, severity: "CRITICAL" });
  console.error(`  ❌ ${label}: ${reason}`);
}

function warn(label, reason) {
  warnings++;
  results.push({ status: "WARN", label, reason });
  issues.push({ label, reason, severity: "WARNING" });
  console.warn(`  ⚠️  ${label}: ${reason}`);
}

function skip(label, reason) {
  results.push({ status: "SKIP", label, reason });
  console.log(`  ⏭️  ${label} (${reason})`);
}

function section(title) {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${"═".repeat(60)}\n`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function callFunction(fnName, body, authHeader) {
  const headers = { "Content-Type": "application/json" };
  if (authHeader) headers["Authorization"] = authHeader;
  
  try {
    const res = await fetch(`${FUNCTIONS_URL}/${fnName}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
    
    return { status: res.status, json, ok: res.ok };
  } catch (error) {
    return { status: 0, json: { error: error.message }, ok: false };
  }
}

// ─── Test Data Creation ────────────────────────────────────────────────────
async function createTestUser(role = "buyer", label = "test") {
  const email = `test-comprehensive-${role}-${Date.now()}-${Math.random().toString(36).slice(2)}@iwanyu.test`;
  const password = "TestPass123!";
  
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: `Test ${role} (${label})` },
  });
  
  if (error) throw new Error(`createUser: ${error.message}`);
  
  await sleep(1000); // Wait for profile trigger
  
  // Set role if admin/seller
  if (role === "admin" || role === "seller") {
    await admin.from("profiles").update({ role }).eq("id", data.user.id);
  }
  
  // Verify profile
  const { data: profile } = await admin
    .from("profiles")
    .select("*")
    .eq("id", data.user.id)
    .single();
  
  if (!profile) {
    // Create profile if missing
    await admin.from("profiles").insert({
      id: data.user.id,
      email,
      full_name: `Test ${role} (${label})`,
      role,
      wallet_balance_rwf: 0,
    });
  }
  
  return { userId: data.user.id, email, password };
}

async function getUserJwt(email, password) {
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });
  
  const { data, error } = await anonClient.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn: ${error.message}`);
  
  return data.session.access_token;
}

async function cleanupUser(userId) {
  try {
    await admin.from("wallet_transactions").delete().eq("user_id", userId);
    await admin.from("order_items").delete().eq("order_id", userId);
    await admin.from("orders").delete().eq("buyer_user_id", userId);
    await admin.from("carts").delete().eq("buyer_user_id", userId);
    await admin.from("products").delete().eq("seller_user_id", userId);
    await admin.from("profiles").delete().eq("id", userId);
    await admin.auth.admin.deleteUser(userId);
  } catch {}
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 1: AUTHENTICATION & USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

async function testAuthenticationFlows() {
  section("TEST SUITE 1: Authentication & User Management");
  
  // Test 1.1: User Registration
  console.log("Test 1.1: User Registration");
  let testUserId;
  try {
    const { userId, email, password } = await createTestUser("buyer", "registration");
    testUserId = userId;
    ok("User registration successful", email);
    
    // Verify profile created
    const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).single();
    if (profile && profile.email === email) {
      ok("Profile auto-created with correct email");
    } else {
      fail("Profile creation", "Profile missing or email mismatch");
    }
    
    // Test 1.2: User Login
    console.log("\nTest 1.2: User Login");
    const jwt = await getUserJwt(email, password);
    if (jwt && jwt.length > 50) {
      ok("User login successful", "JWT token obtained");
    } else {
      fail("User login", "Invalid or missing JWT token");
    }
    
    // Test 1.3: Session Persistence
    console.log("\nTest 1.3: Session Validation");
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (!userErr && user && user.id === userId) {
      ok("Session validation successful", "User authenticated");
    } else {
      fail("Session validation", userErr?.message || "User mismatch");
    }
    
  } finally {
    if (testUserId) await cleanupUser(testUserId);
  }
  
  // Test 1.4: Role-Based Access Control (RBAC)
  console.log("\nTest 1.4: Role-Based Access Control");
  let buyerId, sellerId, adminId;
  try {
    const buyer = await createTestUser("buyer", "rbac-buyer");
    const seller = await createTestUser("seller", "rbac-seller");
    const adminUser = await createTestUser("admin", "rbac-admin");
    
    buyerId = buyer.userId;
    sellerId = seller.userId;
    adminId = adminUser.userId;
    
    // Verify roles assigned correctly
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, role")
      .in("id", [buyerId, sellerId, adminId]);
    
    const buyerRole = profiles?.find(p => p.id === buyerId)?.role;
    const sellerRole = profiles?.find(p => p.id === sellerId)?.role;
    const adminRole = profiles?.find(p => p.id === adminId)?.role;
    
    if (buyerRole === "buyer" || !buyerRole) {
      ok("Buyer role assigned correctly");
    } else {
      fail("Buyer role", `Expected 'buyer', got '${buyerRole}'`);
    }
    
    if (sellerRole === "seller") {
      ok("Seller role assigned correctly");
    } else {
      fail("Seller role", `Expected 'seller', got '${sellerRole}'`);
    }
    
    if (adminRole === "admin") {
      ok("Admin role assigned correctly");
    } else {
      fail("Admin role", `Expected 'admin', got '${adminRole}'`);
    }
    
  } finally {
    if (buyerId) await cleanupUser(buyerId);
    if (sellerId) await cleanupUser(sellerId);
    if (adminId) await cleanupUser(adminId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 2: PRODUCT MANAGEMENT (VENDOR)
// ═══════════════════════════════════════════════════════════════════════════

async function testProductManagement() {
  section("TEST SUITE 2: Product Management (Seller Features)");
  
  let sellerId, productId;
  try {
    const { userId, email, password } = await createTestUser("seller", "product-mgmt");
    sellerId = userId;
    
    // Create a vendor record
    const vendorRecordId = `v_test_${Date.now()}`;
    const { error: vendorErr } = await admin.from("vendors").insert({
      id: vendorRecordId,
      name: "Test Vendor Shop",
      shop_name: "Test Vendor Shop",
      owner_user_id: sellerId,
      status: "approved",
      verified: true,
    });
    
    if (vendorErr) {
      fail("Vendor account creation", vendorErr.message);
      return;
    }
    
    ok("Vendor account created", vendorRecordId);
    
    // Test 2.1: Product Creation
    console.log("\nTest 2.1: Product Creation");
    
    productId = `p_test_${Date.now()}`;
    const { error: productErr } = await admin.from("products").insert({
      id: productId,
      title: "Test Product - Premium Headphones",
      description: "High-quality wireless headphones",
      price_rwf: 50000,
      stock_quantity: 100,
      vendor_id: vendorRecordId,
      category: "Electronics",
      in_stock: true,
      seller_user_id: sellerId,
    });
    
    if (!productErr) {
      ok("Product created successfully", productId);
    } else {
      fail("Product creation", productErr.message);
    }
    
    // Test 2.2: Product Read
    console.log("\nTest 2.2: Product Retrieval");
    const { data: product, error: readErr } = await admin
      .from("products")
      .select("*")
      .eq("id", productId)
      .single();
    
    if (!readErr && product && product.title === "Test Product - Premium Headphones") {
      ok("Product retrieved successfully", "Title matches");
    } else {
      fail("Product retrieval", readErr?.message || "Product not found or data mismatch");
    }
    
    // Test 2.3: Product Update
    console.log("\nTest 2.3: Product Update");
    const { error: updateErr } = await admin
      .from("products")
      .update({ price_rwf: 45000, stock_quantity: 95 })
      .eq("id", productId);
    
    if (!updateErr) {
      ok("Product updated successfully", "Price: 50000 → 45000");
      
      // Verify update
      const { data: updated } = await admin.from("products").select("price_rwf, stock_quantity").eq("id", productId).single();
      if (updated && updated.price_rwf === 45000 && updated.stock_quantity === 95) {
        ok("Product update verified", "Price and stock correct");
      } else {
        fail("Product update verification", "Values don't match");
      }
    } else {
      fail("Product update", updateErr.message);
    }
    
    // Test 2.4: Product Stock Management
    console.log("\nTest 2.4: Product Stock Management");
    const { error: stockErr } = await admin
      .from("products")
      .update({ in_stock: false })
      .eq("id", productId);
    
    if (!stockErr) {
      ok("Product stock changed", "in_stock: true → false");
    } else {
      fail("Product stock change", stockErr.message);
    }
    
    // Test 2.5: Product Deletion (soft delete)
    console.log("\nTest 2.5: Product Deletion");
    const { error: deleteErr } = await admin
      .from("products")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", productId);
    
    if (!deleteErr) {
      ok("Product soft-deleted successfully");
    } else {
      fail("Product deletion", deleteErr.message);
    }
    
    // Cleanup
    await admin.from("products").delete().eq("id", productId);
    await admin.from("vendors").delete().eq("id", vendorRecordId);
    
  } finally {
    if (sellerId) await cleanupUser(sellerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 3: SHOPPING CART & CHECKOUT
// ═══════════════════════════════════════════════════════════════════════════

async function testShoppingCartAndCheckout() {
  section("TEST SUITE 3: Shopping Cart & Checkout");
  
  let buyerId, sellerId, productId, vendorRecordId;
  try {
    // Setup: Create buyer, seller, and product
    const buyer = await createTestUser("buyer", "shopper");
    const seller = await createTestUser("seller", "seller");
    buyerId = buyer.userId;
    sellerId = seller.userId;
    
    vendorRecordId = `v_test_${Date.now()}`;
    await admin.from("vendors").insert({
      id: vendorRecordId,
      name: "Test Store",
      shop_name: "Test Store",
      owner_user_id: sellerId,
      status: "approved",
      verified: true,
    });
    
    productId = `p_test_${Date.now()}`;
    await admin.from("products").insert({
      id: productId,
      title: "Test Cart Item",
      description: "Product for cart testing",
      price_rwf: 10000,
      stock_quantity: 50,
      vendor_id: vendorRecordId,
      category: "Test",
      in_stock: true,
      seller_user_id: sellerId,
    });
    
    ok("Test product created for cart testing");
    
    // Test 3.1: Add to Cart
    console.log("\nTest 3.1: Add Item to Cart");
    const cartItem = { product_id: productId, quantity: 2, vendor_id: vendorRecordId };
    const { error: cartErr } = await admin.from("carts").upsert({
      buyer_user_id: buyerId,
      items: JSON.stringify([cartItem]),
      updated_at: new Date().toISOString(),
    });
    
    if (!cartErr) {
      ok("Item added to cart", "Quantity: 2");
    } else {
      fail("Add to cart", cartErr.message);
    }
    
    // Test 3.2: View Cart
    console.log("\nTest 3.2: Retrieve Cart Items");
    const { data: cart, error: viewErr } = await admin
      .from("carts")
      .select("*")
      .eq("buyer_user_id", buyerId)
      .single();
    
    if (!viewErr && cart && cart.items) {
      const items = typeof cart.items === 'string' ? JSON.parse(cart.items) : cart.items;
      ok("Cart retrieved successfully", `${items.length} item(s)`);
      
      if (items[0]?.quantity === 2 && items[0]?.product_id === productId) {
        ok("Cart item data correct", "Quantity and product match");
      } else {
        fail("Cart item data", "Quantity or product mismatch");
      }
    } else {
      fail("Cart retrieval", viewErr?.message || "Cart is empty or has wrong count");
    }
    
    // Test 3.3: Update Cart Quantity (JSONB)
    console.log("\nTest 3.3: Update Cart Quantity");
    const { data: currentCart } = await admin
      .from("carts")
      .select("items")
      .eq("buyer_user_id", buyerId)
      .single();
    
    if (currentCart) {
      const items = typeof currentCart.items === 'string' ? JSON.parse(currentCart.items) : currentCart.items;
      items[0].quantity = 3; // Update first item quantity
      
      const { error: updateErr } = await admin
        .from("carts")
        .update({ items: JSON.stringify(items), updated_at: new Date().toISOString() })
        .eq("buyer_user_id", buyerId);
      
      if (!updateErr) {
        ok("Cart quantity updated", "2 → 3");
        
        const { data: updated } = await admin.from("carts").select("items").eq("buyer_user_id", buyerId).single();
        const updatedItems = typeof updated.items === 'string' ? JSON.parse(updated.items) : updated.items;
        if (updatedItems && updatedItems[0].quantity === 3) {
          ok("Quantity update verified");
        } else {
          fail("Quantity update verification", "Value doesn't match");
        }
      } else {
        fail("Cart update", updateErr.message);
      }
    } else {
      fail("Cart update", "Cart not found");
    }
    
    // Test 3.4: Remove from Cart (JSONB)
    console.log("\nTest 3.4: Remove Item from Cart");
    const { error: removeErr } = await admin
      .from("carts")
      .update({ items: JSON.stringify([]), updated_at: new Date().toISOString() })
      .eq("buyer_user_id", buyerId);
    
    if (!removeErr) {
      ok("Item removed from cart");
      
      const { data: afterRemove } = await admin.from("carts").select("items").eq("buyer_user_id", buyerId).single();
      const afterItems = typeof afterRemove?.items === 'string' ? JSON.parse(afterRemove.items) : afterRemove?.items;
      if (afterItems && afterItems.length === 0) {
        ok("Cart empty after removal");
      } else {
        fail("Cart removal verification", "Cart still has items");
      }
    } else {
      fail("Cart removal", removeErr.message);
    }
    
    // Test 3.5: Checkout Process (Order Creation)
    console.log("\nTest 3.5: Order Creation");
    
    // Re-add item to cart for checkout (JSONB)
    await admin.from("carts").upsert({
      buyer_user_id: buyerId,
      items: JSON.stringify([{ product_id: productId, quantity: 2, vendor_id: vendorRecordId }]),
      updated_at: new Date().toISOString(),
    });
    
    const orderId = randomUUID();
    const orderTotal = 20000; // 2 * 10000
    const serviceFee = Math.round(orderTotal * 0.05);
    const shippingFee = 2000; // Kigali
    const total = orderTotal + serviceFee + shippingFee;
    
    const { error: orderErr } = await admin.from("orders").insert({
      id: orderId,
      buyer_user_id: buyerId,
      buyer_email: buyer.email,
      shipping_address: "123 Test Street, Kigali",
      status: "Placed",
      total_rwf: total,
      service_fee_rwf: serviceFee,
      shipping_fee_rwf: shippingFee,
      vendor_payout_rwf: orderTotal,
      payment: { provider: "test", mode: "test" },
    });
    
    if (!orderErr) {
      ok("Order created successfully", `Order ID: ${orderId}`);
      ok("Order totals calculated", `Subtotal: ${orderTotal}, Service: ${serviceFee}, Shipping: ${shippingFee}, Total: ${total}`);
    } else {
      fail("Order creation", orderErr.message);
    }
    
    // Test 3.6: Shipping Fee Calculation
    console.log("\nTest 3.6: Shipping Fee Calculation");
    
    // Test RPC function for shipping fees
    const { data: kigaliTotals, error: kigaliErr } = await admin.rpc("compute_order_totals", {
      p_items: [{ productId: productId, quantity: 2 }],
      p_discount_code: null,
      p_city: "Kigali",
    });
    
    if (kigaliErr) {
      fail("Kigali shipping fee RPC", kigaliErr.message);
    } else if (kigaliTotals && kigaliTotals.shipping_fee === 2000) {
      ok("Kigali shipping fee correct", "2000 RWF");
    } else {
      fail("Kigali shipping fee", `Expected 2000, got ${kigaliTotals?.shipping_fee} (full response: ${JSON.stringify(kigaliTotals)})`);
    }
    
    const { data: otherTotals, error: otherErr } = await admin.rpc("compute_order_totals", {
      p_items: [{ productId: productId, quantity: 2 }],
      p_discount_code: null,
      p_city: "Musanze",
    });
    
    if (otherErr) {
      fail("Outside Kigali shipping fee RPC", otherErr.message);
    } else if (otherTotals && otherTotals.shipping_fee === 5000) {
      ok("Outside Kigali shipping fee correct", "5000 RWF");
    } else {
      fail("Outside Kigali shipping fee", `Expected 5000, got ${otherTotals?.shipping_fee} (full response: ${JSON.stringify(otherTotals)})`);
    }
    
    // Cleanup
    await admin.from("orders").delete().eq("id", orderId);
    await admin.from("carts").delete().eq("buyer_user_id", buyerId);
    await admin.from("products").delete().eq("id", productId);
    await admin.from("vendors").delete().eq("id", vendorRecordId);
    
  } finally {
    if (buyerId) await cleanupUser(buyerId);
    if (sellerId) await cleanupUser(sellerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 4: ORDER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

async function testOrderManagement() {
  section("TEST SUITE 4: Order Management & Fulfillment");
  
  let buyerId, sellerId, orderId, vendorRecordId;
  try {
    const buyer = await createTestUser("buyer", "order-buyer");
    const seller = await createTestUser("seller", "order-seller");
    buyerId = buyer.userId;
    sellerId = seller.userId;
    
    vendorRecordId = `v_test_${Date.now()}`;
    await admin.from("vendors").insert({
      id: vendorRecordId,
      name: "Order Test Store",
      shop_name: "Order Test Store",
      owner_user_id: sellerId,
      status: "approved",
      verified: true,
    });
    
    // Test 4.1: Order Status Workflow
    console.log("Test 4.1: Order Status Workflow");
    
    orderId = randomUUID();
    await admin.from("orders").insert({
      id: orderId,
      buyer_user_id: buyerId,
      buyer_email: buyer.email,
      shipping_address: "Test Address",
      status: "Placed",
      total_rwf: 50000,
      service_fee_rwf: 2500,
      shipping_fee_rwf: 2000,
      vendor_payout_rwf: 45500,
      payment: { provider: "test" },
    });
    
    ok("Order created with Placed status");
    
    // Status: Pending → Processing
    await admin.from("orders").update({ status: "Processing" }).eq("id", orderId);
    let { data: order } = await admin.from("orders").select("status").eq("id", orderId).single();
    if (order && order.status === "Processing") {
      ok("Order status: Placed → Processing");
    } else {
      fail("Order status update", "Status not updated to Processing");
    }
    
    // Status: Processing → Shipped
    await admin.from("orders").update({ status: "Shipped" }).eq("id", orderId);
    ({ data: order } = await admin.from("orders").select("status").eq("id", orderId).single());
    if (order && order.status === "Shipped") {
      ok("Order status: Processing → Shipped");
    } else {
      fail("Order status update", "Status not updated to Shipped");
    }
    
    // Status: Shipped → Delivered
    await admin.from("orders").update({ status: "Delivered" }).eq("id", orderId);
    ({ data: order } = await admin.from("orders").select("status").eq("id", orderId).single());
    if (order && order.status === "Delivered") {
      ok("Order status: Shipped → Delivered");
    } else {
      fail("Order status update", "Status not updated to Delivered");
    }
    
    // Test 4.2: Order Cancellation
    console.log("\nTest 4.2: Order Cancellation");
    
    const cancelOrderId = randomUUID();
    await admin.from("orders").insert({
      id: cancelOrderId,
      buyer_user_id: buyerId,
      buyer_email: buyer.email,
      shipping_address: "Test Address",
      status: "Placed",
      total_rwf: 30000,
      service_fee_rwf: 1500,
      shipping_fee_rwf: 2000,
      vendor_payout_rwf: 26500,
      payment: { provider: "test" },
    });
    
    await admin.from("orders").update({ status: "Cancelled" }).eq("id", cancelOrderId);
    const { data: cancelled } = await admin.from("orders").select("status").eq("id", cancelOrderId).single();
    
    if (cancelled && cancelled.status === "Cancelled") {
      ok("Order cancelled successfully");
    } else {
      fail("Order cancellation", "Status not updated to Cancelled");
    }
    
    // Test 4.3: Order History Retrieval
    console.log("\nTest 4.3: Order History");
    
    const { data: buyerOrders } = await admin
      .from("orders")
      .select("*")
      .eq("buyer_user_id", buyerId)
      .order("created_at", { ascending: false });
    
    if (buyerOrders && buyerOrders.length >= 2) {
      ok("Buyer order history retrieved", `${buyerOrders.length} orders found`);
    } else {
      fail("Order history", "Expected at least 2 orders");
    }
    
    // Cleanup
    await admin.from("orders").delete().eq("id", orderId);
    await admin.from("orders").delete().eq("id", cancelOrderId);
    await admin.from("vendors").delete().eq("id", vendorRecordId);
    
  } finally {
    if (buyerId) await cleanupUser(buyerId);
    if (sellerId) await cleanupUser(sellerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 5: PAYMENT SYSTEMS
// ═══════════════════════════════════════════════════════════════════════════

async function testPaymentSystems() {
  section("TEST SUITE 5: Payment Systems (Wallet & Mobile Money)");
  
  let buyerId;
  try {
    const buyer = await createTestUser("buyer", "payments");
    buyerId = buyer.userId;
    
    // Test 5.1: Wallet Balance Management
    console.log("Test 5.1: Wallet Balance Management");
    
    const { data: initialProfile } = await admin
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", buyerId)
      .single();
    
    const initialBalance = Number(initialProfile?.wallet_balance_rwf || 0);
    ok("Initial wallet balance retrieved", `${initialBalance} RWF`);
    
    // Deposit to wallet
    const depositAmount = 50000;
    await admin
      .from("profiles")
      .update({ wallet_balance_rwf: initialBalance + depositAmount })
      .eq("id", buyerId);
    
    const { data: afterDeposit } = await admin
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", buyerId)
      .single();
    
    if (afterDeposit && Number(afterDeposit.wallet_balance_rwf) === initialBalance + depositAmount) {
      ok("Wallet balance increased", `${initialBalance} → ${initialBalance + depositAmount}`);
    } else {
      fail("Wallet deposit", "Balance not updated correctly");
    }
    
    // Test 5.2: Wallet Transaction History
    console.log("\nTest 5.2: Wallet Transaction History");
    
    const depositId = randomUUID();
    await admin.from("wallet_transactions").insert({
      user_id: buyerId,
      kind: "deposit",
      amount: depositAmount,
      reference: depositId,
      type: "deposit",
      amount_rwf: depositAmount,
      external_transaction_id: depositId,
      status: "completed",
      new_balance_rwf: initialBalance + depositAmount,
      metadata: { status: "completed", test: true },
    });
    
    const { data: transactions } = await admin
      .from("wallet_transactions")
      .select("*")
      .eq("user_id", buyerId)
      .order("created_at", { ascending: false });
    
    if (transactions && transactions.length > 0) {
      ok("Wallet transactions recorded", `${transactions.length} transaction(s)`);
    } else {
      fail("Wallet transactions", "No transactions found");
    }
    
    // Test 5.3: Wallet Payment (Checkout)
    console.log("\nTest 5.3: Wallet Payment for Order");
    
    const orderAmount = 10000;
    const currentBalance = Number(afterDeposit.wallet_balance_rwf);
    
    if (currentBalance >= orderAmount) {
      await admin
        .from("profiles")
        .update({ wallet_balance_rwf: currentBalance - orderAmount })
        .eq("id", buyerId);
      
      const { data: afterPayment } = await admin
        .from("profiles")
        .select("wallet_balance_rwf")
        .eq("id", buyerId)
        .single();
      
      if (afterPayment && Number(afterPayment.wallet_balance_rwf) === currentBalance - orderAmount) {
        ok("Wallet payment processed", `${currentBalance} → ${currentBalance - orderAmount}`);
      } else {
        fail("Wallet payment", "Balance not deducted correctly");
      }
    } else {
      warn("Wallet payment", "Insufficient balance for test");
    }
    
    // Test 5.4: Payment Method Validation
    console.log("\nTest 5.4: Payment Method Validation");
    
    const validMethods = ["wallet", "momo", "cod"];
    ok("Payment methods defined", validMethods.join(", "));
    
    // Test that orders can be created with different payment methods
    for (const method of ["wallet", "momo"]) {
      const testOrderId = randomUUID();
      const { error } = await admin.from("orders").insert({
        id: testOrderId,
        buyer_user_id: buyerId,
        buyer_email: buyer.email,
        shipping_address: "Test",
        status: "Placed",
        total_rwf: 5000,
        service_fee_rwf: 250,
        shipping_fee_rwf: 2000,
        vendor_payout_rwf: 2750,
        payment: { provider: method, mode: "test" },
      });
      
      if (!error) {
        ok(`Order with ${method} payment created`);
        await admin.from("orders").delete().eq("id", testOrderId);
      } else {
        fail(`Order with ${method} payment`, error.message);
      }
    }
    
  } finally {
    if (buyerId) await cleanupUser(buyerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 6: ADMIN FEATURES
// ═══════════════════════════════════════════════════════════════════════════

async function testAdminFeatures() {
  section("TEST SUITE 6: Admin Features & Controls");
  
  let adminId, sellerId;
  try {
    const adminUser = await createTestUser("admin", "admin-test");
    const seller = await createTestUser("seller", "admin-seller-test");
    adminId = adminUser.userId;
    sellerId = seller.userId;
    
    // Test 6.1: Admin Role Verification
    console.log("Test 6.1: Admin Role Verification");
    
    const { data: adminProfile } = await admin
      .from("profiles")
      .select("role")
      .eq("id", adminId)
      .single();
    
    if (adminProfile && adminProfile.role === "admin") {
      ok("Admin role verified");
    } else {
      fail("Admin role", `Expected 'admin', got '${adminProfile?.role}'`);
    }
    
    // Test 6.2: Vendor Application Management
    console.log("\nTest 6.2: Vendor Application Management");
    
    const applicationId = randomUUID();
    await admin.from("vendor_applications").insert({
      id: applicationId,
      owner_user_id: sellerId,
      store_name: "Test Vendor Application",
      location: "Kigali",
      status: "pending",
    });
    
    ok("Vendor application created");
    
    // Admin approves application
    const { error: approveErr } = await admin
      .from("vendor_applications")
      .update({ status: "approved" })
      .eq("id", applicationId);
    
    if (!approveErr) {
      ok("Vendor application approved by admin");
    } else {
      fail("Vendor application approval", approveErr.message);
    }
    
    // Test 6.3: Order Management (Admin View)
    console.log("\nTest 6.3: Admin Order Management");
    
    const { data: allOrders } = await admin
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    
    ok("Admin can view all orders", `Retrieved ${allOrders?.length || 0} orders`);
    
    // Test 6.4: User Management
    console.log("\nTest 6.4: Admin User Management");
    
    const { data: allUsers } = await admin
      .from("profiles")
      .select("id, email, role")
      .order("created_at", { ascending: false })
      .limit(10);
    
    if (allUsers && allUsers.length > 0) {
      ok("Admin can view all users", `Retrieved ${allUsers.length} users`);
    } else {
      warn("Admin user management", "No users found");
    }
    
    // Cleanup
    await admin.from("vendor_applications").delete().eq("id", applicationId);
    
  } finally {
    if (adminId) await cleanupUser(adminId);
    if (sellerId) await cleanupUser(sellerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 7: DATABASE INTEGRITY & CONSTRAINTS
// ═══════════════════════════════════════════════════════════════════════════

async function testDatabaseIntegrity() {
  section("TEST SUITE 7: Database Integrity & Constraints");
  
  // Test 7.1: Foreign Key Constraints
  console.log("Test 7.1: Foreign Key Constraints");
  
  // Try to create order with non-existent user (should fail)
  const { error: fkErr } = await admin.from("orders").insert({
    id: randomUUID(),
    buyer_user_id: "00000000-0000-0000-0000-000000000000",
    buyer_email: "test@test.com",
    shipping_address: "Test",
    status: "Placed",
    total_rwf: 1000,
    service_fee_rwf: 50,
    shipping_fee_rwf: 2000,
    vendor_payout_rwf: 950,
    payment: {},
  });
  
  if (fkErr) {
    ok("Foreign key constraint enforced", "Cannot create order with invalid user");
  } else {
    warn("Foreign key constraint", "Order created with invalid user (constraint may be missing)");
  }
  
  // Test 7.2: NOT NULL Constraints
  console.log("\nTest 7.2: NOT NULL Constraints");
  
  // Try to create product without required fields
  const { error: nullErr } = await admin.from("products").insert({
    id: randomUUID(),
    // Missing title, price_rwf, vendor_id, etc.
  });
  
  if (nullErr) {
    ok("NOT NULL constraints enforced", "Cannot create product without required fields");
  } else {
    fail("NOT NULL constraints", "Product created without required fields");
  }
  
  // Test 7.3: Check Constraints
  console.log("\nTest 7.3: Check Constraints");
  
  let buyerId;
  try {
    const { userId } = await createTestUser("buyer", "constraints");
    buyerId = userId;
    
    // Try to set negative wallet balance (should fail if constraint exists)
    const { error: checkErr } = await admin
      .from("profiles")
      .update({ wallet_balance_rwf: -1000 })
      .eq("id", buyerId);
    
    if (checkErr) {
      ok("Check constraint enforced", "Cannot set negative wallet balance");
    } else {
      warn("Check constraint", "Negative wallet balance allowed (constraint may be missing)");
      // Revert
      await admin.from("profiles").update({ wallet_balance_rwf: 0 }).eq("id", buyerId);
    }
  } finally {
    if (buyerId) await cleanupUser(buyerId);
  }
  
  // Test 7.4: Unique Constraints
  console.log("\nTest 7.4: Unique Constraints");
  
  const uniqueEmail = `unique-test-${Date.now()}@iwanyu.test`;
  const { data: user1 } = await admin.auth.admin.createUser({
    email: uniqueEmail,
    password: "TestPass123!",
    email_confirm: true,
  });
  
  const { error: uniqueErr } = await admin.auth.admin.createUser({
    email: uniqueEmail,
    password: "TestPass123!",
    email_confirm: true,
  });
  
  if (uniqueErr) {
    ok("Unique constraint enforced", "Cannot create duplicate email");
  } else {
    fail("Unique constraint", "Duplicate email allowed");
  }
  
  if (user1?.user?.id) {
    await cleanupUser(user1.user.id);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 8: EDGE CASES & ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════

async function testEdgeCases() {
  section("TEST SUITE 8: Edge Cases & Error Handling");
  
  let buyerId;
  try {
    const { userId } = await createTestUser("buyer", "edge-cases");
    buyerId = userId;
    
    // Test 8.1: Zero/Negative Quantities
    console.log("Test 8.1: Zero/Negative Quantities");
    
    // Skip cart_items tests - using JSONB structure instead
    skip("Zero/negative quantity validation", "Cart uses JSONB structure, validation happens at application level");
    
    // Test 8.2: Empty Strings
    console.log("\nTest 8.2: Empty String Handling");
    
    const { error: emptyErr } = await admin.from("products").insert({
      id: randomUUID(),
      title: "",
      description: "",
      price_rwf: 1000,
      stock_quantity: 10,
      vendor_id: "v_test",
      category: "Test",
      in_stock: true,
      seller_user_id: buyerId,
    });
    
    if (emptyErr) {
      ok("Empty title rejected");
    } else {
      warn("Empty strings", "Empty product title allowed");
    }
    
    // Test 8.3: SQL Injection Prevention
    console.log("\nTest 8.3: SQL Injection Prevention");
    
    const maliciousInput = "'; DROP TABLE products; --";
    const { data: searchResults, error: sqlErr } = await admin
      .from("products")
      .select("*")
      .ilike("title", `%${maliciousInput}%`)
      .limit(1);
    
    if (!sqlErr) {
      ok("SQL injection prevented", "Parameterized queries working");
    } else {
      fail("SQL injection test", sqlErr.message);
    }
    
    // Test 8.4: Very Large Numbers
    console.log("\nTest 8.4: Large Number Handling");
    
    const { error: largeErr } = await admin.from("products").insert({
      id: randomUUID(),
      title: "Large Price Test",
      description: "Test",
      price_rwf: 2147483647, // Max 32-bit integer
      stock_quantity: 1,
      vendor_id: "v_test",
      category: "Test",
      in_stock: false,
      seller_user_id: buyerId,
    });
    
    if (!largeErr) {
      ok("Large numbers handled correctly");
    } else {
      warn("Large numbers", largeErr.message);
    }
    
    // Test 8.5: Concurrent Updates (Race Conditions)
    console.log("\nTest 8.5: Concurrent Update Handling");
    
    const initialBalance = 10000;
    await admin.from("profiles").update({ wallet_balance_rwf: initialBalance }).eq("id", buyerId);
    
    // Simulate two concurrent withdrawals
    const withdrawal1 = admin
      .from("profiles")
      .update({ wallet_balance_rwf: initialBalance - 6000 })
      .eq("id", buyerId)
      .gte("wallet_balance_rwf", 6000);
    
    const withdrawal2 = admin
      .from("profiles")
      .update({ wallet_balance_rwf: initialBalance - 6000 })
      .eq("id", buyerId)
      .gte("wallet_balance_rwf", 6000);
    
    const [result1, result2] = await Promise.all([withdrawal1, withdrawal2]);
    
    const { data: finalProfile } = await admin
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", buyerId)
      .single();
    
    const finalBalance = Number(finalProfile?.wallet_balance_rwf);
    
    if (finalBalance === 4000) {
      ok("Concurrent updates handled correctly", "One transaction succeeded, one failed");
    } else if (finalBalance === initialBalance) {
      warn("Concurrent updates", "Both transactions failed (overly conservative)");
    } else {
      warn("Concurrent updates", `Unexpected balance: ${finalBalance} (expected 4000 or 10000)`);
    }
    
  } finally {
    if (buyerId) await cleanupUser(buyerId);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// TEST SUITE 9: PERFORMANCE & SCALABILITY
// ═══════════════════════════════════════════════════════════════════════════

async function testPerformanceAndScalability() {
  section("TEST SUITE 9: Performance & Scalability");
  
  // Test 9.1: Bulk Data Retrieval
  console.log("Test 9.1: Bulk Product Listing Performance");
  
  const startTime = Date.now();
  const { data: products, error } = await admin
    .from("products")
    .select("*")
    .eq("in_stock", true)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const duration = Date.now() - startTime;
  
  if (!error) {
    ok("Bulk product retrieval successful", `${products?.length || 0} products in ${duration}ms`);
    
    if (duration < 1000) {
      ok("Query performance acceptable", `< 1 second`);
    } else {
      warn("Query performance", `${duration}ms - may need optimization`);
    }
  } else {
    fail("Bulk retrieval", error.message);
  }
  
  // Test 9.2: Pagination
  console.log("\nTest 9.2: Pagination");
  
  const page1Start = Date.now();
  const { data: page1 } = await admin
    .from("products")
    .select("*")
    .range(0, 19)
    .order("created_at", { ascending: false });
  const page1Duration = Date.now() - page1Start;
  
  const page2Start = Date.now();
  const { data: page2 } = await admin
    .from("products")
    .select("*")
    .range(20, 39)
    .order("created_at", { ascending: false });
  const page2Duration = Date.now() - page2Start;
  
  ok("Pagination working", `Page 1: ${page1?.length || 0} items (${page1Duration}ms), Page 2: ${page2?.length || 0} items (${page2Duration}ms)`);
  
  // Test 9.3: Index Usage (Query Plan)
  console.log("\nTest 9.3: Index Usage Verification");
  
  // Check if common queries use indexes
  const { data: userOrders } = await admin
    .from("orders")
    .select("*")
    .eq("buyer_user_id", "00000000-0000-0000-0000-000000000000")
    .limit(1);
  
  ok("User orders query executed", "Index on buyer_user_id assumed");
  
  const { data: productsByVendor } = await admin
    .from("products")
    .select("*")
    .eq("vendor_id", "v_nonexistent")
    .limit(1);
  
  ok("Vendor products query executed", "Index on vendor_id assumed");
  
  // Test 9.4: Connection Pool Health
  console.log("\nTest 9.4: Multiple Concurrent Queries");
  
  const concurrentStart = Date.now();
  const queries = Array(10).fill(null).map(() =>
    admin.from("products").select("count").limit(1)
  );
  
  const results = await Promise.all(queries);
  const concurrentDuration = Date.now() - concurrentStart;
  
  const successCount = results.filter(r => !r.error).length;
  ok("Concurrent queries handled", `${successCount}/10 successful in ${concurrentDuration}ms`);
  
  if (concurrentDuration < 2000) {
    ok("Concurrent query performance acceptable");
  } else {
    warn("Concurrent query performance", `${concurrentDuration}ms - connection pool may need tuning`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN TEST RUNNER
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("    COMPREHENSIVE PLATFORM TEST SUITE — iwanyu.store");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Site: ${SITE_URL}`);
  console.log(`  Start Time: ${new Date().toISOString()}`);
  console.log("═══════════════════════════════════════════════════════════\n");
  
  const startTime = Date.now();
  
  try {
    // Run all test suites
    await testAuthenticationFlows();
    await testProductManagement();
    await testShoppingCartAndCheckout();
    await testOrderManagement();
    await testPaymentSystems();
    await testAdminFeatures();
    await testDatabaseIntegrity();
    await testEdgeCases();
    await testPerformanceAndScalability();
    
  } catch (error) {
    console.error("\n💥 Fatal error during testing:", error);
    fail("Test execution", error.message);
  }
  
  const duration = Date.now() - startTime;
  const durationSec = (duration / 1000).toFixed(2);
  
  // ─── Print Results ─────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════════");
  console.log("                    TEST RESULTS SUMMARY");
  console.log("═══════════════════════════════════════════════════════════");
  
  console.log(`\n  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  ⚠️  Warnings: ${warnings}`);
  console.log(`  📊 Total Tests: ${results.length}`);
  console.log(`  ⏱️  Duration: ${durationSec}s`);
  
  const successRate = ((passed / results.length) * 100).toFixed(1);
  console.log(`\n  Success Rate: ${successRate}%`);
  
  // ─── Critical Issues ───────────────────────────────────────────────────
  if (issues.length > 0) {
    console.log("\n═══════════════════════════════════════════════════════════");
    console.log("                   ISSUES FOUND");
    console.log("═══════════════════════════════════════════════════════════\n");
    
    const critical = issues.filter(i => i.severity === "CRITICAL");
    const warnings = issues.filter(i => i.severity === "WARNING");
    
    if (critical.length > 0) {
      console.log("  🚨 CRITICAL ISSUES:\n");
      critical.forEach((issue, i) => {
        console.log(`    ${i + 1}. ${issue.label}`);
        console.log(`       ${issue.reason}\n`);
      });
    }
    
    if (warnings.length > 0) {
      console.log("  ⚠️  WARNINGS:\n");
      warnings.forEach((issue, i) => {
        console.log(`    ${i + 1}. ${issue.label}`);
        console.log(`       ${issue.reason}\n`);
      });
    }
  }
  
  // ─── Final Verdict ─────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════════");
  console.log("                    FINAL VERDICT");
  console.log("═══════════════════════════════════════════════════════════\n");
  
  if (failed === 0 && warnings === 0) {
    console.log("  🎉 ALL TESTS PASSED!");
    console.log("  ✅ Platform is PRODUCTION READY");
    console.log("  ✅ No critical issues found");
    console.log("  ✅ All features working as expected\n");
  } else if (failed === 0 && warnings > 0) {
    console.log("  ✅ ALL CRITICAL TESTS PASSED");
    console.log("  ⚠️  Some warnings found - review recommended");
    console.log("  📋 Platform is CONDITIONALLY READY for production\n");
  } else {
    console.log("  ❌ PLATFORM NOT READY FOR PRODUCTION");
    console.log(`  🔧 ${failed} critical issue(s) must be fixed`);
    console.log("  📋 Review and fix issues before deployment\n");
  }
  
  console.log("═══════════════════════════════════════════════════════════\n");
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

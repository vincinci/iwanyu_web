#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk";
const admin = createClient(SUPABASE_URL, SUPABASE_SRK);

async function checkSchema() {
  console.log("Checking database schema...\n");
  
  // Products table
  const { data: products, error: prodErr } = await admin.from("products").select("*").limit(1);
  console.log("PRODUCTS table columns:");
  if (products && products[0]) {
    console.log(Object.keys(products[0]).join(", "));
  } else if (prodErr) {
    console.log("Error:", prodErr.message);
  }
  
  // Cart items
  const { data: cart, error: cartErr } = await admin.from("cart_items").select("*").limit(1);
  console.log("\nCART_ITEMS table columns:");
  if (cart && cart[0]) {
    console.log(Object.keys(cart[0]).join(", "));
  } else if (cartErr) {
    console.log("Error:", cartErr.message);
  } else {
    console.log("(No data, checking info_schema...)");
  }
  
  // Orders
  const { data: orders, error: ordErr } = await admin.from("orders").select("*").limit(1);
  console.log("\nORDERS table columns:");
  if (orders && orders[0]) {
    console.log(Object.keys(orders[0]).join(", "));
    console.log("\nSample order status:", orders[0].status);
  } else if (ordErr) {
    console.log("Error:", ordErr.message);
  }
  
  // Vendor applications
  const { data: vendorApps } = await admin.from("vendor_applications").select("*").limit(1);
  console.log("\nVENDOR_APPLICATIONS table columns:");
  if (vendorApps && vendorApps[0]) {
    console.log(Object.keys(vendorApps[0]).join(", "));
  } else {
    console.log("(No data available)");
  }
  
  // Check RPC functions
  console.log("\nChecking RPC function 'compute_order_totals'...");
  const { data: rpcTest, error: rpcErr } = await admin.rpc("compute_order_totals", {
    p_items: JSON.stringify([]),
    p_discount_code: null,
    p_city: "Kigali",
  });
  
  if (rpcErr) {
    console.log("Error:", rpcErr.message);
  } else {
    console.log("Function exists! Returns:", JSON.stringify(rpcTest, null, 2));
  }
}

checkSchema().then(() => process.exit(0));

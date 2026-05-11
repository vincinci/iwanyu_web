#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk";
const admin = createClient(SUPABASE_URL, SUPABASE_SRK);

async function main() {
  // Check cart_items structure by querying information_schema
  const { data } = await admin.rpc('exec_sql', {
    query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'cart_items'
      ORDER BY ordinal_position;
    `
  });
  
  if (data) {
    console.log("CART_ITEMS table structure:");
    console.log(JSON.stringify(data, null, 2));
  } else {
    // Try creating a cart item to see the structure
    const testUserId = "00000000-0000-0000-0000-000000000001";
    const { data: inserted, error } = await admin.from("cart_items").insert({
      user_id: testUserId,
      product_id: "test_prod",
      quantity: 1
    }).select();
    
    if (inserted && inserted[0]) {
      console.log("CART_ITEMS columns from insert:");
      console.log(Object.keys(inserted[0]).join(", "));
    } else if (error) {
      console.log("Error:", error.message);
      console.log("Details:", error.details || error.hint);
    }
  }
  
  // Also check order status check constraint
  console.log("\nChecking valid order statuses...");
  const { data: constraintData } = await admin.rpc('exec_sql', {
    query: `
      SELECT con.conname, pg_get_constraintdef(con.oid)
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'orders' AND con.contype = 'c';
    `
  });
  
  if (constraintData) {
    console.log("Order constraints:");
    console.log(JSON.stringify(constraintData, null, 2));
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

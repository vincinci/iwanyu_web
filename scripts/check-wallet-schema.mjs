#!/usr/bin/env node
/**
 * Quick script to check wallet_transactions schema
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_SRK = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk";

const admin = createClient(SUPABASE_URL, SUPABASE_SRK);

// Query a single row to see what columns exist
const { data, error } = await admin
  .from("wallet_transactions")
  .select("*")
  .limit(1);

if (error) {
  console.error("Error:", error.message);
} else if (data && data.length > 0) {
  console.log("Wallet Transactions Columns:");
  console.log(Object.keys(data[0]).sort().join(", "));
  console.log("\nSample row:");
  console.log(JSON.stringify(data[0], null, 2));
} else {
  console.log("Table is empty. Attempting to describe schema via information_schema...");
  
  const { data: columns } = await admin.rpc("exec_sql", {
    query: `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallet_transactions'
      ORDER BY ordinal_position
    `
  });
  
  if (columns) {
    console.log(columns);
  }
}

#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== TESTING FIXED SCHEMA ===');

// Test the exact query from marketplace context
console.log('\n1. Testing vendors query (the one that was failing)...');
try {
  const { data: vendorRows, error: vendorsErr } = await supabase
    .from("vendors")
    .select("id, name, location, verified, owner_user_id, status")
    .order("created_at", { ascending: false });
    
  if (vendorsErr) {
    console.log('❌ Vendors error:', vendorsErr.message);
  } else {
    console.log(`✅ Vendors success: ${vendorRows?.length} vendors loaded`);
    if (vendorRows && vendorRows.length > 0) {
      console.log('Sample vendor:', vendorRows[0]);
    }
  }
} catch (err) {
  console.log('❌ Vendors exception:', err.message);
}

// Test products query
console.log('\n2. Testing products query...');
try {
  const { data: productRows, error: productsErr } = await supabase
    .from("products")
    .select(
      "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
    )
    .order("created_at", { ascending: false });
    
  if (productsErr) {
    console.log('❌ Products error:', productsErr.message);
  } else {
    console.log(`✅ Products success: ${productRows?.length} products loaded`);
  }
} catch (err) {
  console.log('❌ Products exception:', err.message);
}

console.log('\n=== TEST COMPLETE ===');
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://iakxtffxaevszuouapih.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🧪 Testing marketplace data fetch (fixed schema)...\n');

try {
  // Test the fixed vendors query
  console.log('1. Testing vendors with corrected schema...');
  const { data: vendorRows, error: vendorsErr } = await supabase
    .from("vendors")
    .select("id, name, location, verified, owner_user_id, status")
    .order("created_at", { ascending: false });

  if (vendorsErr) {
    console.log('❌ Vendors error:', vendorsErr.message);
  } else {
    console.log(`✅ Vendors loaded: ${vendorRows?.length || 0}`);
    if (vendorRows && vendorRows.length > 0) {
      console.log('   Sample vendor:', {
        id: vendorRows[0].id,
        name: vendorRows[0].name,
        status: vendorRows[0].status
      });
    }
  }

  // Test products query
  console.log('\n2. Testing products...');
  const { data: productRows, error: productsErr } = await supabase
    .from("products")
    .select(
      "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
    )
    .order("created_at", { ascending: false });

  if (productsErr) {
    console.log('❌ Products error:', productsErr.message);
  } else {
    console.log(`✅ Products loaded: ${productRows?.length || 0}`);
    if (productRows && productRows.length > 0) {
      console.log('   Sample product:', {
        title: productRows[0].title,
        category: productRows[0].category,
        price: productRows[0].price_rwf
      });
    }
  }

  console.log('\n🎯 Schema fix verification:');
  console.log(vendorsErr ? '❌ Still failing' : '✅ Vendors query fixed');
  console.log(productsErr ? '❌ Products failing' : '✅ Products working');
  
  if (!vendorsErr && !productsErr) {
    console.log('\n🚀 Marketplace should now load products successfully!');
  }

} catch (error) {
  console.log('❌ Exception:', error.message);
}
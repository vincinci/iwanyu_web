#!/usr/bin/env node

// Simulate exactly what the React app sees in production
import { createClient } from '@supabase/supabase-js';

console.log('🌐 Simulating production React app environment...\n');

// This simulates what import.meta.env would have in production Vite build
const mockImportMetaEnv = {
  VITE_SUPABASE_URL: 'https://iakxtffxaevszuouapih.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54'
};

console.log('🔍 Environment check:');
console.log('VITE_SUPABASE_URL exists:', !!mockImportMetaEnv.VITE_SUPABASE_URL);
console.log('URL value:', mockImportMetaEnv.VITE_SUPABASE_URL);
console.log('URL length:', mockImportMetaEnv.VITE_SUPABASE_URL?.length);
console.log('Has anon key:', !!mockImportMetaEnv.VITE_SUPABASE_ANON_KEY);

// Simulate the supabaseClient.ts logic
let url = mockImportMetaEnv.VITE_SUPABASE_URL;
const anonKey = mockImportMetaEnv.VITE_SUPABASE_ANON_KEY;

console.log('\n📡 SupabaseClient simulation:');
console.log('Raw URL:', url);
console.log('URL length:', url?.length);

if (!url || !anonKey) {
  console.log('❌ Missing required environment variables!');
  process.exit(1);
}

// The exact logic from supabaseClient.ts
url = url.trim().replace(/\\n/g, '').replace(/\n/g, '');
console.log('Cleaned URL:', url);
console.log('Final URL length:', url.length);

const supabase = createClient(url, anonKey);
console.log('✅ Supabase client created');

// Now test the exact MarketplaceContext queries
console.log('\n🔄 Testing MarketplaceContext queries...');

try {
  const [{ data: vendorRows, error: vendorsErr }, { data: productRows, error: productsErr }] = await Promise.all([
    supabase
      .from("vendors")
      .select("id, name, location, verified, owner_user_id, status")
      .order("created_at", { ascending: false }),
    supabase
      .from("products")
      .select(
        "id, vendor_id, title, description, category, price_rwf, image_url, in_stock, free_shipping, rating, review_count, discount_percentage"
      )
      .order("created_at", { ascending: false }),
  ]);

  console.log('Vendors response:', { count: vendorRows?.length, error: vendorsErr?.message });
  console.log('Products response:', { count: productRows?.length, error: productsErr?.message });

  if (vendorsErr) {
    console.log('❌ VENDORS ERROR:', vendorsErr);
  }
  if (productsErr) {
    console.log('❌ PRODUCTS ERROR:', productsErr);
  }

  if (!vendorsErr && !productsErr) {
    console.log('\n✅ SIMULATION SUCCESSFUL');
    console.log('Both vendors and products queries work in production simulation');
    console.log('The React app should be able to load data properly');
    
    // Test the mapping logic too
    const nextVendors = ((vendorRows ?? [])).map((v) => ({
      id: v.id,
      name: v.name,
      location: v.location ?? undefined,
      verified: v.verified,
      ownerUserId: v.owner_user_id ?? undefined,
      status: v.status,
    }));

    console.log('Mapped vendors count:', nextVendors.length);
    console.log('Sample mapped vendor:', nextVendors[0]);
  } else {
    console.log('\n❌ SIMULATION FAILED');
    console.log('Found the same issue that production has');
  }

} catch (err) {
  console.log('❌ Exception in simulation:', err.message);
}
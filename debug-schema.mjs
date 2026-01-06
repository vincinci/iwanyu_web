#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== DEBUGGING SCHEMA ===');

// Test basic connectivity
console.log('\n1. Testing basic connectivity...');
try {
  const { data, error } = await supabase.from('products').select('count', { count: 'exact', head: true });
  console.log('Products table:', error ? `❌ Error: ${error.message}` : `✅ ${data} products`);
} catch (err) {
  console.log('Products table: ❌ Exception:', err.message);
}

// Test vendors table
console.log('\n2. Testing vendors table...');
try {
  const { data, error } = await supabase.from('vendors').select('count', { count: 'exact', head: true });
  console.log('Vendors table (count):', error ? `❌ Error: ${error.message}` : `✅ ${data} vendors`);
} catch (err) {
  console.log('Vendors table (count): ❌ Exception:', err.message);
}

// Test vendors with basic select
console.log('\n3. Testing vendors basic select...');
try {
  const { data, error } = await supabase.from('vendors').select('id').limit(1);
  console.log('Vendors basic select:', error ? `❌ Error: ${error.message}` : `✅ Success (${data?.length} rows)`);
} catch (err) {
  console.log('Vendors basic select: ❌ Exception:', err.message);
}

// Test vendors with full select (problematic query)
console.log('\n4. Testing vendors full select...');
try {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, location, verified, owner_user_id, revoked')
    .limit(5);
  console.log('Vendors full select:', error ? `❌ Error: ${error.message}` : `✅ Success (${data?.length} rows)`);
  if (data && data.length > 0) {
    console.log('Sample vendor:', data[0]);
  }
} catch (err) {
  console.log('Vendors full select: ❌ Exception:', err.message);
}

// Test vendors with order by
console.log('\n5. Testing vendors with order by...');
try {
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, location, verified, owner_user_id, revoked')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Vendors with order:', error ? `❌ Error: ${error.message}` : `✅ Success (${data?.length} rows)`);
} catch (err) {
  console.log('Vendors with order: ❌ Exception:', err.message);
}

// Check table schema via information_schema
console.log('\n6. Checking vendors table schema...');
try {
  const { data, error } = await supabase.rpc('get_table_columns', { table_name: 'vendors' });
  if (error) {
    console.log('Schema check via RPC: ❌', error.message);
  } else {
    console.log('Schema check via RPC: ✅', data);
  }
} catch (err) {
  console.log('Schema check: Failed (RPC function might not exist)');
}

// Alternative schema check
console.log('\n7. Alternative: Check if vendors table exists...');
try {
  // Try to get table info from pg_tables (might not work with RLS)
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_name', 'vendors')
    .limit(1);
  console.log('Table exists check:', error ? `❌ Error: ${error.message}` : `✅ Found: ${data?.length > 0}`);
} catch (err) {
  console.log('Table exists check: ❌ Exception:', err.message);
}

console.log('\n=== DEBUG COMPLETE ===');
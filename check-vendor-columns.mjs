#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('=== CHECKING ACTUAL VENDOR COLUMNS ===');

try {
  // Get a vendor to see what columns exist
  const { data, error } = await supabase
    .from('vendors')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log('Vendor columns that exist:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof data[0][key]} = ${data[0][key]}`);
    });
  } else {
    console.log('No vendors found');
  }
} catch (err) {
  console.log('Exception:', err.message);
}

// Also check products to make sure they work
console.log('\n=== CHECKING PRODUCTS ===');
try {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .limit(1);
    
  if (error) {
    console.log('Products error:', error.message);
  } else {
    console.log(`Products work: ${data?.length} found`);
  }
} catch (err) {
  console.log('Products exception:', err.message);
}
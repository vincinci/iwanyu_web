#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://iakxtffxaevszuouapih.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlha3h0ZmZ4YWV2c3p1b3VhcGloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTgxNTIsImV4cCI6MjA4MzE5NDE1Mn0.phPO0WG3tW4n6aC23hiHR0Gi4tGQau1wuu84Vtrvh54';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log('Checking existing table schemas...\n');

// Check carts table
const { data: carts, error: cartsErr } = await supabase
  .from('carts')
  .select('*')
  .limit(1);

if (cartsErr) {
  console.log('❌ Carts table:', cartsErr.message);
} else {
  console.log('✅ Carts table exists');
  if (carts && carts.length > 0) {
    console.log('   Columns:', Object.keys(carts[0]).join(', '));
  }
}

// Check product_media table
const { data: media, error: mediaErr } = await supabase
  .from('product_media')
  .select('*')
  .limit(1);

if (mediaErr) {
  console.log('❌ Product_media table:', mediaErr.message);
} else {
  console.log('✅ Product_media table exists');
  if (media && media.length > 0) {
    console.log('   Columns:', Object.keys(media[0]).join(', '));
  }
}

// Check categories table
const { data: categories, error: catErr } = await supabase
  .from('categories')
  .select('*')
  .limit(1);

if (catErr) {
  console.log('❌ Categories table:', catErr.message);
} else {
  console.log('✅ Categories table exists');
  if (categories && categories.length > 0) {
    console.log('   Columns:', Object.keys(categories[0]).join(', '));
  }
}

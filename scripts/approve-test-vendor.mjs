#!/usr/bin/env node

/**
 * Approve Test Vendor
 * Approves the existing vendor so product creation can be tested
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const projectRoot = join(__dirname, '..');
dotenv.config({ path: join(projectRoot, '.env.local') });
dotenv.config({ path: join(projectRoot, '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Approving Test Vendor\n');
console.log('='.repeat(60));

async function listVendors() {
  console.log('\n📋 Current vendors:');
  
  const { data, error } = await supabase
    .from('vendors')
    .select('*');
  
  if (error) {
    console.error('  ❌ Error fetching vendors:', error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('  ℹ️  No vendors found');
    return [];
  }
  
  data.forEach((vendor, i) => {
    console.log(`\n  Vendor ${i + 1}:`);
    console.log(`    ID: ${vendor.id}`);
    console.log(`    Name: ${vendor.name || 'N/A'}`);
    console.log(`    Status: ${vendor.status || 'N/A'}`);
    console.log(`    Verified: ${vendor.verified || false}`);
  });
  
  return data;
}

async function run() {
  const vendors = await listVendors();
  
  if (vendors.length === 0) {
    console.log('\n⚠️  No vendors to approve. Please:');
    console.log('  1. Sign up as a vendor on the website');
    console.log('  2. Or use the admin dashboard to create one');
    console.log('\n❌ Cannot proceed with product testing');
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('\nℹ️  Note: Approving vendors requires admin access');
  console.log('Please use one of these methods to approve:');
  console.log('\n1. Admin Dashboard:');
  console.log('   - Navigate to /admin on your website');
  console.log('   - Find the vendor in the list');
  console.log('   - Click "Approve" button');
  console.log('\n2. Direct SQL (if you have database access):');
  console.log(`   UPDATE vendors SET status = 'approved' WHERE id = '${vendors[0].id}';`);
  console.log('\nOnce approved, you can test product creation through the UI');
  console.log('by logging in as that vendor.\n');
}

run();

#!/usr/bin/env node

/**
 * Update wallet balance for a user
 * Usage: node scripts/update-wallet-balance.mjs <email_or_username> <amount_rwf>
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - SUPABASE_URL or VITE_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function updateWalletBalance(identifier, amountRwf) {
  try {
    // Find user by email or username
    const { data: profiles, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, name, wallet_balance_rwf')
      .or(`email.eq.${identifier},name.eq.${identifier}`)
      .limit(1);

    if (searchError) {
      throw new Error(`Failed to search for user: ${searchError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      throw new Error(`User not found: ${identifier}`);
    }

    const profile = profiles[0];
    console.log(`\n📋 Found user:`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Name: ${profile.name}`);
    console.log(`   Email: ${profile.email}`);
    console.log(`   Current balance: ${profile.wallet_balance_rwf || 0} RWF`);

    // Update wallet balance
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ 
        wallet_balance_rwf: amountRwf,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update balance: ${updateError.message}`);
    }

    console.log(`\n✅ Successfully updated wallet balance!`);
    console.log(`   New balance: ${updated.wallet_balance_rwf} RWF`);
    console.log(`   Change: ${amountRwf - (profile.wallet_balance_rwf || 0)} RWF`);

    return updated;
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length !== 2) {
  console.log('Usage: node scripts/update-wallet-balance.mjs <email_or_username> <amount_rwf>');
  console.log('');
  console.log('Examples:');
  console.log('  node scripts/update-wallet-balance.mjs davy 5814');
  console.log('  node scripts/update-wallet-balance.mjs user@example.com 10000');
  process.exit(1);
}

const [identifier, amountStr] = args;
const amountRwf = parseInt(amountStr, 10);

if (isNaN(amountRwf) || amountRwf < 0) {
  console.error('❌ Invalid amount. Must be a positive number.');
  process.exit(1);
}

console.log(`\n🔍 Updating wallet balance for: ${identifier}`);
console.log(`   New balance: ${amountRwf} RWF\n`);

updateWalletBalance(identifier, amountRwf);

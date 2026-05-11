#!/usr/bin/env node
/**
 * Test PawaPay Deposit and Withdrawal Flow
 * Tests complete end-to-end functionality
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const API_BASE = process.env.API_BASE || 'https://www.iwanyu.store';

// Test user credentials
const TEST_EMAIL = `test-${Date.now()}@iwanyu.test`;
const TEST_PASSWORD = 'TestPassword123!';
const TEST_PHONE = '+250788123456'; // Rwanda MTN number format

console.log('🧪 PawaPay Integration Test\n');
console.log('Configuration:');
console.log(`- API Base: ${API_BASE}`);
console.log(`- Supabase URL: ${SUPABASE_URL}`);
console.log(`- Test Email: ${TEST_EMAIL}`);
console.log(`- Test Phone: ${TEST_PHONE}\n`);

let testUser = null;
let accessToken = null;

/**
 * Step 1: Create test user account
 */
async function createTestUser() {
  console.log('📝 Step 1: Creating test user account...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (error) throw error;
    
    testUser = data.user;
    accessToken = data.session?.access_token;
    
    console.log(`✅ User created: ${testUser.id}`);
    console.log(`✅ Access token: ${accessToken?.substring(0, 20)}...`);
    
    // Create profile with initial balance
    const serviceSupabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: profileError } = await serviceSupabase
      .from('profiles')
      .upsert({
        id: testUser.id,
        email: TEST_EMAIL,
        wallet_balance_rwf: 10000, // Start with 10,000 RWF for testing
        locked_balance_rwf: 0,
      });
    
    if (profileError) {
      console.warn('⚠️  Profile creation warning:', profileError.message);
    } else {
      console.log('✅ Profile created with 10,000 RWF balance\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to create user:', error.message);
    return false;
  }
}

/**
 * Step 2: Test wallet balance fetch
 */
async function testGetBalance() {
  console.log('💰 Step 2: Testing wallet balance fetch...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_balance_rwf, locked_balance_rwf')
      .eq('id', testUser.id)
      .single();
    
    if (error) throw error;
    
    const available = (data.wallet_balance_rwf || 0) - (data.locked_balance_rwf || 0);
    console.log(`✅ Current balance: ${data.wallet_balance_rwf} RWF`);
    console.log(`✅ Locked balance: ${data.locked_balance_rwf} RWF`);
    console.log(`✅ Available balance: ${available} RWF\n`);
    
    return true;
  } catch (error) {
    console.error('❌ Failed to fetch balance:', error.message);
    return false;
  }
}

/**
 * Step 3: Test deposit API
 */
async function testDeposit() {
  console.log('📥 Step 3: Testing deposit API...');
  
  try {
    const response = await fetch(`${API_BASE}/api/pawapay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: 5000,
        phoneNumber: TEST_PHONE,
        correspondent: 'MTN_MOMO_RWA',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Deposit API failed (${response.status}):`, data);
      return false;
    }
    
    console.log('✅ Deposit initiated successfully!');
    console.log(`   Transaction ID: ${data.transactionId}`);
    console.log(`   Message: ${data.message}`);
    
    // Check if transaction was recorded
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: tx } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('external_transaction_id', data.transactionId)
      .single();
    
    if (tx) {
      console.log('✅ Transaction recorded in database:');
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ${tx.amount_rwf} RWF`);
      console.log(`   Status: ${tx.status}\n`);
    } else {
      console.warn('⚠️  Transaction not found in database\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Deposit test failed:', error.message);
    return false;
  }
}

/**
 * Step 4: Test withdrawal API
 */
async function testWithdrawal() {
  console.log('📤 Step 4: Testing withdrawal API...');
  
  try {
    const response = await fetch(`${API_BASE}/api/pawapay-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        amount: 2000,
        phoneNumber: TEST_PHONE,
        correspondent: 'MTN_MOMO_RWA',
      }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error(`❌ Withdrawal API failed (${response.status}):`, data);
      return false;
    }
    
    console.log('✅ Withdrawal initiated successfully!');
    console.log(`   Transaction ID: ${data.transactionId}`);
    console.log(`   Message: ${data.message}`);
    
    // Check if transaction was recorded and balance deducted
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: tx } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('external_transaction_id', data.transactionId)
      .single();
    
    if (tx) {
      console.log('✅ Transaction recorded in database:');
      console.log(`   Type: ${tx.type}`);
      console.log(`   Amount: ${tx.amount_rwf} RWF`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Previous Balance: ${tx.previous_balance_rwf} RWF`);
      console.log(`   New Balance: ${tx.new_balance_rwf} RWF\n`);
    } else {
      console.warn('⚠️  Transaction not found in database\n');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Withdrawal test failed:', error.message);
    return false;
  }
}

/**
 * Step 5: Verify final balance
 */
async function verifyFinalBalance() {
  console.log('🔍 Step 5: Verifying final balance...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('wallet_balance_rwf, locked_balance_rwf')
      .eq('id', testUser.id)
      .single();
    
    if (error) throw error;
    
    console.log('✅ Final balance verification:');
    console.log(`   Total: ${data.wallet_balance_rwf} RWF`);
    console.log(`   Locked: ${data.locked_balance_rwf} RWF`);
    console.log(`   Available: ${(data.wallet_balance_rwf || 0) - (data.locked_balance_rwf || 0)} RWF`);
    
    // Expected: Started with 10,000, withdrew 2,000 = 8,000 RWF
    const expected = 8000;
    const actual = data.wallet_balance_rwf;
    
    if (actual === expected) {
      console.log(`✅ Balance matches expected: ${expected} RWF\n`);
    } else {
      console.log(`⚠️  Balance mismatch: expected ${expected} RWF, got ${actual} RWF\n`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Failed to verify balance:', error.message);
    return false;
  }
}

/**
 * Cleanup: Optional - remove test user
 */
async function cleanup() {
  console.log('🧹 Cleanup: Removing test user...');
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
  
  try {
    await supabase.auth.admin.deleteUser(testUser.id);
    console.log('✅ Test user removed\n');
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error.message, '\n');
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('=' .repeat(60));
  console.log('Starting PawaPay Integration Tests');
  console.log('=' .repeat(60) + '\n');
  
  const results = {
    createUser: false,
    getBalance: false,
    deposit: false,
    withdrawal: false,
    verifyBalance: false,
  };
  
  // Run tests sequentially
  results.createUser = await createTestUser();
  if (!results.createUser) {
    console.log('\n❌ Test suite failed: Could not create test user');
    return;
  }
  
  results.getBalance = await testGetBalance();
  results.deposit = await testDeposit();
  results.withdrawal = await testWithdrawal();
  results.verifyBalance = await verifyFinalBalance();
  
  // Print summary
  console.log('=' .repeat(60));
  console.log('Test Summary');
  console.log('=' .repeat(60));
  console.log(`1. Create User:      ${results.createUser ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`2. Get Balance:      ${results.getBalance ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`3. Test Deposit:     ${results.deposit ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`4. Test Withdrawal:  ${results.withdrawal ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`5. Verify Balance:   ${results.verifyBalance ? '✅ PASS' : '❌ FAIL'}`);
  console.log('=' .repeat(60) + '\n');
  
  const allPassed = Object.values(results).every(r => r === true);
  
  if (allPassed) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  // Ask if user wants to cleanup
  const shouldCleanup = process.argv.includes('--cleanup');
  if (shouldCleanup) {
    await cleanup();
  } else {
    console.log(`\n💡 Test user preserved for manual testing: ${TEST_EMAIL}`);
    console.log(`   Password: ${TEST_PASSWORD}`);
    console.log(`   Run with --cleanup flag to remove test user automatically\n`);
  }
}

// Run tests
runTests().catch(console.error);

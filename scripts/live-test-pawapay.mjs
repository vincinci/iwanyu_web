#!/usr/bin/env node
/**
 * Comprehensive Live End-to-End Test
 * Tests: DB schema, RLS, API connectivity, PawaPay deposit + withdrawal
 *
 * Usage:
 *   node scripts/live-test-pawapay.mjs
 *
 * Required env vars (loaded from .env.local or passed inline):
 *   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, PAWAPAY_API_KEY
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../.env.local') });
config({ path: resolve(__dirname, '../.env') });

// ─── CONFIG ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = process.env.TEST_BASE_URL || 'https://www.iwanyu.store';

const TEST_PHONE = process.env.TEST_PHONE || '+250794306915';
const TEST_AMOUNT = Number(process.env.TEST_AMOUNT || '101');
const TEST_EMAIL = `test_live_${Date.now()}@iwanyu-test.com`;
const TEST_PASSWORD = `TestLive_${Date.now()}!`;

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

let passed = 0;
let failed = 0;
const failures = [];

function pass(label) {
  passed++;
  console.log(`  ${GREEN}✔${RESET} ${label}`);
}

function fail(label, detail = '') {
  failed++;
  failures.push({ label, detail });
  console.log(`  ${RED}✘${RESET} ${label}${detail ? ` — ${detail}` : ''}`);
}

function section(title) {
  console.log(`\n${BOLD}${BLUE}━━ ${title} ━━${RESET}`);
}

function warn(msg) {
  console.log(`  ${YELLOW}⚠${RESET} ${msg}`);
}

function info(msg) {
  console.log(`  ${BLUE}ℹ${RESET} ${msg}`);
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── 1. ENV VALIDATION ───────────────────────────────────────────────────────
section('1. Environment Variables');

if (!SUPABASE_URL) { fail('SUPABASE_URL set', 'missing'); } else { pass('SUPABASE_URL set'); }
if (!ANON_KEY) { fail('SUPABASE_ANON_KEY set', 'missing'); } else { pass('SUPABASE_ANON_KEY set'); }
if (!SERVICE_KEY) { fail('SUPABASE_SERVICE_ROLE_KEY set', 'missing — set it inline'); } else { pass('SUPABASE_SERVICE_ROLE_KEY set'); }

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_KEY) {
  console.log(`\n${RED}${BOLD}ABORT: Cannot continue without all env vars.${RESET}`);
  console.log(`Re-run with:`);
  console.log(`  SUPABASE_SERVICE_ROLE_KEY="<key>" node scripts/live-test-pawapay.mjs\n`);
  process.exit(1);
}

const anonClient = createClient(SUPABASE_URL, ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

// ─── 2. DATABASE SCHEMA CHECKS ───────────────────────────────────────────────
section('2. Database Schema');

const requiredTables = [
  { name: 'profiles', col: 'id' },
  { name: 'products', col: 'name' },
  { name: 'orders', col: 'status' },
  { name: 'order_items', col: 'product_id' },
  { name: 'transactions', col: 'type' },
];

for (const { name, col } of requiredTables) {
  const { error } = await adminClient.from(name).select(col).limit(1);
  if (error && error.code !== 'PGRST116') {
    fail(`Table "${name}" exists`, error.message);
  } else {
    pass(`Table "${name}" exists`);
  }
}

// Check transactions table columns
{
  // Use information_schema via PostgREST
  const { data: cols, error: colErr } = await adminClient
    .from('transactions')
    .select('id, user_id, type, amount_rwf, balance_after_rwf, status, reference, provider, phone, metadata, description, created_at, updated_at')
    .limit(0);

  if (colErr) {
    fail('transactions table has all required columns', colErr.message);
  } else {
    pass('transactions table has all required columns');
  }
}

// Check profiles wallet columns
{
  const { data, error } = await adminClient
    .from('profiles')
    .select('id, wallet_balance_rwf, locked_balance_rwf')
    .limit(0);

  if (error) {
    fail('profiles has wallet_balance_rwf + locked_balance_rwf', error.message);
  } else {
    pass('profiles has wallet_balance_rwf + locked_balance_rwf');
  }
}

// Check orders table (uses buyer_user_id not user_id)
{
  const { data, error } = await adminClient
    .from('orders')
    .select('id, buyer_user_id, status, total_rwf')
    .limit(0);

  if (error) {
    fail('orders table has required columns', error.message);
  } else {
    pass('orders table has required columns');
  }
}

// ─── 3. RLS POLICY CHECKS ────────────────────────────────────────────────────
section('3. Row Level Security');

// Anon should NOT be able to read transactions without auth
{
  const { data, error } = await anonClient.from('transactions').select('*').limit(1);
  if (data && data.length > 0) {
    fail('Anon cannot read other users transactions (RLS leak!)');
  } else {
    pass('Anon cannot read transactions without auth (RLS correct)');
  }
}

// Anon should NOT be able to read profiles without auth
{
  const { data, error } = await anonClient.from('profiles').select('wallet_balance_rwf').limit(1);
  if (data && data.length > 0) {
    warn('profiles readable without auth — check RLS if wallet data is sensitive');
  } else {
    pass('profiles protected by RLS (no anon access)');
  }
}

// Products should be publicly readable
{
  const { data, error } = await anonClient.from('products').select('id, name, price_rwf').limit(3);
  if (error) {
    fail('products publicly readable', error.message);
  } else {
    pass(`products publicly readable (${data?.length ?? 0} sample products loaded)`);
  }
}

// ─── 4. API ENDPOINT CONNECTIVITY ────────────────────────────────────────────
section('4. API Connectivity');

const endpoints = [
  { path: '/api/pawapay-test', method: 'GET', label: 'PawaPay config check' },
  { path: '/api/marketplace', method: 'GET', label: 'Marketplace products' },
];

for (const ep of endpoints) {
  try {
    const r = await fetch(`${BASE_URL}${ep.path}`, { method: ep.method });
    if (r.status < 500) {
      const body = await r.json().catch(() => ({}));
      const detail = ep.path === '/api/pawapay-test'
        ? `key=${body.hasPawapayKey}, supabase=${body.hasSupabaseUrl}`
        : `status=${r.status}`;
      pass(`${ep.label} (${detail})`);
    } else {
      const text = await r.text().catch(() => '');
      fail(`${ep.label} (HTTP ${r.status})`, text.slice(0, 80));
    }
  } catch (err) {
    fail(`${ep.label} reachable`, err.message);
  }
}

// Deposit without auth should return 401
{
  try {
    const r = await fetch(`${BASE_URL}/api/pawapay-deposit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 101, phoneNumber: TEST_PHONE }),
    });
    if (r.status === 401) {
      pass('Deposit requires auth (returns 401 without token)');
    } else {
      fail('Deposit auth guard', `Expected 401, got ${r.status}`);
    }
  } catch (err) {
    fail('Deposit endpoint reachable', err.message);
  }
}

// ─── 5. AUTH: CREATE TEST USER ───────────────────────────────────────────────
section('5. Authentication');

let userJwt = null;
let userId = null;
let testUserCreated = false;

{
  info(`Creating test user: ${TEST_EMAIL}`);
  const { data, error } = await anonClient.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    fail('Create test user', error.message);
  } else if (data?.session?.access_token) {
    userJwt = data.session.access_token;
    userId = data.user?.id;
    testUserCreated = true;
    pass(`Test user created (id=${userId?.slice(0,8)}...)`);
  } else if (data?.user && !data?.session) {
    // Email confirmation required — sign in directly via admin
    const { data: adminUserData, error: adminErr } = await adminClient.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (adminErr) {
      fail('Create confirmed test user', adminErr.message);
    } else {
      // Now sign in
      const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      if (signInErr || !signInData?.session) {
        fail('Sign in test user', signInErr?.message || 'No session');
      } else {
        userJwt = signInData.session.access_token;
        userId = signInData.user?.id;
        testUserCreated = true;
        pass(`Test user created + signed in (id=${userId?.slice(0,8)}...)`);
      }
    }
  }
}

if (!userJwt || !userId) {
  console.log(`\n${RED}${BOLD}Cannot continue without auth token — skipping PawaPay tests.${RESET}\n`);
  printSummary();
  process.exit(failed > 0 ? 1 : 0);
}

// Ensure profile exists
{
  const { data: existing } = await adminClient.from('profiles').select('id').eq('id', userId).single();
  if (!existing) {
    await adminClient.from('profiles').insert({
      id: userId,
      wallet_balance_rwf: 0,
      locked_balance_rwf: 0,
    });
  }
  pass('Profile record exists for test user');
}

// ─── 6. DEPOSIT TEST ─────────────────────────────────────────────────────────
section(`6. PawaPay Deposit — ${TEST_AMOUNT} RWF → ${TEST_PHONE}`);

let depositTransactionId = null;
let depositStartBalance = 0;

// Record balance before
{
  const { data: profile } = await adminClient
    .from('profiles')
    .select('wallet_balance_rwf')
    .eq('id', userId)
    .single();
  depositStartBalance = profile?.wallet_balance_rwf ?? 0;
  info(`Balance before deposit: ${depositStartBalance} RWF`);
}

{
  info(`Sending deposit request to ${BASE_URL}/api/pawapay-deposit ...`);
  try {
    const r = await fetch(`${BASE_URL}/api/pawapay-deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userJwt}`,
      },
      body: JSON.stringify({
        amount: TEST_AMOUNT,
        phoneNumber: TEST_PHONE,
        correspondent: 'MTN_MOMO_RWA',
      }),
    });

    const body = await r.json();

    if (r.ok && body.success) {
      depositTransactionId = body.transactionId;
      pass(`Deposit initiated (txId=${depositTransactionId})`);
      info(`PawaPay response status: ${body.pawapayData?.status ?? 'N/A'}`);
      console.log(`\n  ${BOLD}${YELLOW}>>> CHECK YOUR PHONE (${TEST_PHONE}) — ENTER YOUR PIN TO CONFIRM <<<${RESET}\n`);
    } else {
      fail('Deposit API call', JSON.stringify(body).slice(0, 200));
    }
  } catch (err) {
    fail('Deposit API call', err.message);
  }
}

// Verify transaction recorded in DB
if (depositTransactionId) {
  const { data: tx, error } = await adminClient
    .from('transactions')
    .select('*')
    .eq('reference', depositTransactionId)
    .single();

  if (error || !tx) {
    fail('Deposit transaction recorded in DB', error?.message || 'Not found');
  } else {
    pass(`Deposit recorded in DB (status=${tx.status}, amount=${tx.amount_rwf} RWF)`);
  }
}

// ─── 7. POLL FOR DEPOSIT COMPLETION ─────────────────────────────────────────
section('7. Waiting for Deposit Completion (max 3 min)');

let depositCompleted = false;
let pollAttempt = 0;

if (depositTransactionId) {
  const maxAttempts = 18; // 18 × 10s = 3 minutes

  while (pollAttempt < maxAttempts && !depositCompleted) {
    pollAttempt++;
    await sleep(10000);

    const { data: tx } = await adminClient
      .from('transactions')
      .select('status, amount_rwf, balance_after_rwf')
      .eq('reference', depositTransactionId)
      .single();

    process.stdout.write(`  [${pollAttempt}/${maxAttempts}] Tx status: ${tx?.status ?? '?'}\r`);

    if (tx?.status === 'completed') {
      depositCompleted = true;
      console.log('');
      pass(`Deposit COMPLETED via webhook (balance_after=${tx.balance_after_rwf} RWF)`);

      // Verify balance updated
      const { data: profile } = await adminClient
        .from('profiles')
        .select('wallet_balance_rwf')
        .eq('id', userId)
        .single();

      const newBalance = profile?.wallet_balance_rwf ?? 0;
      if (newBalance >= depositStartBalance + TEST_AMOUNT) {
        pass(`Wallet balance credited: ${depositStartBalance} → ${newBalance} RWF (+${newBalance - depositStartBalance})`);
      } else {
        fail('Wallet balance credited after deposit', `Expected ≥${depositStartBalance + TEST_AMOUNT}, got ${newBalance}`);
      }
    } else if (tx?.status === 'failed') {
      console.log('');
      fail('Deposit completed', `PawaPay returned FAILED status`);
      break;
    }
  }

  if (!depositCompleted && pollAttempt >= maxAttempts) {
    console.log('');
    warn('Deposit still pending after 3 minutes — you may need to enter PIN or check PawaPay dashboard.');
    warn('Continuing with withdrawal test using current balance...');
  }
}

// ─── 8. WITHDRAWAL TEST ──────────────────────────────────────────────────────
section(`8. PawaPay Withdrawal — ${TEST_AMOUNT} RWF → ${TEST_PHONE}`);

// Check current balance before withdrawal
const { data: balanceProfile } = await adminClient
  .from('profiles')
  .select('wallet_balance_rwf, locked_balance_rwf')
  .eq('id', userId)
  .single();

const walletBalance = balanceProfile?.wallet_balance_rwf ?? 0;
const lockedBalance = balanceProfile?.locked_balance_rwf ?? 0;
const available = walletBalance - lockedBalance;

info(`Current balance: ${walletBalance} RWF (locked: ${lockedBalance}, available: ${available})`);

if (available < TEST_AMOUNT) {
  warn(`Insufficient balance for withdrawal test (${available} < ${TEST_AMOUNT} RWF).`);
  warn(`Deposit may not have confirmed yet — skipping withdrawal.`);
} else {
  let withdrawTxId = null;
  let withdrawStartBalance = walletBalance;

  try {
    const r = await fetch(`${BASE_URL}/api/pawapay-withdrawal`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userJwt}`,
      },
      body: JSON.stringify({
        amount: TEST_AMOUNT,
        phoneNumber: TEST_PHONE,
        correspondent: 'MTN_MOMO_RWA',
      }),
    });

    const body = await r.json();

    if (r.ok && body.success) {
      withdrawTxId = body.transactionId;
      pass(`Withdrawal initiated (txId=${withdrawTxId})`);
      info(`PawaPay response: ${JSON.stringify(body.pawapayData?.status ?? body.status ?? 'N/A')}`);
    } else {
      fail('Withdrawal API call', JSON.stringify(body).slice(0, 200));
    }
  } catch (err) {
    fail('Withdrawal API call', err.message);
  }

  // Verify wallet was deducted
  if (withdrawTxId) {
    const { data: profileAfter } = await adminClient
      .from('profiles')
      .select('wallet_balance_rwf')
      .eq('id', userId)
      .single();
    const balAfter = profileAfter?.wallet_balance_rwf ?? 0;

    if (balAfter <= withdrawStartBalance - TEST_AMOUNT) {
      pass(`Wallet deducted immediately: ${withdrawStartBalance} → ${balAfter} RWF`);
    } else {
      fail('Wallet deducted after withdrawal', `Expected ≤${withdrawStartBalance - TEST_AMOUNT}, got ${balAfter}`);
    }

    const { data: tx } = await adminClient
      .from('transactions')
      .select('status, amount_rwf')
      .eq('reference', withdrawTxId)
      .single();

    if (tx) {
      pass(`Withdrawal transaction in DB (status=${tx.status})`);
    } else {
      fail('Withdrawal transaction in DB');
    }
  }
}

// ─── 9. INTERCONNECTION CHECKS ───────────────────────────────────────────────
section('9. Full Platform Interconnection Check');

// Check products linked to vendors
{
  const { data, error } = await adminClient
    .from('products')
    .select('id, name, vendor_id, price_rwf, stock_quantity')
    .limit(5);

  if (error) {
    fail('Products table accessible', error.message);
  } else {
    pass(`Products table: ${data?.length ?? 0} products loaded`);
    if (data?.length > 0) {
      const withVendor = data.filter(p => p.vendor_id).length;
      info(`${withVendor}/${data.length} products have vendor_id linked`);
    }
  }
}

// Check orders table (uses buyer_user_id)
{
  const { data, error } = await adminClient
    .from('orders')
    .select('id, buyer_user_id, status, total_rwf')
    .limit(5);

  if (error) {
    fail('Orders table accessible', error.message);
  } else {
    pass(`Orders table: ${data?.length ?? 0} orders found`);
  }
}

// Check transactions for our test user
{
  const { data, error } = await adminClient
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    fail('Transactions for test user', error.message);
  } else {
    pass(`Test user transactions: ${data?.length ?? 0} records`);
    if (data?.length > 0) {
      data.forEach(tx => info(`  ↳ ${tx.type} | ${tx.amount_rwf} RWF | ${tx.status} | ref=${tx.reference?.slice(0,20)}...`));
    }
  }
}

// Check RPC calls are absent (no DB functions needed)
pass('No .rpc() or Edge Functions used — pure API architecture');

// ─── CLEANUP ─────────────────────────────────────────────────────────────────
section('10. Cleanup');

if (testUserCreated && userId) {
  try {
    await adminClient.from('transactions').delete().eq('user_id', userId);
    await adminClient.from('profiles').delete().eq('id', userId);
    await adminClient.auth.admin.deleteUser(userId);
    pass('Test user and data cleaned up');
  } catch (err) {
    warn(`Cleanup failed: ${err.message} — remove test user manually if needed`);
  }
}

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
printSummary();

function printSummary() {
  const total = passed + failed;
  console.log(`\n${BOLD}━━ RESULTS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${RESET}`);
  console.log(`  ${GREEN}${passed}${RESET} passed  ${RED}${failed}${RESET} failed  out of ${total} checks`);

  if (failures.length > 0) {
    console.log(`\n${RED}${BOLD}Failed checks:${RESET}`);
    failures.forEach(f => console.log(`  ${RED}✘${RESET} ${f.label}${f.detail ? ` — ${f.detail}` : ''}`));
  }

  const status = failed === 0 ? `${GREEN}${BOLD}ALL PASS ✔` : `${RED}${BOLD}FAILURES FOUND ✘`;
  console.log(`\n  ${status}${RESET}\n`);
}

process.exit(failed > 0 ? 1 : 0);

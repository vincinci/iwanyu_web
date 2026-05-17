#!/usr/bin/env node
/**
 * Quick PawaPay withdrawal diagnostic — shows full rejection reason
 */
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.McDG3rawGydXS7QIZfggPjhuLnWVFbEvbgGiLTET6eo';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const BASE_URL = 'https://www.iwanyu.store';

if (!SERVICE_KEY) {
  console.error('Missing SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_KEY);
const anon = createClient(SUPABASE_URL, ANON_KEY);

const ts = Date.now();
const email = `diag_wth_${ts}@iwanyu-test.com`;
const password = 'DiagTest123!';

console.log('Creating test user...');
const { data: created, error: createErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (createErr) { console.error('Create error:', createErr.message); process.exit(1); }

const userId = created.user.id;
console.log('User created:', userId.slice(0, 8) + '...');

// Give them 200 RWF balance (upsert in case trigger hasn't fired yet)
await admin.from('profiles').upsert({ id: userId, wallet_balance_rwf: 200, locked_balance_rwf: 0 });
console.log('Set wallet balance to 200 RWF');

const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
if (signInErr || !signIn?.session) {
  console.error('Sign in error:', signInErr?.message);
  await admin.auth.admin.deleteUser(userId);
  process.exit(1);
}

const jwt = signIn.session.access_token;
console.log('Signed in. JWT length:', jwt.length);

console.log('\n=== Calling withdrawal API ===');
const r = await fetch(`${BASE_URL}/api/pawapay-withdrawal`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`,
  },
  body: JSON.stringify({
    amount: 101,
    phoneNumber: '+250794306915',
    correspondent: 'MTN_MOMO_RWA',
  }),
});

console.log('HTTP status:', r.status);
const data = await r.json();
console.log('Full response:', JSON.stringify(data, null, 2));

console.log('\n=== Transaction in DB ===');
const { data: tx } = await admin
  .from('transactions')
  .select('status, amount_rwf, metadata, type')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();

if (tx) {
  console.log('Status:', tx.status);
  console.log('Metadata (PawaPay response):', JSON.stringify(tx.metadata, null, 2));
} else {
  console.log('No transaction found in DB');
}

console.log('\n=== Wallet balance after ===');
const { data: profile } = await admin.from('profiles').select('wallet_balance_rwf').eq('id', userId).single();
console.log('Balance:', profile?.wallet_balance_rwf, 'RWF');

// Cleanup
await admin.auth.admin.deleteUser(userId);
console.log('\nCleaned up.');

#!/usr/bin/env node
/**
 * Quick PawaPay deposit diagnostic — shows full rejection reason
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
const email = `diag_${ts}@iwanyu-test.com`;
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

const { data: signIn, error: signInErr } = await anon.auth.signInWithPassword({ email, password });
if (signInErr || !signIn?.session) {
  console.error('Sign in error:', signInErr?.message);
  await admin.auth.admin.deleteUser(userId);
  process.exit(1);
}

const jwt = signIn.session.access_token;
console.log('Signed in. JWT length:', jwt.length);

// Ensure profile
await admin.from('profiles').upsert({ id: userId, wallet_balance_rwf: 0, locked_balance_rwf: 0 });

console.log('\n=== Calling deposit API ===');
const r = await fetch(`${BASE_URL}/api/pawapay-deposit`, {
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

const body = await r.json();
console.log('HTTP status:', r.status);
console.log('Full response:', JSON.stringify(body, null, 2));

// Also check what's in the DB
if (body.transactionId) {
  const { data: tx } = await admin
    .from('transactions')
    .select('*')
    .eq('reference', body.transactionId)
    .single();
  console.log('\n=== Transaction in DB ===');
  console.log('Status:', tx?.status);
  console.log('Metadata (PawaPay response):', JSON.stringify(tx?.metadata, null, 2));
}

// Cleanup
await admin.from('transactions').delete().eq('user_id', userId);
await admin.from('profiles').delete().eq('id', userId);
await admin.auth.admin.deleteUser(userId);
console.log('\nCleaned up.');

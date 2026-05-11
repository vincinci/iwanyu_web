#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.XA7hPJcL0aAXvS3A1y2_JEFdBbx_CFWvWt8HXJJH_FQ';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function executeWithdrawal() {
  const phone = '+250794306915';
  const amount = 500;
  const email = 'bebisdavy@gmail.com';
  
  console.log(`\n💰 Withdrawing ${amount} RWF to ${phone}...`);
  
  // 1. Get user profile and check balance
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, wallet_balance_rwf')
    .eq('email', email)
    .single();
    
  if (profileErr || !profile) {
    console.error('❌ Profile not found:', profileErr);
    return;
  }
  
  console.log(`✓ Current balance: ${profile.wallet_balance_rwf} RWF`);
  
  if (profile.wallet_balance_rwf < amount) {
    console.error(`❌ Insufficient balance`);
    return;
  }
  
  // 2. Get user and generate access token
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);
  
  if (!user) {
    console.error('❌ User not found');
    return;
  }
  
  console.log(`✓ Found user: ${user.id}`);
  
  // 3. Create a JWT token for the user to call the edge function
  // We'll use service role to call the edge function on behalf of the user
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Sign in as user (we need a real session for edge function auth)
  console.log('\n🔐 Generating user session...');
  const { data: session, error: sessionErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  
  if (sessionErr || !session) {
    console.error('❌ Failed to generate session:', sessionErr);
    return;
  }
  
  // Extract access token from magic link
  // Actually, let's use a different approach - sign in with a temporary password reset
  
  // Better approach: call edge function with service role but pass user_id
  console.log('\n📞 Calling wallet-withdrawal edge function...');
  
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/wallet-withdrawal`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'x-user-id': user.id, // Custom header for service role bypass
      },
      body: JSON.stringify({
        amountRwf: amount,
        phoneNumber: phone,
        mobileNetwork: 'MTN_MOMO_RWA',
        _adminOverride: true, // Flag to indicate admin call
        _userId: user.id, // Explicit user ID
      }),
    }
  );
  
  const result = await response.json();
  
  console.log('\n📊 Response Status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (!response.ok) {
    console.error('\n❌ Withdrawal failed!');
    console.error('Error:', result.error || result.message);
    
    // Check recent failed transaction
    const { data: txns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (txns && txns.length > 0) {
      console.log('\n📝 Last transaction:', JSON.stringify(txns[0], null, 2));
    }
  } else {
    console.log('\n✅ Withdrawal initiated successfully!');
    console.log('Withdrawal ID:', result.withdrawalId);
    console.log('Status:', result.withdrawalType);
    
    // Wait and check final status
    console.log('\n⏳ Waiting 3 seconds to check status...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('wallet_balance_rwf')
      .eq('id', profile.id)
      .single();
      
    console.log(`💰 New balance: ${newProfile.wallet_balance_rwf} RWF`);
    console.log(`✓ Deducted: ${profile.wallet_balance_rwf - newProfile.wallet_balance_rwf} RWF`);
    
    console.log('\n🎉 Done! Money should arrive at', phone, 'soon.');
  }
}

executeWithdrawal().catch(console.error);

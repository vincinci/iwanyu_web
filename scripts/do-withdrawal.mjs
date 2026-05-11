#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

async function withdrawFunds() {
  const email = 'bebisdavy@gmail.com';
  const phone = '+250794306915';
  const amount = 500;
  
  console.log(`\n💰 Attempting withdrawal of ${amount} RWF to ${phone}...`);
  
  // Get user ID
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
    console.error(`❌ Insufficient balance. Available: ${profile.wallet_balance_rwf} RWF`);
    return;
  }
  
  // Create a test user session
  const { data: users } = await supabase.auth.admin.listUsers();
  const user = users.users.find(u => u.email === email);
  
  if (!user) {
    console.error('❌ User not found');
    return;
  }
  
  // Generate access token for user
  const { data: session, error: sessionErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: email,
  });
  
  if (sessionErr) {
    console.error('❌ Failed to generate session:', sessionErr);
    return;
  }
  
  console.log('\n🔄 Calling wallet-withdrawal edge function...');
  
  // Call edge function directly with service role
  const response = await fetch(
    `${SUPABASE_URL}/functions/v1/wallet-withdrawal`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'x-user-id': profile.id, // Pass user ID directly
      },
      body: JSON.stringify({
        amountRwf: amount,
        phoneNumber: phone,
        mobileNetwork: 'MTN_RWANDA',
        userId: profile.id, // Pass explicitly
      }),
    }
  );
  
  const result = await response.json();
  
  console.log('\n📊 Response Status:', response.status);
  console.log('📊 Response:', JSON.stringify(result, null, 2));
  
  if (!response.ok) {
    console.error('\n❌ Withdrawal failed!');
    console.error('Error:', result.error || result.message);
    
    // Check transaction record
    const { data: txns } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('user_id', profile.id)
      .eq('status', 'failed')
      .order('created_at', { ascending: false })
      .limit(1);
      
    if (txns && txns.length > 0) {
      console.log('\n📝 Last failed transaction:', JSON.stringify(txns[0], null, 2));
    }
  } else {
    console.log('\n✅ Withdrawal initiated!');
    console.log('Transaction ID:', result.withdrawalId);
    
    // Wait and check status
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const { data: txn } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('external_transaction_id', result.withdrawalId)
      .single();
      
    if (txn) {
      console.log('\n📝 Transaction status:', txn.status);
      console.log('Transaction details:', JSON.stringify(txn, null, 2));
    }
    
    // Check new balance
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('wallet_balance_rwf')
      .eq('id', profile.id)
      .single();
      
    console.log(`\n💰 New balance: ${newProfile.wallet_balance_rwf} RWF`);
  }
}

withdrawFunds().catch(console.error);

#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY4NTQwMDUsImV4cCI6MjA3MjQzMDAwNX0.XA7hPJcL0aAXvS3A1y2_JEFdBbx_CFWvWt8HXJJH_FQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testWithdrawal() {
  const email = 'bebisdavy@gmail.com';
  const password = 'password123'; // You'll need to provide the actual password
  
  console.log('🔐 Signing in...');
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email,
    password: process.argv[2] || password,
  });
  
  if (authError) {
    console.error('❌ Auth error:', authError);
    return;
  }
  
  console.log('✅ Signed in as:', authData.user.email);
  
  const accessToken = authData.session.access_token;
  
  console.log('\n💰 Testing withdrawal of 100 RWF...');
  
  try {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/wallet-withdrawal`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amountRwf: 100,
          phoneNumber: '250788000000',
          mobileNetwork: 'MTN_RWANDA',
        }),
      }
    );
    
    const result = await response.json();
    
    console.log('\n📊 Response Status:', response.status);
    console.log('📊 Response Body:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.error('\n❌ Withdrawal failed!');
      console.error('Error:', result.error || result.message);
      if (result.details) {
        console.error('Details:', JSON.stringify(result.details, null, 2));
      }
    } else {
      console.log('\n✅ Withdrawal successful!');
    }
  } catch (error) {
    console.error('\n❌ Request error:', error.message);
  }
}

testWithdrawal().catch(console.error);

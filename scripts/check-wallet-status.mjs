#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function checkWalletStatus() {
  const email = 'bebisdavy@gmail.com';
  
  console.log(`\n🔍 Checking wallet status for ${email}...`);
  
  // Get profile with wallet balance
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, wallet_balance_rwf, locked_balance_rwf')
    .eq('email', email)
    .single();
    
  if (profileErr) {
    console.error('❌ Error fetching profile:', profileErr);
    return;
  }
  
  console.log('\n💰 Wallet Balance:');
  console.log(`   Available: ${profile.wallet_balance_rwf || 0} RWF`);
  console.log(`   Locked: ${profile.locked_balance_rwf || 0} RWF`);
  
  // Get recent transactions
  const { data: transactions, error: txnErr } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (txnErr) {
    console.error('❌ Error fetching transactions:', txnErr);
    return;
  }
  
  console.log('\n📊 Recent Transactions (last 10):');
  if (!transactions || transactions.length === 0) {
    console.log('   No transactions found');
  } else {
    transactions.forEach(txn => {
      const amount = txn.amount || txn.amount_rwf || 0;
      const type = txn.kind || txn.type || 'unknown';
      const status = txn.status || 'unknown';
      const date = new Date(txn.created_at).toLocaleString();
      console.log(`   ${date} | ${type.toUpperCase()} | ${amount} RWF | ${status} | ID: ${txn.id}`);
    });
  }
}

checkWalletStatus().catch(console.error);

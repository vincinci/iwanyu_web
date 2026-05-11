import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || 'https://ygpnvjfxxuabnrpvnfdq.supabase.co',
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

async function checkBalance() {
  console.log('🔍 Checking wallet balances...\n');

  // Get wallet balance for bebisdavy@gmail.com
  const { data: user, error: userError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', 'bebisdavy@gmail.com')
    .single();

  if (userError) {
    console.error('❌ User lookup failed:', userError);
    return;
  }

  console.log('✅ User found:', user.email);
  console.log('   User ID:', user.id);

  // Get wallet balance
  const { data: wallet, error: walletError } = await supabase
    .from('wallets')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (walletError) {
    console.error('❌ Wallet lookup failed:', walletError);
    return;
  }

  console.log('\n💰 Wallet Balance:');
  console.log('   Balance:', wallet.balance);
  console.log('   Locked:', wallet.locked_balance || 0);

  // Get recent transactions
  const { data: transactions, error: txError } = await supabase
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5);

  if (txError) {
    console.error('❌ Transaction lookup failed:', txError);
    return;
  }

  console.log('\n📊 Recent Transactions:');
  transactions?.forEach(tx => {
    const date = new Date(tx.created_at).toLocaleString();
    console.log(`   ${date} | ${tx.type.toUpperCase()} | ${tx.amount_rwf} RWF | ${tx.status}`);
  });
}

checkBalance().catch(console.error);

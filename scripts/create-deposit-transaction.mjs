import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function createDepositTransaction() {
  try {
    console.log('🔍 Finding user bebisdavy@gmail.com...');
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, email, wallet_balance_rwf')
      .eq('email', 'bebisdavy@gmail.com')
      .single();
    
    if (!profile) {
      throw new Error('User not found');
    }
    
    console.log(`✓ Found user: ${profile.email}`);
    console.log(`  Balance: ${profile.wallet_balance_rwf} RWF`);
    
    // Create a completed deposit transaction that matches the manual balance
    const depositId = `manual-deposit-${Date.now()}`;
    
    console.log(`\n💰 Creating deposit transaction...`);
    
    const { data: transaction, error: txnError} = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: profile.id,
        kind: 'deposit',  // Legacy column name
        type: 'deposit',
        amount: 5814,  // Legacy column
        amount_rwf: 5814,
        external_transaction_id: depositId,
        status: 'completed',
        description: 'Manual deposit - PawaPay balance transfer',
      })
      .select()
      .single();
    
    if (txnError) {
      throw new Error(`Failed to create transaction: ${txnError.message}`);
    }
    
    console.log(`\n✅ Successfully created deposit transaction!`);
    console.log(`   Transaction ID: ${transaction.id}`);
    console.log(`   External ID: ${depositId}`);
    console.log(`   Amount: 5,814 RWF`);
    console.log(`   Status: completed`);
    console.log(`\n🎉 You can now withdraw from your wallet!`);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

createDepositTransaction();

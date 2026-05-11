import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  try {
    // First check table structure
    console.log('🔍 Checking profiles table structure...');
    const { data: sample, error: sampleError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (sample && sample.length > 0) {
      console.log('Available columns:', Object.keys(sample[0]).join(', '));
    }
    
    // Find user by email containing 'davy'
    console.log('\n🔍 Looking for user with "davy" in email or full_name...');
    const { data: users, error: searchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, wallet_balance_rwf')
      .or('email.ilike.%davy%,full_name.ilike.%davy%')
      .limit(5);
    
    if (searchError) {
      console.error('Search error:', searchError);
      return;
    }
    
    console.log(`\n📋 Found ${users?.length || 0} user(s):`);
    users?.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email || u.full_name} (Balance: ${u.wallet_balance_rwf || 0} RWF)`);
    });
    
    if (users && users.length > 0) {
      const user = users[0];
      console.log(`\n💰 Updating balance for: ${user.email || user.full_name}`);
      console.log(`   Current balance: ${user.wallet_balance_rwf || 0} RWF`);
      console.log(`   New balance: 5,814 RWF`);
      
      // Update balance
      const { data: updated, error: updateError } = await supabase
        .from('profiles')
        .update({ wallet_balance_rwf: 5814 })
        .eq('id', user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('\n❌ Error updating:', updateError);
      } else {
        console.log(`\n✅ Successfully updated!`);
        console.log(`   New balance: ${updated.wallet_balance_rwf} RWF`);
        console.log(`\n🎉 Done! Refresh your dashboard to see the updated balance.`);
      }
    } else {
      console.log('\n❌ No user found matching "davy"');
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

run();

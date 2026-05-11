#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ygpnvjfxxuabnrpvnfdq.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function deleteManualDeposit() {
  console.log('🗑️  Deleting manual deposit transaction...');
  
  const { data, error } = await supabase
    .from('wallet_transactions')
    .delete()
    .eq('external_transaction_id', 'manual-deposit-1778507751447')
    .select();
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  console.log('✅ Deleted:', data);
  console.log('\n✓ Manual deposit removed. Now withdrawal will use payout flow for seller earnings.');
}

deleteManualDeposit().catch(console.error);

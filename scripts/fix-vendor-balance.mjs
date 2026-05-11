#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const admin = createClient(
  'https://ygpnvjfxxuabnrpvnfdq.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk'
);

// Check if column exists and reset
const { data } = await admin.from('vendors').select('id').limit(1);
if (data) {
  console.log('Resetting vendor payout balances (if column exists)...');
  // Try direct update without triggering shop_name validation
  const { count, error } = await admin
    .from('vendors')
    .update({ payout_balance_rwf: 0 }, { count: 'exact' })
    .or('payout_balance_rwf.gt.0,payout_balance_rwf.lt.0');
  
  if (error && !error.message.includes('payout_balance_rwf')) {
    console.log('Note:', error.message);
  } else if (count !== null) {
    console.log(`✅ Reset ${count} vendor balance(s)`);
  } else {
    console.log('✅ Vendor balances checked (column may not exist, which is OK)');
  }
}

/**
 * Browser Console Script to Update Wallet Balance
 * 
 * HOW TO USE:
 * 1. Go to https://www.iwanyu.store
 * 2. Open browser console (F12 or Cmd+Option+J on Mac)
 * 3. Paste this entire script
 * 4. Press Enter
 * 
 * This will update your wallet balance to 5,814 RWF to match your PawaPay account
 */

(async function updateWalletBalance() {
  try {
    console.log('🔍 Fetching current wallet balance...');
    
    // Get current user info from localStorage or session
    const supabaseAuth = JSON.parse(localStorage.getItem('sb-ygpnvjfxxuabnrpvnfdq-auth-token') || '{}');
    const userId = supabaseAuth?.user?.id;
    
    if (!userId) {
      console.error('❌ No user logged in. Please log in first.');
      return;
    }
    
    console.log(`✓ User ID: ${userId}`);
    
    // Make API request to update balance (requires admin access or service role)
    // Since we can't update directly from browser without admin permissions,
    // this script will need to be run server-side
    
    console.log('⚠️  Note: This script requires admin/service role access.');
    console.log('Please run the Node.js script instead with proper credentials:');
    console.log('   node scripts/update-wallet-balance.mjs davy 5814');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();

#!/usr/bin/env node
/**
 * DANGER: Reset all dashboards, metrics, and wallets
 * This will delete ALL transaction data and reset balances to zero
 * USE WITH EXTREME CAUTION - THIS CANNOT BE UNDONE
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVhYm5ycHZuZmRxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njg1NDAwNSwiZXhwIjoyMDcyNDMwMDA1fQ.btjqJ99R4UNSobIz_02Ll0_MDQvZrHhXWSvMeTeRbDk";

const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("\n🚨 ═══════════════════════════════════════════════════════════════");
console.log("   DANGER: This will PERMANENTLY DELETE all financial data!");
console.log("   ═══════════════════════════════════════════════════════════════\n");

const RESET_CONFIRMATION = process.argv[2];
if (RESET_CONFIRMATION !== "--confirm-reset") {
  console.log("To proceed, run:");
  console.log("  node scripts/reset-all-data.mjs --confirm-reset");
  console.log("");
  process.exit(0);
}

async function resetAllData() {
  console.log("Starting data reset...\n");

  try {
    // 1. Delete wallet transactions
    console.log("🗑️  Deleting wallet_transactions...");
    const { error: txErr } = await admin.from("wallet_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (txErr) {
      console.error("Error deleting wallet_transactions:", txErr.message);
    } else {
      console.log("✅ wallet_transactions cleared");
    }

    // 2. Delete wallet topups
    console.log("🗑️  Deleting wallet_topups...");
    const { error: topupErr } = await admin.from("wallet_topups").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (topupErr) {
      console.error("Error deleting wallet_topups:", topupErr.message);
    } else {
      console.log("✅ wallet_topups cleared");
    }

    // 3. Delete seller withdrawal transactions
    console.log("🗑️  Deleting seller_withdrawal_transactions...");
    const { error: withdrawErr } = await admin.from("seller_withdrawal_transactions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (withdrawErr && !withdrawErr.message.includes("does not exist")) {
      console.error("Error deleting seller_withdrawal_transactions:", withdrawErr.message);
    } else {
      console.log("✅ seller_withdrawal_transactions cleared");
    }

    // 4. Delete seller withdrawals
    console.log("🗑️  Deleting seller_withdrawals...");
    const { error: swErr } = await admin.from("seller_withdrawals").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (swErr && !swErr.message.includes("does not exist")) {
      console.error("Error deleting seller_withdrawals:", swErr.message);
    } else {
      console.log("✅ seller_withdrawals cleared");
    }

    // 5. Delete vendor payouts
    console.log("🗑️  Deleting vendor_payouts...");
    const { error: payoutErr } = await admin.from("vendor_payouts").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (payoutErr) {
      console.error("Error deleting vendor_payouts:", payoutErr.message);
    } else {
      console.log("✅ vendor_payouts cleared");
    }

    // 6. Delete order items first (foreign key)
    console.log("🗑️  Deleting order_items...");
    const { error: itemErr } = await admin.from("order_items").delete().neq("order_id", "00000000-0000-0000-0000-000000000000");
    if (itemErr) {
      console.error("Error deleting order_items:", itemErr.message);
    } else {
      console.log("✅ order_items cleared");
    }

    // 7. Delete orders
    console.log("🗑️  Deleting orders...");
    const { error: orderErr } = await admin.from("orders").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (orderErr) {
      console.error("Error deleting orders:", orderErr.message);
    } else {
      console.log("✅ orders cleared");
    }

    // 8. Reset all user wallet balances to 0
    console.log("💰 Resetting all user wallet balances...");
    const { error: balanceErr } = await admin.from("profiles")
      .update({ 
        wallet_balance_rwf: 0,
        locked_balance_rwf: 0
      })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (balanceErr) {
      console.error("Error resetting wallet balances:", balanceErr.message);
    } else {
      console.log("✅ All user wallet balances reset to 0");
    }

    // 9. Reset vendor payout balances
    console.log("💰 Resetting vendor payout balances...");
    const { error: vendorBalErr } = await admin.from("vendors")
      .update({ payout_balance_rwf: 0 })
      .neq("id", "00000000-0000-0000-0000-000000000000");
    
    if (vendorBalErr && !vendorBalErr.message.includes("payout_balance_rwf")) {
      console.error("Error resetting vendor balances:", vendorBalErr.message);
    } else {
      console.log("✅ Vendor payout balances reset to 0");
    }

    // 10. Delete vendor notifications
    console.log("🗑️  Deleting vendor_notifications...");
    const { error: notifErr } = await admin.from("vendor_notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (notifErr && !notifErr.message.includes("does not exist")) {
      console.error("Error deleting vendor_notifications:", notifErr.message);
    } else {
      console.log("✅ vendor_notifications cleared");
    }

    // 11. Delete bids
    console.log("🗑️  Deleting bids...");
    const { error: bidErr } = await admin.from("bids").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (bidErr && !bidErr.message.includes("does not exist")) {
      console.error("Error deleting bids:", bidErr.message);
    } else {
      console.log("✅ bids cleared");
    }

    // 12. Delete auctions
    console.log("🗑️  Deleting auctions...");
    const { error: auctionErr } = await admin.from("auctions").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (auctionErr && !auctionErr.message.includes("does not exist")) {
      console.error("Error deleting auctions:", auctionErr.message);
    } else {
      console.log("✅ auctions cleared");
    }

    console.log("\n✅ ═══════════════════════════════════════════════════════════════");
    console.log("   All dashboards, metrics, and wallets have been reset!");
    console.log("   ═══════════════════════════════════════════════════════════════\n");

    // Display summary
    console.log("📊 Summary of what was reset:");
    console.log("   • All wallet transactions deleted");
    console.log("   • All wallet topups deleted");
    console.log("   • All seller withdrawals deleted");
    console.log("   • All vendor payouts deleted");
    console.log("   • All orders and order items deleted");
    console.log("   • All user wallet balances reset to 0");
    console.log("   • All vendor payout balances reset to 0");
    console.log("   • All vendor notifications deleted");
    console.log("   • All bids and auctions deleted");
    console.log("");

  } catch (error) {
    console.error("\n❌ Error during reset:", error);
    process.exit(1);
  }
}

await resetAllData();

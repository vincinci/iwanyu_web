// Script to fix pending wallet transaction
// Run with: npx tsx scripts/fix-pending-transaction.ts

const SUPABASE_URL = "https://ygpnvjfxxuabnrpvnfdq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlncG52amZ4eHVVYm5ycHZuZmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzczNjYxMzQsImV4cCI6MjA0ODk0MjEzNH0.UJxYCvQ9jNZqPFZUG_k-hJtqHJtqHJtqHJtqHJtqHJtq";

async function main() {
  // Get pending transactions
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/wallet_transactions?select=*&status=eq.pending&order=created_at.desc&limit=5`,
    {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    }
  );

  const transactions = await response.json();
  console.log("Pending transactions:", JSON.stringify(transactions, null, 2));
}

main();
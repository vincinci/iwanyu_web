import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Deposit callback:", payload);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { depositId, status, amount } = payload;

    // Update transaction status
    const { data: transaction, error: fetchError } = await supabaseClient
      .from("wallet_transactions")
      .select("*")
      .eq("external_transaction_id", depositId)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transaction not found");
    }

    // Update transaction
    const { error: updateError } = await supabaseClient
      .from("wallet_transactions")
      .update({
        status: status === "COMPLETED" ? "completed" : "failed",
        updated_at: new Date().toISOString(),
      })
      .eq("external_transaction_id", depositId);

    if (updateError) {
      throw new Error("Failed to update transaction");
    }

    // If successful, update wallet balance
    if (status === "COMPLETED") {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("wallet_balance_rwf")
        .eq("id", transaction.user_id)
        .single();

      const currentBalance = profile?.wallet_balance_rwf || 0;
      const newBalance = currentBalance + parseInt(amount);

      // Update profile wallet balance
      await supabaseClient
        .from("profiles")
        .update({
          wallet_balance_rwf: newBalance,
        })
        .eq("id", transaction.user_id);

      // Update transaction with new balance
      await supabaseClient
        .from("wallet_transactions")
        .update({
          new_balance_rwf: newBalance,
        })
        .eq("external_transaction_id", depositId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});

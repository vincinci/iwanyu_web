import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Withdrawal callback:", payload);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { payoutId, status, amount } = payload;

    // Update transaction
    const { data: transaction, error: fetchError } = await supabaseClient
      .from("wallet_transactions")
      .select("*")
      .eq("external_transaction_id", payoutId)
      .single();

    if (fetchError || !transaction) {
      throw new Error("Transaction not found");
    }

    const finalStatus = status === "COMPLETED" ? "completed" : "failed";

    await supabaseClient
      .from("wallet_transactions")
      .update({
        status: finalStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("external_transaction_id", payoutId);

    // If failed, refund the wallet
    if (status === "FAILED") {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("wallet_balance_rwf")
        .eq("id", transaction.user_id)
        .single();

      const refundAmount = parseInt(amount);
      const newBalance = (profile?.wallet_balance_rwf || 0) + refundAmount;

      await supabaseClient
        .from("profiles")
        .update({
          wallet_balance_rwf: newBalance,
        })
        .eq("id", transaction.user_id);

      // Update transaction with refunded balance
      await supabaseClient
        .from("wallet_transactions")
        .update({
          new_balance_rwf: newBalance,
        })
        .eq("external_transaction_id", payoutId);
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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Wallet Withdrawal Callback (PawaPay)
 *
 * Called by PawaPay when a wallet withdrawal payout status changes.
 * This endpoint is called asynchronously after payout processing.
 *
 * Expected callback data from PawaPay:
 * {
 *   payoutId: string,
 *   status: "COMPLETED" | "FAILED" | "PROCESSING",
 *   ...
 * }
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const body = await req.json() as {
      payoutId: string;
      status: string;
      amount?: string;
      errorCode?: string;
      errorMessage?: string;
    };

    const { payoutId, status, amount, errorCode, errorMessage } = body;

    console.log(`Wallet withdrawal callback received: payoutId=${payoutId}, status=${status}`);

    // Find the transaction by external_transaction_id
    const { data: transaction, error: findErr } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, status")
      .eq("external_transaction_id", payoutId)
      .single();

    if (findErr || !transaction) {
      console.error("Transaction not found for payout:", payoutId);
      return new Response(
        JSON.stringify({ error: "Transaction not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update transaction status based on PawaPay callback
    let newStatus: "completed" | "failed" | "processing" = "processing";

    switch (status) {
      case "COMPLETED":
        newStatus = "completed";
        break;
      case "FAILED":
        newStatus = "failed";
        break;
      case "PROCESSING":
      case "PENDING":
      default:
        newStatus = "processing";
        break;
    }

    // Update the transaction
    const { error: updateErr } = await supabase
      .from("wallet_transactions")
      .update({
        status: newStatus,
        description: newStatus === "failed" 
          ? `Withdrawal failed: ${errorMessage || errorCode}` 
          : `Withdrawal ${newStatus}`,
      })
      .eq("id", transaction.id);

    if (updateErr) {
      console.error("Failed to update transaction status:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to update transaction" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If payout failed, the balance was already refunded in the withdrawal function
    // But we should log the failure for audit purposes
    if (newStatus === "failed") {
      console.log(`Wallet withdrawal FAILED: payoutId=${payoutId}, error=${errorMessage || errorCode}`);
    } else if (newStatus === "completed") {
      console.log(`Wallet withdrawal COMPLETED: payoutId=${payoutId}, amount=${amount}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Callback processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in wallet-withdrawal-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

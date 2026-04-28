import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Wallet Deposit Callback (PawaPay)
 *
 * Called when a user deposits money via PawaPay mobile money.
 * Webhook from PawaPay with payment status.
 *
 * Incoming webhook format:
 * {
 *   depositId: "uuid",
 *   status: "COMPLETED|FAILED|PROCESSING",
 *   requestedAmount: "string",
 *   currency: "RWF",
 *   country: "string"
 * }
 *
 * This function:
 * 1. Receives PawaPay deposit callback
 * 2. Only processes COMPLETED deposits
 * 3. Checks for duplicate transactions (idempotency)
 * 4. Credits user's wallet
 * 5. Records transaction
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
    const body = await req.json();
    
    const { depositId, status, requestedAmount, currency, country } = body;

    // Only process completed deposits
    if (status !== "COMPLETED") {
      console.log(`Deposit ${depositId} status: ${status} - not processing`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate currency (RWF for Rwanda)
    if (currency !== "RWF") {
      console.warn(`Unexpected currency: ${currency}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check for duplicate
    const { data: existing } = await supabase
      .from("wallet_transactions")
      .select("id")
      .eq("external_transaction_id", depositId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ success: true, reason: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up transaction by depositId to find userId
    // The userId should have been stored when the deposit was initiated
    const { data: txnRecord, error: txnErr } = await supabase
      .from("wallet_transactions")
      .select("user_id")
      .eq("external_transaction_id", depositId)
      .maybeSingle();

    if (txnErr || !txnRecord) {
      console.warn(`No transaction found for deposit ${depositId}`);
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = txnRecord.user_id;
    const amountRwf = Math.round(parseFloat(requestedAmount));

    // Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      console.warn(`User not found: ${userId}`);
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const previousBalance = Number(profile.wallet_balance_rwf || 0);
    const newBalance = previousBalance + amountRwf;

    // Update wallet balance
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ wallet_balance_rwf: newBalance })
      .eq("id", userId);

    if (updateErr) {
      console.error("Failed to update wallet:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update wallet" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update transaction status to completed
    const { error: updateTxnErr } = await supabase
      .from("wallet_transactions")
      .update({
        status: "completed",
        new_balance_rwf: newBalance,
      })
      .eq("external_transaction_id", depositId);

    if (updateTxnErr) {
      console.warn("Failed to update transaction status:", updateTxnErr);
    }

    console.log(`Wallet credited via PawaPay: User ${userId}, Amount: ${amountRwf} RWF, Deposit: ${depositId}`);

    return new Response(JSON.stringify({ success: true, depositId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in wallet-deposit-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

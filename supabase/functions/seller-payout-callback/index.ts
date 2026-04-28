import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Seller Payout Callback (PawaPay)
 *
 * Called when PawaPay completes or fails a payout to a seller's mobile money account.
 * Updates seller_withdrawals status based on payout result.
 *
 * Incoming webhook format:
 * {
 *   payoutId: "uuid",
 *   status: "COMPLETED|FAILED",
 *   amount: "string",
 *   currency: "RWF",
 *   country: "RW"
 * }
 *
 * This function:
 * 1. Receives PawaPay payout callback
 * 2. Updates seller_withdrawals status
 * 3. If failed, refunds balance back to vendor
 * 4. Records transaction update
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
    
    const { payoutId, status, amount, currency, country } = body;

    console.log(`Payout callback received: ${payoutId}, Status: ${status}`);

    // Validate currency
    if (currency !== "RWF") {
      console.warn(`Unexpected currency: ${currency}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch withdrawal record
    const { data: withdrawal, error: withdrawalErr } = await supabase
      .from("seller_withdrawals")
      .select("id, vendor_id, amount_rwf, status, phone_number, mobile_network")
      .eq("id", payoutId)
      .maybeSingle();

    if (withdrawalErr || !withdrawal) {
      console.warn(`Withdrawal not found for payout ${payoutId}`);
      // Return 200 OK for idempotency
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If already processed, skip
    if (withdrawal.status === "completed" || withdrawal.status === "failed") {
      return new Response(JSON.stringify({ success: true, reason: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountRwf = Math.round(parseFloat(amount || "0"));

    // Update withdrawal status
    if (status === "COMPLETED") {
      // Payout successful
      const { error: updateErr } = await supabase
        .from("seller_withdrawals")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      if (updateErr) {
        console.error("Failed to update withdrawal status:", updateErr);
        return new Response(JSON.stringify({ error: "Failed to update withdrawal" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update transaction status
      const { error: txnErr } = await supabase
        .from("seller_withdrawal_transactions")
        .update({ status: "completed" })
        .eq("withdrawal_id", payoutId);

      if (txnErr) {
        console.warn("Failed to update transaction status:", txnErr);
      }

      console.log(`Payout completed: Withdrawal ${payoutId}, Amount: ${amountRwf} RWF`);

      // TODO: Send SMS notification to seller: "Withdrawal of FRW {amount} has been sent to {phone}"
    } else if (status === "FAILED") {
      // Payout failed - need to refund the amount
      const { data: vendor, error: vendorErr } = await supabase
        .from("vendors")
        .select("payout_balance_rwf")
        .eq("id", withdrawal.vendor_id)
        .single();

      if (vendorErr || !vendor) {
        console.error("Vendor not found:", withdrawal.vendor_id);
        return new Response(JSON.stringify({ error: "Vendor not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const currentBalance = Number(vendor.payout_balance_rwf || 0);
      const refundedBalance = currentBalance + amountRwf;

      // Refund amount back to vendor
      const { error: refundErr } = await supabase
        .from("vendors")
        .update({ payout_balance_rwf: refundedBalance })
        .eq("id", withdrawal.vendor_id);

      if (refundErr) {
        console.error("Failed to refund payout amount:", refundErr);
        return new Response(JSON.stringify({ error: "Failed to process refund" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update withdrawal status to failed
      const { error: updateErr } = await supabase
        .from("seller_withdrawals")
        .update({ status: "failed" })
        .eq("id", payoutId);

      if (updateErr) {
        console.error("Failed to update withdrawal status:", updateErr);
      }

      // Update transaction status
      const { error: txnErr } = await supabase
        .from("seller_withdrawal_transactions")
        .update({ 
          status: "failed",
          new_balance_rwf: refundedBalance,
        })
        .eq("withdrawal_id", payoutId);

      if (txnErr) {
        console.warn("Failed to update transaction status:", txnErr);
      }

      console.log(`Payout failed: Withdrawal ${payoutId}, Refunded ${amountRwf} RWF`);

      // TODO: Send SMS notification to seller: "Withdrawal failed. FRW {amount} has been returned to your account"
    }

    return new Response(JSON.stringify({ success: true, payoutId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in seller-payout-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

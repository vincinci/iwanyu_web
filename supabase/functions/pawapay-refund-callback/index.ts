import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * PawaPay Refund Callback
 *
 * Webhook handler for PawaPay refund status updates (client wallet withdrawals).
 *
 * Incoming webhook format:
 * {
 *   refundId: "uuid",
 *   status: "COMPLETED|FAILED|PROCESSING",
 *   amount: "string",
 *   currency: "RWF",
 *   depositId: "original-deposit-uuid"
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
    const body = await req.json();
    const refundId = String(body?.refundId ?? "").trim();
    const status = String(body?.status ?? "").trim().toUpperCase();
    const amount = body?.amount ?? "0";
    const currency = String(body?.currency ?? "RWF").trim().toUpperCase();

    if (!refundId) {
      console.warn("Missing refundId in callback", { body });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Refund callback received: ${refundId}, status: ${status}, amount: ${amount} ${currency}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Find withdrawal transaction by refundId
    const { data: walletTxn, error: txnErr } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, amount_rwf, status")
      .eq("external_transaction_id", refundId)
      .eq("type", "withdrawal")
      .maybeSingle();

    if (txnErr || !walletTxn) {
      console.warn(`No wallet_transaction found for refund ${refundId}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Already processed
    if (walletTxn.status === "completed" || walletTxn.status === "failed") {
      return new Response(JSON.stringify({ success: true, reason: "Already processed" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amountRwf = Math.round(parseFloat(amount || String(walletTxn.amount_rwf || "0")));

    if (status === "COMPLETED") {
      // Mark as completed
      await supabase
        .from("wallet_transactions")
        .update({ status: "completed" })
        .eq("id", walletTxn.id);
      console.log(`Wallet withdrawal COMPLETED: txn ${walletTxn.id}, amount ${amountRwf} RWF`);
    } else if (status === "FAILED" || status === "REJECTED") {
      // Mark failed and refund balance
      await supabase
        .from("wallet_transactions")
        .update({ status: "failed" })
        .eq("id", walletTxn.id);

      // Refund wallet balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance_rwf")
        .eq("id", walletTxn.user_id)
        .single();

      const currentBal = Number((profile as Record<string, unknown> | null)?.wallet_balance_rwf ?? 0);
      await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: currentBal + amountRwf })
        .eq("id", walletTxn.user_id);

      console.log(`Wallet withdrawal FAILED: txn ${walletTxn.id}, refunded ${amountRwf} RWF to user ${walletTxn.user_id}`);
    }

    return new Response(JSON.stringify({ success: true, refundId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in pawapay-refund-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

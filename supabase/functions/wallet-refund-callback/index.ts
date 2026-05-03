import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Wallet Refund Callback (PawaPay)
 *
 * Called when a user requests a refund from their wallet (e.g., from a cancelled order,
 * dispute resolution, or manual refund by admin).
 *
 * POST body (called from backend/admin with JWT):
 * {
 *   userId: string,
 *   amountRwf: number,
 *   orderId?: string,
 *   reason: string,
 *   reference: string (optional, e.g., tx_ref or order_id)
 * }
 *
 * This function:
 * 1. Verifies JWT authorization
 * 2. Deducts amount from wallet_balance
 * 3. Records refund transaction
 * 4. Updates order status to "Refunded" if orderId provided
 * 5. Returns success with refund amount
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
    // Verify authorization (should be called from internal edge functions or admin)
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      userId: string;
      amountRwf: number;
      orderId?: string;
      reason: string;
      reference?: string;
    };

    const { userId, amountRwf, orderId, reason, reference } = body;

    if (!userId || !amountRwf || amountRwf <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid userId or amountRwf" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("wallet_balance_rwf, phone")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentBalance = Number(profile.wallet_balance_rwf || 0);
    const newBalance = Math.max(0, currentBalance - amountRwf);
    const actualRefundAmount = currentBalance - newBalance;

    // Update wallet balance
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({ wallet_balance_rwf: newBalance })
      .eq("id", userId);

    if (updateErr) {
      console.error("Failed to update wallet balance:", updateErr);
      return new Response(JSON.stringify({ error: "Failed to update wallet" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record refund transaction
    const { error: txnErr } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: userId,
        type: "refund",
        amount_rwf: actualRefundAmount,
        previous_balance_rwf: currentBalance,
        new_balance_rwf: newBalance,
        external_transaction_id: reference || `refund_${orderId}_${Date.now()}`,
        status: "completed",
        description: `Refund: ${reason}${orderId ? ` (Order ${orderId})` : ""}`,
      });

    if (txnErr) {
      console.warn("Failed to record refund transaction:", txnErr);
    }

    // If orderId provided, update order refund status
    if (orderId) {
      const { error: orderErr } = await supabase
        .from("orders")
        .update({ status: "Refunded" })
        .eq("id", orderId);

      if (orderErr) {
        console.warn("Failed to update order status:", orderErr);
      }
    }

    // TODO: Initiate mobile money refund to user's phone
    // This would call the mobile money provider API (PawaPay) to send
    // the refund back to the user's registered phone number.
    // For now, we've deducted from wallet and recorded the transaction.

    console.log(`Wallet refund processed: User ${userId}, Amount: ${actualRefundAmount} RWF, Reason: ${reason}`);

    return new Response(
      JSON.stringify({
        success: true,
        refundedAmount: actualRefundAmount,
        newBalance,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in wallet-refund-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

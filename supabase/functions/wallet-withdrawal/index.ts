import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAWAPAY_API_KEY = Deno.env.get("PAWAPAY_API_KEY") || "";
const PAWAPAY_ENV = (Deno.env.get("PAWAPAY_ENV") || "live").trim().toLowerCase();
const PAWAPAY_ENDPOINT = Deno.env.get("PAWAPAY_ENDPOINT") || "https://api.pawapay.io";

function getPawaPayEndpoint(): string {
  const configuredEndpoint = PAWAPAY_ENDPOINT.trim().replace(/\/*$/, "");
  const defaultEndpoint = PAWAPAY_ENV === "sandbox"
    ? "https://api.sandbox.pawapay.io"
    : "https://api.pawapay.io";

  switch (configuredEndpoint) {
    case "https://api.pawapay.cloud":
      return defaultEndpoint;
    case "https://api.sandbox.pawapay.cloud":
      return "https://api.sandbox.pawapay.io";
    default:
      return configuredEndpoint || defaultEndpoint;
  }
}

/**
 * Wallet Withdrawal (PawaPay)
 *
 * Called when a user requests to withdraw their wallet balance to mobile money.
 * This is triggered from the wallet page.
 *
 * POST body (called with user JWT token):
 * {
 *   walletId: string,
 *   amountRwf: number,
 *   mobileNetwork: "MTN" | "Airtel" | "Orange",
 *   phoneNumber: string
 * }
 *
 * This function:
 * 1. Verifies user authorization (via JWT)
 * 2. Checks if wallet has sufficient balance
 * 3. Deducts from wallet available_rwf
 * 4. Creates withdrawal transaction record
 * 5. Initiates mobile money payout via PawaPay API
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
    // Verify authorization
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
      walletId: string;
      amountRwf: number;
      mobileNetwork: "MTN" | "Airtel" | "Orange";
      phoneNumber: string;
    };

    const { walletId, amountRwf, mobileNetwork, phoneNumber } = body;

    if (!walletId || !amountRwf || amountRwf <= 0 || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Invalid request data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify wallet ownership
    const { data: wallet, error: walletErr } = await supabase
      .from("wallets")
      .select("id, user_id, available_rwf")
      .eq("id", walletId)
      .single();

    if (walletErr || !wallet || wallet.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Wallet not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentBalance = Number(wallet.available_rwf || 0);

    // Check sufficient balance
    if (currentBalance < amountRwf) {
      return new Response(
        JSON.stringify({ error: `Insufficient balance. Available: ${currentBalance}, Requested: ${amountRwf}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newBalance = currentBalance - amountRwf;
    const withdrawalId = `wallet_withdraw_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Create withdrawal transaction record
    const { data: transaction, error: insertErr } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount_rwf: amountRwf,
        external_transaction_id: withdrawalId,
        payment_method: "pawapay_momo",
        status: "pending",
        description: `Wallet withdrawal to ${phoneNumber}`,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Failed to create withdrawal transaction:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to create withdrawal request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct from available balance
    const { error: updateErr } = await supabase
      .from("wallets")
      .update({ available_rwf: newBalance })
      .eq("id", walletId);

    if (updateErr) {
      console.error("Failed to update wallet balance:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to process withdrawal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Wallet withdrawal initiated: Wallet ${walletId}, Amount: ${amountRwf} RWF, Phone: ${phoneNumber}`);

    // Initiate PawaPay Payout
    try {
      const payoutResponse = await fetch(`${getPawaPayEndpoint()}/payouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PAWAPAY_API_KEY}`,
        },
        body: JSON.stringify({
          payoutId: withdrawalId,
          amount: amountRwf.toString(),
          currency: "RWF",
          country: "RW",
          correspondent: mobileNetwork,
          accountIdentifier: phoneNumber,
          description: `Wallet withdrawal to ${phoneNumber}`,
          correlationId: `wallet_withdrawal_${walletId}`,
          notificationUrl: `${SUPABASE_URL}/functions/v1/wallet-withdrawal-callback`,
        }),
      });

      if (payoutResponse.ok) {
        const payoutData = await payoutResponse.json();
        console.log(`PawaPay payout initiated: ${payoutData.payoutId}`);

        // Update transaction status to "processing"
        const { error: updateErr } = await supabase
          .from("wallet_transactions")
          .update({ status: "processing" })
          .eq("id", transaction.id);

        if (updateErr) {
          console.warn("Failed to update transaction status:", updateErr);
        }
      } else {
        const errorData = await payoutResponse.json();
        console.error("PawaPay payout failed:", errorData);

        // Update transaction status to "failed"
        const { error: updateErr } = await supabase
          .from("wallet_transactions")
          .update({ status: "failed" })
          .eq("id", transaction.id);

        if (updateErr) {
          console.warn("Failed to update transaction status:", updateErr);
        }

        // Refund the amount back to wallet balance
        const { error: refundErr } = await supabase
          .from("wallets")
          .update({ available_rwf: currentBalance })
          .eq("id", walletId);

        if (refundErr) {
          console.error("Failed to refund withdrawal amount:", refundErr);
        }

        return new Response(
          JSON.stringify({ 
            error: "Withdrawal failed. Your balance has been refunded.",
            details: errorData 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (payoutError) {
      console.error("Error initiating PawaPay payout:", payoutError);
      // Don't fail the request - payout will retry via webhook
    }

    return new Response(
      JSON.stringify({
        success: true,
        referenceId: withdrawalId,
        amountRwf,
        newBalance,
        message: `${amountRwf.toLocaleString()} RWF is on the way to +${phoneNumber}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in wallet-withdrawal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

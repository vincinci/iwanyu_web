import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAWAPAY_API_KEY = Deno.env.get("PAWAPAY_API_KEY") || "";
const PAWAPAY_ENV = (Deno.env.get("PAWAPAY_ENV") || "live").trim().toLowerCase();
const PAWAPAY_ENDPOINT = Deno.env.get("PAWAPAY_ENDPOINT") || "https://api.pawapay.io";

function getPawaPayEndpoint(): string {
  const configuredEndpoint = PAWAPAY_ENDPOINT.trim().replace(/\/+$/, "");
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
 * Seller Withdrawal Callback (PawaPay)
 *
 * Called when a seller requests to withdraw their earned money to mobile money.
 * This is triggered from the seller dashboard.
 *
 * POST body (called with seller JWT token):
 * {
 *   vendorId: string,
 *   amountRwf: number,
 *   mobileNetwork: "MTN" | "Airtel" | "Orange",
 *   phoneNumber: string,
 *   reason?: string
 * }
 *
 * This function:
 * 1. Verifies seller authorization (via JWT)
 * 2. Checks if seller has sufficient balance
 * 3. Deducts from vendor payout_balance_rwf
 * 4. Creates withdrawal record with status "pending"
 * 5. Records transaction for audit trail
 * 6. TODO: Initiate mobile money payout via PawaPay API
 * 7. TODO: Update status based on PawaPay response
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
      vendorId: string;
      amountRwf: number;
      mobileNetwork: "MTN" | "Airtel" | "Orange";
      phoneNumber: string;
      reason?: string;
    };

    const { vendorId, amountRwf, mobileNetwork, phoneNumber, reason } = body;

    if (!vendorId || !amountRwf || amountRwf <= 0 || !phoneNumber) {
      return new Response(
        JSON.stringify({ error: "Invalid vendor data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify seller ownership
    const { data: vendor, error: vendorErr } = await supabase
      .from("vendors")
      .select("owner_user_id, payout_balance_rwf")
      .eq("id", vendorId)
      .single();

    if (vendorErr || !vendor || vendor.owner_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Vendor not found or unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentBalance = Number(vendor.payout_balance_rwf || 0);

    // Check sufficient balance
    if (currentBalance < amountRwf) {
      return new Response(
        JSON.stringify({ error: `Insufficient balance. Available: ${currentBalance}, Requested: ${amountRwf}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newBalance = currentBalance - amountRwf;

    // Create withdrawal record with pending status
    const { data: withdrawal, error: insertErr } = await supabase
      .from("seller_withdrawals")
      .insert({
        vendor_id: vendorId,
        amount_rwf: amountRwf,
        mobile_network: mobileNetwork,
        phone_number: phoneNumber,
        status: "pending",
        reason: reason || "Seller withdrawal request",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Failed to create withdrawal record:", insertErr);
      return new Response(
        JSON.stringify({ error: "Failed to create withdrawal request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Deduct from payout balance (temporarily held)
    const { error: updateErr } = await supabase
      .from("vendors")
      .update({ payout_balance_rwf: newBalance })
      .eq("id", vendorId);

    if (updateErr) {
      console.error("Failed to update payout balance:", updateErr);
      return new Response(
        JSON.stringify({ error: "Failed to process withdrawal" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Record transaction
    const { error: txnErr } = await supabase
      .from("seller_withdrawal_transactions")
      .insert({
        withdrawal_id: withdrawal.id,
        vendor_id: vendorId,
        amount_rwf: amountRwf,
        previous_balance_rwf: currentBalance,
        new_balance_rwf: newBalance,
        mobile_network: mobileNetwork,
        phone_number: phoneNumber,
        status: "initiated",
        description: `Withdrawal request: ${reason || "Seller payout"}`,
      });

    if (txnErr) {
      console.warn("Failed to record withdrawal transaction:", txnErr);
    }

    console.log(`Seller withdrawal initiated: Vendor ${vendorId}, Amount: ${amountRwf} RWF, Phone: ${phoneNumber}`);

    // Initiate PawaPay Payout (async - will update status via callback)
    try {
      const payoutResponse = await fetch(`${getPawaPayEndpoint()}/payouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PAWAPAY_API_KEY}`,
        },
        body: JSON.stringify({
          payoutId: withdrawal.id, // Use withdrawal ID as payout ID
          amount: amountRwf.toString(),
          currency: "RWF",
          country: "RW",
          correspondent: mobileNetwork, // MTN, Airtel, Orange
          accountIdentifier: phoneNumber, // Customer's mobile number
          description: `Withdrawal to ${phoneNumber}`,
          correlationId: `withdrawal_${withdrawal.id}`,
          notificationUrl: `${SUPABASE_URL}/functions/v1/seller-payout-callback`,
        }),
      });

      if (payoutResponse.ok) {
        const payoutData = await payoutResponse.json();
        console.log(`PawaPay payout initiated: ${payoutData.payoutId}`);

        // Update withdrawal status to "processing"
        const { error: updateErr } = await supabase
          .from("seller_withdrawals")
          .update({ status: "processing" })
          .eq("id", withdrawal.id);

        if (updateErr) {
          console.warn("Failed to update withdrawal status:", updateErr);
        }
      } else {
        const errorData = await payoutResponse.json();
        console.error("PawaPay payout failed:", errorData);

        // Update withdrawal status to "failed"
        const { error: updateErr } = await supabase
          .from("seller_withdrawals")
          .update({ 
            status: "failed",
          })
          .eq("id", withdrawal.id);

        if (updateErr) {
          console.warn("Failed to update withdrawal status:", updateErr);
        }

        // Refund the amount back to vendor balance
        const { error: refundErr } = await supabase
          .from("vendors")
          .update({ payout_balance_rwf: currentBalance })
          .eq("id", vendorId);

        if (refundErr) {
          console.error("Failed to refund withdrawal amount:", refundErr);
        }
      }
    } catch (payoutError) {
      console.error("Error initiating PawaPay payout:", payoutError);
      // Payout will retry via webhook, so don't fail here
    }

    return new Response(
      JSON.stringify({
        success: true,
        withdrawalId: withdrawal.id,
        amountRwf,
        newBalance,
        status: "pending",
        message: "Withdrawal initiated. You will receive the funds shortly.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in seller-withdrawal-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

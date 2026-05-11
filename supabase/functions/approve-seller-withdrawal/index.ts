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
 * Approve or Reject Seller Withdrawal (Admin only)
 *
 * POST body:
 * {
 *   withdrawalId: string,
 *   action: "approve" | "reject",
 *   reason?: string (for rejection)
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
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify JWT and check admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin" || profile?.email === "bebisdavy@gmail.com";
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      withdrawalId: string;
      action: "approve" | "reject";
      reason?: string;
    };

    const { withdrawalId, action, reason } = body;

    if (!withdrawalId || !action || !["approve", "reject"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch withdrawal
    const { data: withdrawal, error: fetchErr } = await supabase
      .from("seller_withdrawals")
      .select("*")
      .eq("id", withdrawalId)
      .maybeSingle();

    if (fetchErr || !withdrawal) {
      return new Response(JSON.stringify({ error: "Withdrawal not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (withdrawal.status !== "pending_approval") {
      return new Response(
        JSON.stringify({ error: `Withdrawal status is ${withdrawal.status}, cannot ${action}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "reject") {
      // Reject: update status and refund balance
      await supabase
        .from("seller_withdrawals")
        .update({
          status: "rejected",
          reason: reason || "Rejected by admin",
          updated_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      // Refund the amount back to vendor balance
      const { data: vendor } = await supabase
        .from("vendors")
        .select("payout_balance_rwf")
        .eq("id", withdrawal.vendor_id)
        .single();

      const currentBalance = Number(vendor?.payout_balance_rwf || 0);
      const refundedBalance = currentBalance + withdrawal.amount_rwf;

      await supabase
        .from("vendors")
        .update({ payout_balance_rwf: refundedBalance })
        .eq("id", withdrawal.vendor_id);

      // Record transaction
      await supabase
        .from("seller_withdrawal_transactions")
        .insert({
          withdrawal_id: withdrawalId,
          vendor_id: withdrawal.vendor_id,
          amount_rwf: withdrawal.amount_rwf,
          previous_balance_rwf: currentBalance,
          new_balance_rwf: refundedBalance,
          mobile_network: withdrawal.mobile_network,
          phone_number: withdrawal.phone_number,
          status: "rejected",
          description: `Withdrawal rejected: ${reason || "Admin decision"}`,
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: "Withdrawal rejected and balance refunded",
          withdrawalId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Approve: Initiate PawaPay payout
    try {
      const payoutResponse = await fetch(`${getPawaPayEndpoint()}/payouts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${PAWAPAY_API_KEY}`,
        },
        body: JSON.stringify({
          payoutId: withdrawalId,
          amount: withdrawal.amount_rwf.toString(),
          currency: "RWF",
          country: "RW",
          correspondent: withdrawal.mobile_network,
          accountIdentifier: withdrawal.phone_number,
          description: `Seller withdrawal to ${withdrawal.phone_number}`,
          correlationId: `withdrawal_${withdrawalId}`,
          notificationUrl: `${SUPABASE_URL}/functions/v1/seller-payout-callback`,
        }),
      });

      if (payoutResponse.ok) {
        const payoutData = await payoutResponse.json();
        console.log(`PawaPay payout initiated: ${payoutData.payoutId}`);

        // Update withdrawal status to "processing"
        await supabase
          .from("seller_withdrawals")
          .update({
            status: "processing",
            updated_at: new Date().toISOString(),
          })
          .eq("id", withdrawalId);

        return new Response(
          JSON.stringify({
            success: true,
            message: "Withdrawal approved and payout initiated",
            withdrawalId,
            payoutId: payoutData.payoutId,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        const errorData = await payoutResponse.json();
        console.error("PawaPay payout failed:", errorData);

        // Update withdrawal status to "failed"
        await supabase
          .from("seller_withdrawals")
          .update({
            status: "failed",
            reason: `PawaPay error: ${JSON.stringify(errorData)}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", withdrawalId);

        // Refund the amount back to vendor balance
        const { data: vendor } = await supabase
          .from("vendors")
          .select("payout_balance_rwf")
          .eq("id", withdrawal.vendor_id)
          .single();

        const currentBalance = Number(vendor?.payout_balance_rwf || 0);
        await supabase
          .from("vendors")
          .update({ payout_balance_rwf: currentBalance + withdrawal.amount_rwf })
          .eq("id", withdrawal.vendor_id);

        return new Response(
          JSON.stringify({
            error: "PawaPay payout failed",
            details: errorData,
          }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (payoutError) {
      console.error("Error initiating PawaPay payout:", payoutError);

      // Mark failed and refund
      await supabase
        .from("seller_withdrawals")
        .update({
          status: "failed",
          reason: "PawaPay payout initiation error",
          updated_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      const { data: vendor } = await supabase
        .from("vendors")
        .select("payout_balance_rwf")
        .eq("id", withdrawal.vendor_id)
        .single();

      const currentBalance = Number(vendor?.payout_balance_rwf || 0);
      await supabase
        .from("vendors")
        .update({ payout_balance_rwf: currentBalance + withdrawal.amount_rwf })
        .eq("id", withdrawal.vendor_id);

      return new Response(
        JSON.stringify({ error: "Failed to initiate payout" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error in approve-seller-withdrawal:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const PAWAPAY_API_TOKEN = Deno.env.get("PAWAPAY_API_TOKEN") || "";
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

function getPawaPayCredential(): string {
  const token = (PAWAPAY_API_TOKEN || PAWAPAY_API_KEY).trim().replace(/^bearer\s+/i, "").replace(/^['"]+|['"]+$/g, "");
  return token;
}

/**
 * Wallet Withdrawal (PawaPay)
 *
 * POST body (called with user JWT token):
 * {
 *   amountRwf: number,
 *   phoneNumber: string,
 *   mobileNetwork?: string
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
    // Verify authorization
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
      amountRwf: number;
      phoneNumber: string;
      mobileNetwork?: string;
    };

    const { amountRwf, phoneNumber, mobileNetwork } = body;

    if (!amountRwf || amountRwf <= 0 || !phoneNumber?.trim()) {
      return new Response(
        JSON.stringify({ error: "amountRwf and phoneNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch current balance from profiles
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", user.id)
      .single();

    if (profileErr || !profile) {
      return new Response(
        JSON.stringify({ error: "Profile not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentBalance = Number(profile.wallet_balance_rwf || 0);

    if (currentBalance < amountRwf) {
      return new Response(
        JSON.stringify({ error: `Insufficient balance. Available: ${currentBalance} RWF, Requested: ${amountRwf} RWF` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find original deposit transaction (FIFO) for refund
    const { data: depositTxns, error: depositErr } = await supabase
      .from("wallet_transactions")
      .select("id, external_transaction_id, amount_rwf")
      .eq("user_id", user.id)
      .eq("type", "deposit")
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    if (depositErr || !depositTxns || depositTxns.length === 0) {
      return new Response(
        JSON.stringify({ error: "No completed deposits found for refund. Please contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const originalDeposit = depositTxns[0];
    const originalDepositId = originalDeposit.external_transaction_id;

    if (!originalDepositId) {
      return new Response(
        JSON.stringify({ error: "Original deposit has no external transaction ID. Please contact support." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const refundId = crypto.randomUUID();
    const correlationId = `refund-${user.id}-${Date.now()}`;

    // ATOMIC DEDUCT: only deduct if balance is still sufficient (prevents race conditions)
    const { data: deductedRows, error: deductErr } = await supabase
      .from("profiles")
      .update({ wallet_balance_rwf: currentBalance - amountRwf })
      .eq("id", user.id)
      .gte("wallet_balance_rwf", amountRwf)
      .select("id");

    if (deductErr || !deductedRows || deductedRows.length === 0) {
      return new Response(
        JSON.stringify({ error: "Insufficient balance or concurrent update. Please try again." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create withdrawal record using new schema
    const { data: txnRow, error: txnErr } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        type: "withdrawal",
        amount_rwf: amountRwf,
        external_transaction_id: refundId,
        status: "pending",
        metadata: {
          payment_method: "pawapay_refund",
          phone: phoneNumber,
          correlationId,
          original_deposit_id: originalDepositId,
        },
      })
      .select("id")
      .single();

    if (txnErr) {
      console.warn("Failed to create withdrawal transaction record:", txnErr);
    }

    const txnId = txnRow?.id ?? null;
    const credential = getPawaPayCredential();

    if (!credential) {
      // Refund — no PawaPay credentials
      await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: currentBalance })
        .eq("id", user.id);
      if (txnId) {
        await supabase
          .from("wallet_transactions")
          .update({ status: "failed" })
          .eq("id", txnId);
      }
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    // PawaPay V2 refund payload
    const refundPayload = {
      refundId,
      depositId: originalDepositId,
      amount: String(Math.trunc(amountRwf)),
      currency: "RWF",
      notificationUrl: `${SUPABASE_URL}/functions/v1/pawapay-refund-callback`,
    };

    console.log(`Initiating PawaPay refund: ${refundId}, deposit: ${originalDepositId}, phone: ${normalizedPhone}, amount: ${amountRwf}`);

    const refundRes = await fetch(`${getPawaPayEndpoint()}/v2/refunds`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credential}`,
      },
      body: JSON.stringify(refundPayload),
    });

    const refundText = await refundRes.text();
    let refundData: Record<string, unknown> = {};
    try { refundData = refundText ? JSON.parse(refundText) : {}; } catch { /* ignore */ }

    console.log(`PawaPay refund response: HTTP ${refundRes.status}, status=${refundData.status}, body=${refundText.slice(0, 300)}`);

    // PawaPay returns HTTP 200 even for REJECTED refunds — must check body status
    const isRejected = !refundRes.ok || refundData.status === "REJECTED";

    if (isRejected) {
      console.error("PawaPay refund rejected:", refundData);
      // Refund balance
      await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: currentBalance })
        .eq("id", user.id);
      if (txnId) {
        await supabase
          .from("wallet_transactions")
          .update({ status: "failed" })
          .eq("id", txnId);
      }
      const failureReason = refundData.failureReason as Record<string, unknown> | undefined;
      const errMsg = (failureReason?.failureMessage || refundData.message || refundData.error || "Refund rejected by payment provider") as string;
      return new Response(
        JSON.stringify({ error: `Withdrawal failed: ${errMsg}`, details: refundData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Refund initiated: ${refundId}, user: ${user.id}, amount: ${amountRwf}`);

    return new Response(
      JSON.stringify({
        success: true,
        refundId,
        amountRwf,
        newBalance: currentBalance - amountRwf,
        message: `${amountRwf.toLocaleString()} RWF withdrawal initiated to +${normalizedPhone}`,
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

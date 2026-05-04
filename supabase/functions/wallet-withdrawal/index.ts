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

    const payoutId = crypto.randomUUID();
    const correlationId = `withdrawal-${user.id}-${Date.now()}`;

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

    // Create withdrawal record using legacy schema
    const { data: txnRow, error: txnErr } = await supabase
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        kind: "withdrawal",
        amount: amountRwf,
        reference: payoutId,
        metadata: {
          status: "processing",
          payment_method: "pawapay_momo",
          phone: phoneNumber,
          correlationId,
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
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine provider from phone number (Rwanda only)
    // Normalize short names to PawaPay provider IDs
    let provider = (mobileNetwork || "").toUpperCase();
    if (provider === "MTN") provider = "MTN_MOMO_RWA";
    else if (provider === "AIRTEL" || provider === "AIRTELMONEY" || provider === "AIRTEL_OAPI_RWA") provider = "AIRTEL_RWA";

    if (!provider || !provider.includes("_")) {
      // Auto-detect from phone prefix
      const digits = phoneNumber.replace(/\D/g, "");
      if (digits.startsWith("25078") || digits.startsWith("25079")) provider = "MTN_MOMO_RWA";
      else if (digits.startsWith("25073") || digits.startsWith("25072")) provider = "AIRTEL_RWA";
      else provider = "MTN_MOMO_RWA"; // default Rwanda
    }

    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    // PawaPay V2 payout payload
    const payoutPayload = {
      payoutId,
      amount: String(Math.trunc(amountRwf)),
      currency: "RWF",
      recipient: {
        type: "MMO",
        accountDetails: {
          phoneNumber: normalizedPhone,
          provider,
        },
      },
      customerMessage: "Wallet withdrawal",
    };

    console.log(`Initiating PawaPay payout: ${payoutId}, provider: ${provider}, phone: ${normalizedPhone}, amount: ${amountRwf}`);

    const payoutRes = await fetch(`${getPawaPayEndpoint()}/v2/payouts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credential}`,
      },
      body: JSON.stringify(payoutPayload),
    });

    const payoutText = await payoutRes.text();
    let payoutData: Record<string, unknown> = {};
    try { payoutData = payoutText ? JSON.parse(payoutText) : {}; } catch { /* ignore */ }

    console.log(`PawaPay payout response: HTTP ${payoutRes.status}, status=${payoutData.status}, body=${payoutText.slice(0, 300)}`);

    // PawaPay returns HTTP 200 even for REJECTED payouts — must check body status
    const isRejected = !payoutRes.ok || payoutData.status === "REJECTED";

    if (isRejected) {
      console.error("PawaPay payout rejected:", payoutData);
      // Refund balance
      await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: currentBalance })
        .eq("id", user.id);
      if (txnId) {
        const failureCode = (payoutData.failureReason as Record<string, unknown>)?.failureCode as string ?? "UNKNOWN";
        await supabase
          .from("wallet_transactions")
          .update({ metadata: { status: "failed", payment_method: "pawapay_momo", phone: phoneNumber, correlationId, failureCode } })
          .eq("id", txnId);
      }
      const failureReason = payoutData.failureReason as Record<string, unknown> | undefined;
      const errMsg = (failureReason?.failureMessage || payoutData.message || payoutData.error || "Payout rejected by payment provider") as string;
      return new Response(
        JSON.stringify({ error: `Withdrawal failed: ${errMsg}`, details: payoutData }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Payout initiated: ${payoutId}, user: ${user.id}, amount: ${amountRwf}`);

    return new Response(
      JSON.stringify({
        success: true,
        payoutId,
        amountRwf,
        newBalance: currentBalance - amountRwf,
        message: `${amountRwf.toLocaleString()} RWF is on the way to +${normalizedPhone}`,
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

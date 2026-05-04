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

    // Determine correspondent (provider) from phone
    let correspondent = (mobileNetwork || "").toUpperCase();
    if (!correspondent) {
      const digits = phoneNumber.replace(/\D/g, "");
      if (digits.startsWith("25078") || digits.startsWith("25079")) correspondent = "MTN_MOMO_RWA";
      else if (digits.startsWith("25073") || digits.startsWith("25072")) correspondent = "AIRTEL_OAPI_RWA";
      else correspondent = "MTN_MOMO_RWA"; // default
    }
    // Normalize short names to PawaPay correspondent IDs
    if (correspondent === "MTN") correspondent = "MTN_MOMO_RWA";
    if (correspondent === "AIRTEL" || correspondent === "AIRTELMONEY") correspondent = "AIRTEL_OAPI_RWA";

    const normalizedPhone = phoneNumber.replace(/\D/g, "");

    const payoutPayload = {
      payoutId,
      amount: String(Math.trunc(amountRwf)),
      currency: "RWF",
      country: "RWA",
      correspondent,
      recipient: {
        type: "MSISDN",
        address: { value: normalizedPhone },
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: "Wallet withdrawal",
    };

    const payoutRes = await fetch(`${getPawaPayEndpoint()}/v1/payouts`, {
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

    if (!payoutRes.ok) {
      console.error("PawaPay payout failed:", payoutData);
      // Refund balance
      await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: currentBalance })
        .eq("id", user.id);
      if (txnId) {
        await supabase
          .from("wallet_transactions")
          .update({ metadata: { status: "failed", payment_method: "pawapay_momo", phone: phoneNumber, correlationId } })
          .eq("id", txnId);
      }
      const errMsg = (payoutData.message || payoutData.error || "Payout failed") as string;
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

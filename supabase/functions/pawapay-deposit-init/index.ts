import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAWAPAY_API_KEY = Deno.env.get("PAWAPAY_API_KEY") || "";
const PAWAPAY_ENDPOINT = Deno.env.get("PAWAPAY_ENDPOINT") || "https://api.pawapay.cloud";

interface PawaPayDepositRequest {
  amount: number; // Amount in RWF
  currency: "RWF";
  country: "RW";
  correlationId: string; // Order ID for idempotency
  accountIdentifier?: string;
  notificationUrl?: string;
}

interface PawaPayDepositResponse {
  depositId: string;
  status: string;
  requestedAmount: string;
  currency: string;
  authenticationUrl?: string;
  country: string;
}

/**
 * PawaPay Deposit Initialization
 *
 * Initiates a mobile money deposit request with PawaPay
 * Returns depositId and authenticationUrl for user to complete payment
 */
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify auth
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const body: PawaPayDepositRequest = await req.json();
    const { amount, currency, country, correlationId, accountIdentifier, notificationUrl } = body;

    if (!amount || !currency || !country || !correlationId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: amount, currency, country, correlationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currency !== "RWF" || country !== "RW") {
      return new Response(
        JSON.stringify({ error: "Only RWF currency and RW country are supported" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!PAWAPAY_API_KEY) {
      return new Response(
        JSON.stringify({ error: "PawaPay API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create deposit request with PawaPay
    const depositResponse = await fetch(`${PAWAPAY_ENDPOINT}/deposits`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PAWAPAY_API_KEY}`,
      },
      body: JSON.stringify({
        depositId: correlationId, // Use orderId as depositId
        amount: amount.toString(),
        currency: currency,
        country: country,
        accountIdentifier: accountIdentifier,
        correlationId: correlationId,
        notificationUrl: notificationUrl || `https://api.supabase.co/functions/v1/wallet-deposit-callback`,
      }),
    });

    if (!depositResponse.ok) {
      const errorData = await depositResponse.json();
      console.error("PawaPay deposit creation failed:", JSON.stringify(errorData));
      return new Response(
        JSON.stringify({ error: errorData.message || "Failed to create deposit" }),
        { status: depositResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const depositData = (await depositResponse.json()) as PawaPayDepositResponse;

    if (!depositData.depositId) {
      console.error("Invalid PawaPay response:", JSON.stringify(depositData));
      return new Response(
        JSON.stringify({ error: "Invalid response from PawaPay" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        depositId: depositData.depositId,
        status: depositData.status,
        requestedAmount: depositData.requestedAmount,
        currency: depositData.currency,
        authenticationUrl: depositData.authenticationUrl,
        country: depositData.country,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in pawapay-deposit-init:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

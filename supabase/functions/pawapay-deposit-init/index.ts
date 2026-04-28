import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const PAWAPAY_API_KEY = Deno.env.get("PAWAPAY_API_KEY") || "";
const PAWAPAY_API_TOKEN = Deno.env.get("PAWAPAY_API_TOKEN") || "";
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

function getPawaPayCredentials(): string[] {
  return [...new Set([PAWAPAY_API_KEY.trim(), PAWAPAY_API_TOKEN.trim()].filter(Boolean))];
}

async function fetchWithPawaPayAuth(
  path: string,
  body: Record<string, unknown>,
  credentials: string[],
  endpoint: string,
): Promise<Response | null> {
  let response: Response | null = null;

  for (const credential of credentials) {
    response = await fetch(`${endpoint}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${credential}`,
      },
      body: JSON.stringify(body),
    });

    if (response.status !== 401) {
      break;
    }
  }

  return response;
}

interface PawaPayDepositRequest {
  amount: number; // Amount in RWF
  currency: "RWF";
  country: "RW";
  correlationId: string; // Order ID for idempotency
  accountIdentifier?: string;
  notificationUrl?: string;
  returnUrl?: string;
}

interface PawaPayPaymentPageResponse {
  depositId?: string;
  redirectUrl?: string;
}

interface PawaPayPredictProviderResponse {
  country?: string;
  provider?: string;
  phoneNumber?: string;
}

function toAlpha3CountryCode(country: string): string {
  switch (country.trim().toUpperCase()) {
    case "RW":
      return "RWA";
    default:
      return country.trim().toUpperCase();
  }
}

function normalizeMsisdn(value?: string): string | undefined {
  if (!value) return undefined;

  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("250") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `250${digits}`;

  return undefined;
}

/**
 * PawaPay Deposit Initialization
 *
 * Starts a hosted PawaPay payment page session.
 * Returns a redirect URL the customer can be sent to.
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
    const { amount, currency, country, correlationId, accountIdentifier, returnUrl } = body;

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

    const pawaPayCredentials = getPawaPayCredentials();

    if (pawaPayCredentials.length === 0) {
      return new Response(
        JSON.stringify({ error: "PawaPay API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const origin = (req.headers.get("origin") || "https://www.iwanyu.store").replace(/\/+$/, "");
    const depositId = crypto.randomUUID();
    const redirectBackUrl = returnUrl?.trim() || `${origin}/payment-callback?orderId=${encodeURIComponent(correlationId)}`;
    const normalizedMsisdn = normalizeMsisdn(accountIdentifier);
    const pawaPayEndpoint = getPawaPayEndpoint();
    const alpha3Country = toAlpha3CountryCode(country);
    let phoneNumber = normalizedMsisdn;
    let countryCode = alpha3Country;

    if (normalizedMsisdn) {
      const predictResponse = await fetchWithPawaPayAuth(
        "/v2/predict-provider",
        { phoneNumber: normalizedMsisdn },
        pawaPayCredentials,
        pawaPayEndpoint,
      );

      if (!predictResponse) {
        return new Response(
          JSON.stringify({ error: "Failed to validate mobile money number" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!predictResponse.ok) {
        const predictError = await predictResponse.text();
        console.error("PawaPay provider prediction failed:", predictError);

        return new Response(
          JSON.stringify({ error: "Invalid or unsupported mobile money number" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const predicted = (await predictResponse.json()) as PawaPayPredictProviderResponse;
      phoneNumber = predicted.phoneNumber || normalizedMsisdn;
      countryCode = predicted.country || alpha3Country;
    }

    const paymentPagePayload: Record<string, unknown> = {
      depositId,
      returnUrl: redirectBackUrl,
      notificationUrl: `${SUPABASE_URL}/functions/v1/wallet-deposit-callback`,
      amountDetails: {
        amount: amount.toString(),
        currency,
      },
      customerMessage: correlationId.startsWith("wallet-") ? "Wallet deposit" : "Order payment",
      reason: correlationId.startsWith("wallet-") ? "Wallet deposit" : `Order ${correlationId}`,
    };

    if (phoneNumber) {
      paymentPagePayload.phoneNumber = phoneNumber;
      paymentPagePayload.country = countryCode;
    } else {
      paymentPagePayload.country = countryCode;
    }

    const depositResponse = await fetchWithPawaPayAuth(
      "/v2/paymentpage",
      paymentPagePayload,
      pawaPayCredentials,
      pawaPayEndpoint,
    );

    if (!depositResponse) {
      return new Response(
        JSON.stringify({ error: "Failed to initialize PawaPay request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!depositResponse.ok) {
      const errorText = await depositResponse.text();
      console.error("PawaPay payment page creation failed:", errorText);

      let errorMessage = depositResponse.statusText?.trim() || `PawaPay request failed with ${depositResponse.status}`;
      try {
        const parsed = JSON.parse(errorText) as { message?: string; error?: string };
        errorMessage = parsed.message || parsed.error || errorMessage;
      } catch {
        if (errorText.trim()) errorMessage = errorText;
      }

      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: depositResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const depositData = (await depositResponse.json()) as PawaPayPaymentPageResponse;

    if (!depositData.redirectUrl) {
      console.error("Invalid PawaPay response:", JSON.stringify(depositData));
      return new Response(
        JSON.stringify({ error: "Invalid response from PawaPay" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        depositId: depositData.depositId || depositId,
        status: "PROCESSING",
        requestedAmount: amount.toString(),
        currency,
        authenticationUrl: depositData.redirectUrl,
        country,
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

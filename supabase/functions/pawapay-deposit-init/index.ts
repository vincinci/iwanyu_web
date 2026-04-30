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
    try {
      response = await fetch(`${endpoint}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${credential}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      console.warn(`PawaPay fetch failed for ${path}:`, error);
      response = null;
      continue;
    }

    if (response.status !== 401) {
      break;
    }
  }

  return response;
}

async function createPaymentPageWithFallback(
  basePayload: Record<string, unknown>,
  options: { phoneNumber?: string; alpha2Country: string; alpha3Country: string },
  credentials: string[],
  endpoint: string,
): Promise<{ response: Response | null; attemptName: string; errors: string[] }> {
  const attempts: Array<{ name: string; payload: Record<string, unknown> }> = [];
  const { phoneNumber, alpha2Country, alpha3Country } = options;

  if (phoneNumber) {
    attempts.push({
      name: "phone+alpha2",
      payload: { ...basePayload, phoneNumber, country: alpha2Country },
    });
    attempts.push({
      name: "phone+alpha3",
      payload: { ...basePayload, phoneNumber, country: alpha3Country },
    });
  }

  attempts.push({
    name: "no-phone+alpha2",
    payload: { ...basePayload, country: alpha2Country },
  });
  attempts.push({
    name: "no-phone+alpha3",
    payload: { ...basePayload, country: alpha3Country },
  });

  const errors: string[] = [];

  for (const attempt of attempts) {
    const response = await fetchWithPawaPayAuth("/v2/paymentpage", attempt.payload, credentials, endpoint);
    if (!response) {
      errors.push(`${attempt.name}: no response`);
      continue;
    }

    if (response.ok) {
      return { response, attemptName: attempt.name, errors };
    }

    const body = await response.text();
    errors.push(`${attempt.name}: ${response.status} ${body}`);
  }

  return { response: null, attemptName: "none", errors };
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

function toAlpha2CountryCode(country?: string): string {
  if (!country) return "RW";
  const normalized = country.trim().toUpperCase();
  switch (normalized) {
    case "RWA":
      return "RW";
    default:
      return normalized;
  }
}

function normalizeMsisdn(value?: string): string | undefined {
  if (!value) return undefined;

  const digits = value.replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("250") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+250${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `+250${digits}`;

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

  let step = "init";
  try {
    // Verify auth
    step = "auth.header";
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    step = "request.parse";
    const body: PawaPayDepositRequest = await req.json();
    const { amount, currency, country, correlationId, accountIdentifier, returnUrl } = body;

    step = "request.validate";
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

    step = "credentials";
    const pawaPayCredentials = getPawaPayCredentials();

    if (pawaPayCredentials.length === 0) {
      return new Response(
        JSON.stringify({ error: "PawaPay API credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    step = "payload.prepare";
    const origin = (req.headers.get("origin") || "https://www.iwanyu.store").replace(/\/+$/, "");
    const depositId = crypto.randomUUID();
    const redirectBackUrl = returnUrl?.trim() || `${origin}/payment-callback?orderId=${encodeURIComponent(correlationId)}`;
    const normalizedMsisdn = normalizeMsisdn(accountIdentifier);
    const pawaPayEndpoint = getPawaPayEndpoint();
    const alpha3Country = toAlpha3CountryCode(country);
    const alpha2Country = toAlpha2CountryCode(country);
    let phoneNumber = normalizedMsisdn;
    let countryCode = alpha2Country;

    if (normalizedMsisdn) {
      step = "provider.predict";
      console.log("PawaPay: Predicting provider for phone:", normalizedMsisdn);
      const predictResponse = await fetchWithPawaPayAuth(
        "/v2/predict-provider",
        { phoneNumber: normalizedMsisdn },
        pawaPayCredentials,
        pawaPayEndpoint,
      );

      if (!predictResponse) {
        console.warn("PawaPay provider prediction unavailable; continuing with normalized phone.");
      } else if (!predictResponse.ok) {
        const predictError = await predictResponse.text();
        console.warn("PawaPay provider prediction failed; continuing with normalized phone:", predictError);
      } else {
        const predicted = (await predictResponse.json()) as PawaPayPredictProviderResponse;
        console.log("PawaPay: Provider prediction result:", predicted);
        phoneNumber = normalizeMsisdn(predicted.phoneNumber) || normalizedMsisdn;
        countryCode = toAlpha2CountryCode(predicted.country || alpha2Country);
      }
    }

    step = "payment_page.init";
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

    console.log("PawaPay: Creating payment page with fallback attempts");

    step = "payment_page.request";
    const attemptResult = await createPaymentPageWithFallback(
      paymentPagePayload,
      {
        phoneNumber,
        alpha2Country: countryCode,
        alpha3Country,
      },
      pawaPayCredentials,
      pawaPayEndpoint,
    );

    if (!attemptResult.response) {
      return new Response(
        JSON.stringify({
          error: `[pawapay-deposit-init:${step}] Failed to initialize PawaPay request`,
          details: attemptResult.errors.slice(-2),
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const depositResponse = attemptResult.response;

    if (!depositResponse.ok) {
      step = "payment_page.response";
      const errorText = await depositResponse.text();
      console.error("PawaPay payment page creation failed:", errorText);

      // Try to extract specific error message from PawaPay response
      let errorMessage = depositResponse.statusText?.trim() || `PawaPay request failed with ${depositResponse.status}`;
      try {
        const parsed = JSON.parse(errorText) as { message?: string; error?: string; errorMessage?: string; detail?: string; errors?: unknown[] };
        // PawaPay may return errors in different formats
        errorMessage = parsed.message || parsed.error || parsed.errorMessage || parsed.detail || errorMessage;
        
        // Check for field-specific errors
        if (parsed.errors && Array.isArray(parsed.errors) && parsed.errors.length > 0) {
          const firstError = parsed.errors[0];
          if (typeof firstError === "object" && firstError !== null) {
            const errObj = firstError as Record<string, unknown>;
            errorMessage = String(errObj.message || errObj.error || errorMessage);
          }
        }
      } catch {
        if (errorText.trim()) errorMessage = errorText;
      }

      return new Response(
        JSON.stringify({ error: `[pawapay-deposit-init:${step}] ${errorMessage}`, code: depositResponse.status }),
        { status: depositResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    step = "payment_page.parse";
    const depositData = (await depositResponse.json()) as PawaPayPaymentPageResponse;

    console.log("PawaPay: payment page created via attempt:", attemptResult.attemptName);

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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Error in pawapay-deposit-init:", { step, error: errorMessage });
    return new Response(
      JSON.stringify({ error: `[pawapay-deposit-init:${step}] ${errorMessage}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

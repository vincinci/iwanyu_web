import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
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

function getPawaPayEndpoints(): string[] {
  const primary = getPawaPayEndpoint();
  const live = "https://api.pawapay.io";
  const sandbox = "https://api.sandbox.pawapay.io";

  if (primary === sandbox) return [sandbox, live];
  if (primary === live) return [live, sandbox];

  const defaultEndpoint = PAWAPAY_ENV === "sandbox" ? sandbox : live;
  const alternate = defaultEndpoint === sandbox ? live : sandbox;
  return [...new Set([primary, defaultEndpoint, alternate])];
}

function normalizePawaPayCredential(raw: string): string {
  let token = raw.trim();
  token = token.replace(/^bearer\s+/i, "");
  token = token.replace(/^['\"]+|['\"]+$/g, "");
  return token.trim();
}

function getPawaPayCredentials(): string[] {
  // Prefer API token, but gracefully fall back to legacy API key if present.
  return [...new Set([PAWAPAY_API_TOKEN, PAWAPAY_API_KEY]
    .map(normalizePawaPayCredential)
    .filter(Boolean))];
}

async function fetchWithPawaPayAuth(
  path: string,
  body: Record<string, unknown>,
  credentials: string[],
  endpoints: string[],
): Promise<Response | null> {
  let lastResponse: Response | null = null;

  for (const endpoint of endpoints) {
    for (const credential of credentials) {
      try {
        lastResponse = await fetch(`${endpoint}${path}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${credential}`,
          },
          body: JSON.stringify(body),
        });
      } catch (error) {
        console.warn(`PawaPay fetch failed for ${path}:`, error);
        lastResponse = null;
        continue;
      }

      if (lastResponse.status !== 401) {
        return lastResponse;
      }
    }
  }

  return lastResponse;
}

interface PawaPayDepositRequest {
  amount: number; // Amount in RWF
  currency: "RWF";
  country: string;
  correlationId: string; // Order ID for idempotency
  accountIdentifier?: string;
  provider?: string;
  notificationUrl?: string;
  returnUrl?: string;
}

interface PawaPayInitiateDepositResponse {
  depositId?: string;
  status?: "ACCEPTED" | "REJECTED" | "DUPLICATE_IGNORED" | string;
  created?: string;
  failureReason?: unknown;
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
  // pawaPay expects MSISDN as digits only (no '+' prefix)
  if (digits.startsWith("250") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `250${digits}`;

  return undefined;
}

function isUuidV4(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

/**
 * PawaPay Deposit Initialization
 *
 * Initiates a direct deposit request with PawaPay.
 * No hosted payment page redirect is required for most MMO providers.
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

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    step = "auth.user";
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

    // Parse request body
    step = "request.parse";
    const body: PawaPayDepositRequest = await req.json();
    const { amount, currency, country, correlationId, accountIdentifier } = body;

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

    if (!accountIdentifier?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required field: accountIdentifier" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
    // If correlationId is already a UUID (e.g. orderId), reuse it for idempotency.
    // Otherwise generate a new UUID for this payment session.
    const depositId = isUuidV4(correlationId) ? correlationId : crypto.randomUUID();
    const normalizedMsisdn = normalizeMsisdn(accountIdentifier);
    const pawaPayEndpoints = getPawaPayEndpoints();
    const alpha3Country = toAlpha3CountryCode(country);
    if (!normalizedMsisdn) {
      return new Response(
        JSON.stringify({ error: "Invalid phone number format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requestedProvider = String(body?.provider ?? "").trim();
    let provider = requestedProvider;
    let predictedPhone = normalizedMsisdn;
    let predictedCountry = alpha3Country;

    if (!provider) {
      step = "provider.predict";
      console.log("PawaPay: Predicting provider for phone:", normalizedMsisdn);
      const predictResponse = await fetchWithPawaPayAuth(
        "/v2/predict-provider",
        { phoneNumber: normalizedMsisdn },
        pawaPayCredentials,
        pawaPayEndpoints,
      );

      if (!predictResponse) {
        return new Response(
          JSON.stringify({ error: "Failed to reach PawaPay provider prediction" }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const predictRaw = await predictResponse.text();
      let predicted: PawaPayPredictProviderResponse = {};
      try {
        predicted = predictRaw ? (JSON.parse(predictRaw) as PawaPayPredictProviderResponse) : {};
      } catch {
        predicted = {};
      }

      if (!predictResponse.ok) {
        return new Response(
          JSON.stringify({
            error: "PawaPay provider prediction failed",
            details: predictRaw || predicted,
          }),
          { status: predictResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      provider = (predicted.provider ?? "").toString().trim();
      predictedPhone = normalizeMsisdn(predicted.phoneNumber) || normalizedMsisdn;
      predictedCountry = toAlpha3CountryCode(predicted.country || alpha3Country);
    }

    step = "deposit.init";
    const phoneToUse = predictedPhone || normalizedMsisdn;

    if (!provider) {
      return new Response(
        JSON.stringify({
          error: "Unable to determine mobile money provider for this phone number.",
          details: { phoneNumber: predictedPhone, country: predictedCountry },
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const customerMessage = correlationId.startsWith("wallet-") ? "Wallet deposit" : "Order payment";

    const depositPayload: Record<string, unknown> = {
      depositId,
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: phoneToUse,
          provider,
        },
      },
      amount: Math.trunc(amount).toString(),
      currency,
      clientReferenceId: isUuidV4(correlationId) ? correlationId : depositId,
      customerMessage,
    };

    if (isUuidV4(correlationId)) {
      depositPayload.metadata = [{ orderId: correlationId }];
    } else {
      depositPayload.metadata = [{ correlationId }];
    }

    step = "deposit.request";
    const depositResponse = await fetchWithPawaPayAuth(
      "/v2/deposits",
      depositPayload,
      pawaPayCredentials,
      pawaPayEndpoints,
    );

    if (!depositResponse) {
      return new Response(
        JSON.stringify({ error: `[pawapay-deposit-init:${step}] Failed to reach PawaPay` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const rawText = await depositResponse.text();
    let parsed: PawaPayInitiateDepositResponse = {};
    try {
      parsed = rawText ? (JSON.parse(rawText) as PawaPayInitiateDepositResponse) : {};
    } catch {
      parsed = {};
    }

    if (!depositResponse.ok) {
      return new Response(
        JSON.stringify({
          error: `[pawapay-deposit-init:${step}] PawaPay API error: ${depositResponse.status}`,
          details: rawText || parsed,
        }),
        { status: depositResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const initStatus = String(parsed.status ?? "").trim().toUpperCase();
    if (initStatus === "REJECTED") {
      return new Response(
        JSON.stringify({
          error: "PawaPay rejected the deposit request",
          details: parsed.failureReason ?? parsed,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ACCEPTED or DUPLICATE_IGNORED -> treat as PROCESSING.
    return new Response(
      JSON.stringify({
        success: true,
        depositId: parsed.depositId || depositId,
        status: "PROCESSING",
        requestedAmount: Math.trunc(amount).toString(),
        currency,
        country,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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

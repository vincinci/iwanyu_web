/**
 * PawaPay Mobile Money Payment Integration
 * Handles deposit initiation for African mobile money (MTN, Airtel, Orange)
 */

import { CountryCode } from "@/lib/region";

export type PawaPayDepositParams = {
  amount: number; // Amount in smallest currency unit
  currency: "RWF";
  country: CountryCode; // Supported country code for payment methods
  accountIdentifier?: string; // Phone number or wallet ID
  provider?: string; // Optional selected mobile money provider
  correlationId: string; // Unique ID for idempotency (e.g., orderId)
  notificationUrl?: string; // Webhook callback URL
  returnUrl?: string; // Where the customer should be sent after payment page
};

export type PawaPayDepositResponse = {
  depositId: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAmount: string;
  currency: string;
  authenticationUrl?: string; // Redirect URL for user authentication
  authorizationUrl?: string; // Redirect-auth URL (some providers)
  country: string;
  failureReason?: { failureCode?: string; failureMessage?: string };
};

/**
 * Initialize deposit by calling edge function which creates a PawaPay deposit request
 * Returns depositId and authentication URL
 */
export async function initializePawaPayDeposit(
  params: PawaPayDepositParams,
  accessToken: string
): Promise<PawaPayDepositResponse | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables not configured");
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/pawapay-deposit-init`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(params),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    // Try to parse PawaPay error response for meaningful message
    try {
      const parsed = JSON.parse(errorText) as {
        error?: string;
        message?: string;
        errorMessage?: string;
        details?: unknown;
      };

      const errorMsg = parsed.error || parsed.message || parsed.errorMessage || errorText;
      const details = parsed.details;

      let detailsText = "";
      if (typeof details === "string") {
        detailsText = details.trim();
      } else if (Array.isArray(details)) {
        detailsText = details.map((d) => (typeof d === "string" ? d : JSON.stringify(d))).join("; ");
      } else if (details && typeof details === "object") {
        detailsText = JSON.stringify(details);
      }

      const combined = detailsText ? `${errorMsg} — ${detailsText}` : errorMsg;
      throw new Error(combined);
    } catch (e) {
      if (e instanceof Error) throw e;
      throw new Error(`Deposit initialization failed: ${errorText}`);
    }
  }

  const data = await response.json() as PawaPayDepositResponse;
  return data;
}

/**
 * Redirect to PawaPay authentication URL
 * User will authenticate with their mobile network and confirm payment
 */
export function redirectToPawaPay(authenticationUrl: string): void {
  window.location.href = authenticationUrl;
}

/**
 * Get deposit status from PawaPay
 * Useful for polling or checking payment status
 */
export async function checkDepositStatus(
  depositId: string,
  accessToken: string
): Promise<PawaPayDepositResponse | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables not configured");
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/pawapay-deposit-status`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ depositId }),
    }
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json() as PawaPayDepositResponse;
  return data;
}

/**
 * PawaPay Mobile Money Payment Integration
 * Handles deposit initiation for African mobile money (MTN, Airtel, Orange)
 */

export type PawaPayDepositParams = {
  amount: number; // Amount in RWF
  currency: "RWF";
  country: "RW"; // Rwanda
  accountIdentifier?: string; // Phone number or wallet ID
  correlationId: string; // Unique ID for idempotency (e.g., orderId)
  notificationUrl?: string; // Webhook callback URL
};

export type PawaPayDepositResponse = {
  depositId: string;
  status: "PROCESSING" | "COMPLETED" | "FAILED";
  requestedAmount: string;
  currency: string;
  authenticationUrl?: string; // Redirect URL for user authentication
  country: string;
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
    throw new Error(`Deposit initialization failed: ${errorText}`);
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

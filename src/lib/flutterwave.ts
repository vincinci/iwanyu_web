/**
 * Flutterwave V3 Payment Integration
 * Uses redirect-based checkout with V3 Standard API
 */

export type FlutterwavePaymentParams = {
  txRef: string;
  amount: number;
  currency: "RWF";
  customer: {
    email: string;
    name?: string;
    phone_number?: string;
  };
  redirectUrl: string;
  paymentOptions?: string;
  customizations?: {
    title?: string;
    description?: string;
    logo?: string;
  };
};

/**
 * Initialize payment by calling our Edge Function which creates a Flutterwave payment link
 */
export async function initializeFlutterwavePayment(
  params: FlutterwavePaymentParams,
  accessToken: string
): Promise<{ paymentLink: string } | null> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables not configured");
  }

  const response = await fetch(
    `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/flutterwave-init`,
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
    throw new Error(`Payment initialization failed: ${errorText}`);
  }

  const data = await response.json();
  return data.paymentLink ? { paymentLink: data.paymentLink } : null;
}

/**
 * Redirect to Flutterwave hosted checkout
 */
export function redirectToFlutterwave(paymentLink: string): void {
  window.location.href = paymentLink;
}

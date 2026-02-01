/**
 * Flutterwave V4 Payment Integration











































































































































});  }    );      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),    return new Response(    console.error("Error in flutterwave-init:", error);  } catch (error) {    );      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }      }),        txRef: txRef,        paymentLink: paymentData.data.link,        success: true,      JSON.stringify({    return new Response(    }      );        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }        JSON.stringify({ error: "Payment link not generated", details: paymentData.message }),      return new Response(    if (paymentData.status !== "success" || !paymentData.data?.link) {    const paymentData = await paymentResponse.json();    }      );        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }        JSON.stringify({ error: "Failed to create payment session" }),      return new Response(      console.error("Flutterwave payment creation failed:", errorText);      const errorText = await paymentResponse.text();    if (!paymentResponse.ok) {    });      }),        },          logo: customizations?.logo || "https://www.iwanyu.store/logo.png",          description: customizations?.description || `Order ${txRef}`,          title: customizations?.title || "iwanyu",        customizations: {        },          phone_number: customer.phone_number || "",          name: customer.name || customer.email,          email: customer.email,        customer: {        payment_options: paymentOptions || "card,mobilemoney",        redirect_url: redirectUrl,        currency: currency,        amount: amount,        tx_ref: txRef,      body: JSON.stringify({      },        Authorization: `Bearer ${accessToken}`,        "Content-Type": "application/json",      headers: {      method: "POST",    const paymentResponse = await fetch("https://api.flutterwave.com/v4/payments", {    // Create payment link using V4 API    const accessToken = await getAccessToken();    // Get Flutterwave access token    }      );        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }        JSON.stringify({ error: "Missing required fields: txRef, amount, currency, customer.email, redirectUrl" }),      return new Response(    if (!txRef || !amount || !currency || !customer?.email || !redirectUrl) {    const { txRef, amount, currency, customer, redirectUrl, paymentOptions, customizations } = body;    const body: InitPaymentRequest = await req.json();    // Parse request body    }      });        headers: { ...corsHeaders, "Content-Type": "application/json" },        status: 401,      return new Response(JSON.stringify({ error: "Missing authorization header" }), {    if (!authHeader) {    const authHeader = req.headers.get("authorization");    // Verify auth  try {  }    return new Response("ok", { headers: corsHeaders });  if (req.method === "OPTIONS") {  // Handle CORS preflightDeno.serve(async (req: Request) => {}  return data.data.access_token;  const data = await response.json();  }    throw new Error("Failed to authenticate with Flutterwave");    console.error("Failed to get Flutterwave access token:", errorText);    const errorText = await response.text();  if (!response.ok) {  });    }),      client_secret: FLUTTERWAVE_CLIENT_SECRET,      client_id: FLUTTERWAVE_CLIENT_ID,    body: JSON.stringify({    },      "Content-Type": "application/json",    headers: {    method: "POST",  const response = await fetch("https://api.flutterwave.com/v4/auth/token", {async function getAccessToken(): Promise<string> {// Get access token from Flutterwave V4 API}  };    logo?: string;    description?: string;    title?: string;  customizations?: {  paymentOptions?: string;  redirectUrl: string;  };    phone_number?: string;    name?: string;    email: string;  customer: {  currency: "RWF";  amount: number;  txRef: string;interface InitPaymentRequest {const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";const FLUTTERWAVE_CLIENT_SECRET = Deno.env.get("FLUTTERWAVE_CLIENT_SECRET") || "";const FLUTTERWAVE_CLIENT_ID = Deno.env.get("FLUTTERWAVE_CLIENT_ID") || "";// V4 API credentials * Uses redirect-based checkout with V4 API
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

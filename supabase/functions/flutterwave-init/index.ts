import { corsHeaders } from "../_shared/cors.ts";

// V4 API credentials
const FLUTTERWAVE_CLIENT_ID = Deno.env.get("FLUTTERWAVE_CLIENT_ID") || "";
const FLUTTERWAVE_CLIENT_SECRET = Deno.env.get("FLUTTERWAVE_CLIENT_SECRET") || "";

interface InitPaymentRequest {
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
}

// Get access token from Flutterwave V4 API
async function getAccessToken(): Promise<string> {
  const response = await fetch("https://api.flutterwave.com/v4/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: FLUTTERWAVE_CLIENT_ID,
      client_secret: FLUTTERWAVE_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to get Flutterwave access token:", errorText);
    throw new Error("Failed to authenticate with Flutterwave");
  }

  const data = await response.json();
  return data.data.access_token;
}

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
    const body: InitPaymentRequest = await req.json();
    const { txRef, amount, currency, customer, redirectUrl, paymentOptions, customizations } = body;

    if (!txRef || !amount || !currency || !customer?.email || !redirectUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: txRef, amount, currency, customer.email, redirectUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Flutterwave access token
    const accessToken = await getAccessToken();

    // Create payment link using V4 API
    const paymentResponse = await fetch("https://api.flutterwave.com/v4/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount,
        currency: currency,
        redirect_url: redirectUrl,
        payment_options: paymentOptions || "card,mobilemoney",
        customer: {
          email: customer.email,
          name: customer.name || customer.email,
          phone_number: customer.phone_number || "",
        },
        customizations: {
          title: customizations?.title || "iwanyu",
          description: customizations?.description || `Order ${txRef}`,
          logo: customizations?.logo || "https://www.iwanyu.store/logo.png",
        },
      }),
    });

    if (!paymentResponse.ok) {
      const errorText = await paymentResponse.text();
      console.error("Flutterwave payment creation failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to create payment session" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const paymentData = await paymentResponse.json();

    if (paymentData.status !== "success" || !paymentData.data?.link) {
      return new Response(
        JSON.stringify({ error: "Payment link not generated", details: paymentData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        paymentLink: paymentData.data.link,
        txRef: txRef,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in flutterwave-init:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

import { corsHeaders } from "../_shared/cors.ts";

// V3 API - uses secret key directly
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";

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

    if (!FLUTTERWAVE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Flutterwave secret key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment using Flutterwave Standard V3 API
    const paymentResponse = await fetch("https://api.flutterwave.com/v3/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
      },
      body: JSON.stringify({
        tx_ref: txRef,
        amount: amount,
        currency: currency,
        redirect_url: redirectUrl,
        payment_options: paymentOptions || "card,mobilemoneyrwanda",
        customer: {
          email: customer.email,
          name: customer.name || customer.email,
          phonenumber: customer.phone_number || "",
        },
        customizations: {
          title: customizations?.title || "iwanyu",
          description: customizations?.description || `Order ${txRef}`,
          logo: customizations?.logo || "https://www.iwanyu.store/logo.png",
        },
      }),
    });

    const paymentData = await paymentResponse.json();

    if (paymentData.status !== "success" || !paymentData.data?.link) {
      console.error("Flutterwave payment creation failed:", JSON.stringify(paymentData));
      return new Response(
        JSON.stringify({ error: paymentData.message || "Failed to create payment session" }),
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

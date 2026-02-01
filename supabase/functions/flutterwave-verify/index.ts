import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// V4 API credentials
const FLUTTERWAVE_CLIENT_ID = Deno.env.get("FLUTTERWAVE_CLIENT_ID") || "";
const FLUTTERWAVE_CLIENT_SECRET = Deno.env.get("FLUTTERWAVE_CLIENT_SECRET") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface VerifyRequest {
  orderId: string;
  transactionId: string;
  expectedAmount: number;
}

interface FlutterwaveVerifyResponse {
  status: string;
  message: string;
  data?: {
    id: number;
    tx_ref: string;
    amount: number;
    currency: string;
    status: string;
    payment_type: string;
    created_at: string;
    customer: {
      email: string;
      name?: string;
      phone_number?: string;
    };
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
    const body: VerifyRequest = await req.json();
    const { orderId, transactionId, expectedAmount } = body;

    if (!orderId || !transactionId || !expectedAmount) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderId, transactionId, expectedAmount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Flutterwave access token for V4 API
    const accessToken = await getAccessToken();

    // Verify transaction with Flutterwave V4 API
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v4/transactions/${transactionId}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!flwResponse.ok) {
      const errorText = await flwResponse.text();
      console.error("Flutterwave verification failed:", errorText);
      return new Response(
        JSON.stringify({ error: "Failed to verify transaction with Flutterwave" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const flwData: FlutterwaveVerifyResponse = await flwResponse.json();

    // Validate the transaction
    if (flwData.status !== "success" || !flwData.data) {
      return new Response(
        JSON.stringify({ error: "Transaction verification failed", details: flwData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const txData = flwData.data;

    // Verify the transaction matches our order
    if (txData.tx_ref !== orderId) {
      return new Response(
        JSON.stringify({ error: "Transaction reference mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (txData.status !== "successful") {
      return new Response(
        JSON.stringify({ error: `Transaction not successful. Status: ${txData.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (txData.amount < expectedAmount) {
      return new Response(
        JSON.stringify({ error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${txData.amount}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (txData.currency !== "RWF") {
      return new Response(
        JSON.stringify({ error: `Currency mismatch. Expected: RWF, Got: ${txData.currency}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order status in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        status: "Processing",
        payment: {
          verified: true,
          transaction_id: transactionId,
          payment_type: txData.payment_type,
          verified_at: new Date().toISOString(),
          flutterwave_status: txData.status,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    if (updateError) {
      console.error("Failed to update order:", updateError);
      return new Response(
        JSON.stringify({ error: "Payment verified but failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order items to Processing
    const { error: itemsError } = await supabase
      .from("order_items")
      .update({
        status: "Processing",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

    if (itemsError) {
      console.error("Failed to update order items:", itemsError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Payment verified successfully",
        orderId,
        transactionId,
        amount: txData.amount,
        currency: txData.currency,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in flutterwave-verify:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

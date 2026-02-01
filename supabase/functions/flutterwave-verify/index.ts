import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

// V3 API - uses secret key directly
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

interface VerifyRequest {
  orderId: string;
  transactionId: string;
  expectedAmount: number;
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

    // Verify transaction with Flutterwave V3 API
    const flwResponse = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
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

    const flwData = await flwResponse.json();

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
    await supabase
      .from("order_items")
      .update({
        status: "Processing",
        updated_at: new Date().toISOString(),
      })
      .eq("order_id", orderId);

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

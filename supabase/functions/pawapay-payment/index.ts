import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { orderId, phoneNumber } = await req.json();

    if (!orderId || !phoneNumber) {
      throw new Error("Order ID and phone number required");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Get order
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    if (order.status !== "pending") {
      throw new Error("Order already processed");
    }

    const transactionId = `pay_${Date.now()}_${orderId}`;

    // Initiate PawaPay deposit for order payment
    const pawapayResponse = await fetch("https://api.pawapay.io/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("PAWAPAY_API_KEY")}`,
      },
      body: JSON.stringify({
        depositId: transactionId,
        amount: order.total_amount.toString(),
        currency: "ZMW",
        correspondent: "MTN_MOMO_RWA", // Rwanda MTN Mobile Money
        payer: {
          type: "MSISDN",
          address: {
            value: phoneNumber,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: `Order ${orderId}`,
      }),
    });

    if (!pawapayResponse.ok) {
      const error = await pawapayResponse.text();
      throw new Error(`PawaPay error: ${error}`);
    }

    const pawapayData = await pawapayResponse.json();

    // Update order with transaction ID
    await supabaseClient
      .from("orders")
      .update({
        transaction_id: transactionId,
        payment_method: "mobile_money",
        payment_provider: "pawapay",
        payment_phone: phoneNumber,
      })
      .eq("id", orderId);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId,
        message: "Payment initiated. Check your phone to complete payment.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

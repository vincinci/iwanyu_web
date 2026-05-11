import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("Payment callback:", payload);

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { depositId, status } = payload;

    // Find order by transaction ID
    const { data: order, error: orderError } = await supabaseClient
      .from("orders")
      .select("*")
      .eq("transaction_id", depositId)
      .single();

    if (orderError || !order) {
      throw new Error("Order not found");
    }

    // Update order status
    if (status === "COMPLETED") {
      await supabaseClient
        .from("orders")
        .update({
          status: "confirmed",
          payment_status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("id", order.id);
    } else if (status === "FAILED") {
      await supabaseClient
        .from("orders")
        .update({
          status: "cancelled",
          payment_status: "failed",
        })
        .eq("id", order.id);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Callback error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }
});

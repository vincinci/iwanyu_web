import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

// V3 API - uses secret key directly
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

interface VerifyRequest {
  orderId: string;
  transactionId: string;
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
    const { orderId, transactionId } = body;

    if (!orderId || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: orderId, transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // ── Idempotency check: if already verified, return success immediately ──
    const { data: existingOrder, error: fetchErr } = await supabase
      .from("orders")
      .select("id, total_rwf, status, payment_verified_at, discount_code, buyer_email")
      .eq("id", orderId)
      .maybeSingle();

    if (fetchErr || !existingOrder) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existingOrder.payment_verified_at) {
      // Already verified – idempotent success
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already verified",
          orderId,
          alreadyVerified: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Read expected amount from DB, not from client ──
    const expectedAmount = existingOrder.total_rwf;

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

    // Compare against server-stored expected amount
    if (txData.amount < expectedAmount) {
      return new Response(
        JSON.stringify({ error: `Amount mismatch. Expected: ${expectedAmount}, Got: ${txData.amount}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Update order with idempotency guard (payment_verified_at IS NULL) ──
    const verifiedAt = new Date().toISOString();
    const { data: updatedRows, error: updateError } = await supabase
      .from("orders")
      .update({
        status: "Processing",
        payment_verified_at: verifiedAt,
        payment: {
          verified: true,
          transaction_id: transactionId,
          payment_type: txData.payment_type,
          verified_at: verifiedAt,
          flutterwave_status: txData.status,
        },
        updated_at: verifiedAt,
      })
      .eq("id", orderId)
      .is("payment_verified_at", null)   // idempotency: only update if not yet verified
      .select("id");

    if (updateError) {
      console.error("Failed to update order:", updateError);
      return new Response(
        JSON.stringify({ error: "Payment verified but failed to update order" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If no rows were updated, another request already verified this order
    if (!updatedRows || updatedRows.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Payment already verified",
          orderId,
          alreadyVerified: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update order items to Processing
    await supabase
      .from("order_items")
      .update({
        status: "Processing",
        updated_at: verifiedAt,
      })
      .eq("order_id", orderId);

    // ── Create vendor payout records ──
    try {
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("vendor_id, vendor_payout_rwf")
        .eq("order_id", orderId);

      if (orderItems && orderItems.length > 0) {
        // Aggregate payouts by vendor
        const vendorTotals = new Map<string, number>();
        for (const item of orderItems) {
          const current = vendorTotals.get(item.vendor_id) || 0;
          vendorTotals.set(item.vendor_id, current + (item.vendor_payout_rwf || 0));
        }

        const payoutRows = Array.from(vendorTotals.entries()).map(([vendorId, amount]) => ({
          vendor_id: vendorId,
          order_id: orderId,
          amount_rwf: amount,
          status: "pending",
        }));

        await supabase.from("vendor_payouts").upsert(payoutRows, {
          onConflict: "vendor_id,order_id",
        });
      }
    } catch (e) {
      console.warn("Failed to create vendor payout records", e);
    }

    // ── Increment discount redemption ──
    try {
      const discountCode = existingOrder.discount_code;
      if (discountCode) {
        await supabase.rpc("increment_discount_redemption", { p_code: discountCode });
      }
    } catch (e) {
      console.warn("Failed to increment discount redemption", e);
    }

    // ── Send order confirmation email via Resend ──
    if (RESEND_API_KEY && existingOrder.buyer_email) {
      try {
        const tmpl = TEMPLATES["order_confirmation"];
        const ctx = { orderId, amount: txData.amount, currency: txData.currency || "RWF" };
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "iwanyu <hello@iwanyu.store>",
            to: [existingOrder.buyer_email],
            subject: tmpl.subject(ctx),
            html: tmpl.html(ctx),
          }),
        });

        await supabase.from("email_log").insert({
          recipient: existingOrder.buyer_email,
          subject: tmpl.subject(ctx),
          template: "order_confirmation",
          payload: ctx,
          status: "sent",
        }).catch(() => {});
      } catch (emailErr) {
        console.warn("Failed to send order confirmation email:", emailErr);
      }
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

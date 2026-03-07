import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

interface SendEmailRequest {
  template: string;
  orderId: string;
  /** Optional override recipient (defaults to buyer email) */
  to?: string;
  /** Extra template variables */
  data?: Record<string, unknown>;
}

const TEMPLATES: Record<string, { subject: (ctx: Record<string, unknown>) => string; html: (ctx: Record<string, unknown>) => string }> = {
  order_shipped: {
    subject: (ctx) => `Your order ${(ctx.orderId as string).slice(0, 8)} has shipped!`,
    html: (ctx) => `
      <h2>Your order is on its way!</h2>
      <p><strong>Order ID:</strong> ${ctx.orderId}</p>
      <p>Your order has been shipped and is on its way to you.</p>
      ${ctx.trackingNumber ? `<p><strong>Tracking:</strong> ${ctx.trackingNumber}</p>` : ""}
      <p style="margin-top:24px;color:#888;font-size:12px">iwanyu.store</p>
    `,
  },
  order_delivered: {
    subject: (ctx) => `Order ${(ctx.orderId as string).slice(0, 8)} delivered`,
    html: (ctx) => `
      <h2>Your order has been delivered!</h2>
      <p><strong>Order ID:</strong> ${ctx.orderId}</p>
      <p>We hope you enjoy your purchase. If you have any issues, please contact our support team.</p>
      <p style="margin-top:24px;color:#888;font-size:12px">iwanyu.store</p>
    `,
  },
  order_cancelled: {
    subject: (ctx) => `Order ${(ctx.orderId as string).slice(0, 8)} cancelled`,
    html: (ctx) => `
      <h2>Your order has been cancelled</h2>
      <p><strong>Order ID:</strong> ${ctx.orderId}</p>
      <p>Your order has been cancelled. If you were charged, a refund will be processed.</p>
      <p style="margin-top:24px;color:#888;font-size:12px">iwanyu.store</p>
    `,
  },
  vendor_new_order: {
    subject: (ctx) => `New order received – ${(ctx.orderId as string).slice(0, 8)}`,
    html: (ctx) => `
      <h2>You have a new order!</h2>
      <p><strong>Order ID:</strong> ${ctx.orderId}</p>
      <p>A customer has placed an order for your products. Please log in to your seller dashboard to review and process it.</p>
      <p style="margin-top:24px;color:#888;font-size:12px">iwanyu.store</p>
    `,
  },
  payout_completed: {
    subject: (ctx) => `Payout processed – ${ctx.amount} RWF`,
    html: (ctx) => `
      <h2>Your payout has been processed!</h2>
      <p><strong>Amount:</strong> ${ctx.amount} RWF</p>
      <p><strong>Order:</strong> ${(ctx.orderId as string).slice(0, 8)}</p>
      <p>The funds should arrive in your account shortly.</p>
      <p style="margin-top:24px;color:#888;font-size:12px">iwanyu.store</p>
    `,
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email provider not configured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendEmailRequest = await req.json();
    const { template, orderId, to, data } = body;

    if (!template || !orderId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: template, orderId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tmpl = TEMPLATES[template];
    if (!tmpl) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve recipient
    let recipient = to;
    if (!recipient) {
      const { data: order } = await supabase
        .from("orders")
        .select("buyer_email")
        .eq("id", orderId)
        .maybeSingle();
      recipient = order?.buyer_email;
    }

    if (!recipient) {
      return new Response(
        JSON.stringify({ error: "Could not determine recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const ctx = { orderId, ...data };
    const subject = tmpl.subject(ctx);
    const html = tmpl.html(ctx);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "iwanyu <orders@iwanyu.store>",
        to: [recipient],
        subject,
        html,
      }),
    });

    const emailData = await emailRes.json();
    const status = emailRes.ok ? "sent" : "failed";

    await supabase.from("email_log").insert({
      recipient,
      subject,
      template,
      payload: ctx,
      status,
      provider_id: emailData?.id ?? null,
      error: status === "failed" ? JSON.stringify(emailData) : null,
    });

    return new Response(
      JSON.stringify({ success: emailRes.ok, messageId: emailData?.id }),
      { status: emailRes.ok ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-email:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

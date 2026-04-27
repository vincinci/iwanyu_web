import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

/**
 * Generic email sending function. Supports all transactional email templates.
 *
 * POST body:
 *   {
 *     template: string        — template key (e.g. "order_confirmation")
 *     to?: string             — recipient email (required unless orderId is given)
 *     orderId?: string        — used to resolve recipient from orders table
 *     data?: Record<string, unknown>  — template variables
 *   }
 */
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

    const body = await req.json();
    const { template, to, orderId, data = {} } = body as {
      template: string;
      to?: string;
      orderId?: string;
      data?: Record<string, unknown>;
    };

    if (!template) {
      return new Response(
        JSON.stringify({ error: "Missing required field: template" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const tmpl = TEMPLATES[template];
    if (!tmpl) {
      return new Response(
        JSON.stringify({ error: `Unknown template: ${template}`, available: Object.keys(TEMPLATES) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve recipient
    let recipient = to;
    if (!recipient && orderId) {
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

    const ctx: Record<string, unknown> = { orderId, ...data };
    const subject = tmpl.subject(ctx);
    const html = tmpl.html(ctx);

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "iwanyu <hello@iwanyu.store>",
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
    }).catch(() => {});

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

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

/**
 * Send a welcome email to a newly registered user.
 *
 * Called from the React frontend immediately after supabase.auth.signUp() succeeds.
 * The caller must be authenticated (valid JWT in Authorization header).
 *
 * POST body: { name?: string }  — optional display name override
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
      // Non-fatal: email provider not configured, silently succeed
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller's JWT to get their user ID + email
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();

    if (userErr || !user?.email) {
      return new Response(JSON.stringify({ error: "Could not resolve user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({})) as { name?: string };
    const name = body.name || user.user_metadata?.full_name || user.email.split("@")[0];

    const tmpl = TEMPLATES["welcome"];
    const ctx: Record<string, unknown> = { name, email: user.email };
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
        to: [user.email],
        subject,
        html,
      }),
    });

    const emailData = await emailRes.json();
    const status = emailRes.ok ? "sent" : "failed";

    // Log (best-effort, never fail the response over a log error)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    await supabase.from("email_log").insert({
      recipient: user.email,
      subject,
      template: "welcome",
      payload: ctx,
      status,
      provider_id: emailData?.id ?? null,
      error: status === "failed" ? JSON.stringify(emailData) : null,
    }).catch(() => {});

    return new Response(
      JSON.stringify({ success: emailRes.ok, messageId: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in send-welcome-email:", error);
    // Non-fatal: always return 200 so sign-up is never blocked
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

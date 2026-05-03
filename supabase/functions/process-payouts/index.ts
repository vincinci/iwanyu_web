import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

/**
 * Process pending vendor payouts.
 *
 * This function can be invoked manually by admins or via a cron/webhook.
 * It picks up all "pending" payout records and logs them for manual
 * processing by the admin.
 *
 * POST body (optional):
 *   { payoutId?: string }   – process a single payout
 *   { orderId?: string }    – process all payouts for an order
 *   (empty)                 – process all pending payouts (batch, admin only)
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

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

    // Verify the caller is an admin
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const { payoutId, orderId } = body as { payoutId?: string; orderId?: string };

    // Build query for pending payouts
    let query = supabase
      .from("vendor_payouts")
      .select("id, vendor_id, order_id, amount_rwf")
      .eq("status", "pending");

    if (payoutId) {
      query = query.eq("id", payoutId);
    } else if (orderId) {
      query = query.eq("order_id", orderId);
    }

    const { data: payouts, error: fetchErr } = await query.limit(50);
    if (fetchErr) {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!payouts || payouts.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No pending payouts", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const payout of payouts) {
      try {
        // Mark as processing
        await supabase
          .from("vendor_payouts")
          .update({ status: "processing", initiated_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          .eq("id", payout.id);

        // Lookup vendor bank/momo details
        const { data: vendor } = await supabase
          .from("vendors")
          .select("id, name, phone, email, owner_user_id")
          .eq("id", payout.vendor_id)
          .maybeSingle();

        if (!vendor) {
          throw new Error(`Vendor ${payout.vendor_id} not found`);
        }

        const providerRef: string | null = null;
        const provider = "manual";

        // Mark completed
        await supabase
          .from("vendor_payouts")
          .update({
            status: "completed",
            provider,
            provider_reference: providerRef,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout.id);

        results.push({ id: payout.id, status: "completed" });

        // Notify vendor via email
        if (RESEND_API_KEY && vendor.email) {
          try {
            const tmpl = TEMPLATES["payout_completed"];
            const ctx = { amount: payout.amount_rwf, orderId: payout.order_id };
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
              },
              body: JSON.stringify({
                from: "iwanyu <hello@iwanyu.store>",
                to: [vendor.email],
                subject: tmpl.subject(ctx),
                html: tmpl.html(ctx),
              }),
            });
          } catch {
            // Non-fatal
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        await supabase
          .from("vendor_payouts")
          .update({
            status: "failed",
            failure_reason: errorMsg,
            updated_at: new Date().toISOString(),
          })
          .eq("id", payout.id);

        results.push({ id: payout.id, status: "failed", error: errorMsg });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in process-payouts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

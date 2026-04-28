import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const FLUTTERWAVE_SECRET_KEY = Deno.env.get("FLUTTERWAVE_SECRET_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

/**
 * Verify a wallet top-up payment via Flutterwave and credit the user's wallet.
 *
 * POST body: { topupId: string; transactionId: string }
 *
 * topupId — uuid of the row in wallet_topups (used as tx_ref)
 * transactionId — Flutterwave transaction_id from the redirect URL
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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Resolve caller identity (used to prevent cross-user credit)
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

    const body = await req.json() as { topupId: string; transactionId: string };
    const { topupId, transactionId } = body;

    if (!topupId || !transactionId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: topupId, transactionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Look up the pending topup record
    const { data: topup, error: topupErr } = await supabase
      .from("wallet_topups")
      .select("id, user_id, amount_rwf, status, flw_transaction_id")
      .eq("id", topupId)
      .maybeSingle();

    if (topupErr || !topup) {
      return new Response(
        JSON.stringify({ error: "Top-up record not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Security: only the topup owner can verify it
    if (topup.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Idempotency: if already completed, return success
    if (topup.status === "completed") {
      return new Response(
        JSON.stringify({ success: true, alreadyCredited: true, amountRwf: topup.amount_rwf }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!FLUTTERWAVE_SECRET_KEY) {
      return new Response(
        JSON.stringify({ error: "Payment provider not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Verify with Flutterwave
    const flwRes = await fetch(
      `https://api.flutterwave.com/v3/transactions/${transactionId}/verify`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${FLUTTERWAVE_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!flwRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to verify payment with Flutterwave" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const flwData = await flwRes.json();
    if (flwData.status !== "success" || !flwData.data) {
      return new Response(
        JSON.stringify({ error: "Payment verification failed", detail: flwData.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const txData = flwData.data;

    // Validate tx_ref matches our topup id
    if (txData.tx_ref !== topupId) {
      return new Response(
        JSON.stringify({ error: "Transaction reference mismatch" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (txData.status !== "successful") {
      // Mark the topup failed
      await supabase
        .from("wallet_topups")
        .update({ status: "failed", flw_transaction_id: String(transactionId) })
        .eq("id", topupId)
        .eq("user_id", user.id);

      return new Response(
        JSON.stringify({ error: `Payment not successful: ${txData.status}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Validate paid amount matches what was requested (server-stored)
    if (txData.amount < topup.amount_rwf) {
      await supabase
        .from("wallet_topups")
        .update({ status: "failed", flw_transaction_id: String(transactionId) })
        .eq("id", topupId)
        .eq("user_id", user.id);
      return new Response(
        JSON.stringify({ error: `Amount mismatch. Expected ${topup.amount_rwf}, got ${txData.amount}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Credit wallet atomically ──
    const { error: creditErr } = await supabase.rpc("increment_wallet_balance", {
      p_user_id: user.id,
      p_amount: topup.amount_rwf,
    });

    if (creditErr) {
      console.error("Failed to credit wallet:", creditErr);
      return new Response(
        JSON.stringify({ error: "Failed to credit wallet. Please contact support." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Mark topup completed (with FLW transaction id for dedup)
    const { error: markErr } = await supabase
      .from("wallet_topups")
      .update({
        status: "completed",
        flw_transaction_id: String(transactionId),
        completed_at: new Date().toISOString(),
      })
      .eq("id", topupId)
      .eq("status", "pending"); // idempotency guard

    if (markErr) {
      console.warn("Failed to mark topup completed (may already be done):", markErr);
    }

    // Fetch updated wallet balance for the response
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, wallet_balance_rwf, full_name")
      .eq("id", user.id)
      .single();

    // Send deposit_success email (non-fatal)
    if (RESEND_API_KEY && profile?.email) {
      try {
        const tmpl = TEMPLATES["deposit_success"];
        const ctx = {
          amount: topup.amount_rwf,
          newBalance: profile.wallet_balance_rwf ?? topup.amount_rwf,
          currency: "RWF",
          name: profile.full_name ?? "",
          date: new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        };
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "iwanyu <hello@iwanyu.store>",
            to: [profile.email],
            subject: tmpl.subject(ctx),
            html: tmpl.html(ctx),
          }),
        });
      } catch (emailErr) {
        console.warn("Failed to send deposit_success email:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        amountRwf: topup.amount_rwf,
        newBalanceRwf: profile?.wallet_balance_rwf ?? null,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in wallet-topup-verify:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

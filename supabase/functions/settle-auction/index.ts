import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

/**
 * Settle a live auction: determine the winner, charge their wallet,
 * release all other locked bids, and send the winner a "bid_won" email.
 *
 * POST body: { auctionId: string }
 *
 * Must be called by an authenticated user (typically the seller who ends the session).
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
    const { auctionId } = await req.json() as { auctionId: string };

    if (!auctionId) {
      return new Response(
        JSON.stringify({ error: "Missing required field: auctionId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Run the DB settlement function (service_role only)
    const { data: result, error: settleErr } = await supabase.rpc("settle_auction", {
      p_auction_id: auctionId,
    });

    if (settleErr) {
      console.error("settle_auction RPC error:", settleErr);
      return new Response(
        JSON.stringify({ error: settleErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { ok, winner_user_id, winner_amount } = (result ?? {}) as {
      ok: boolean;
      winner_user_id?: string | null;
      winner_amount?: number | null;
    };

    // No winner (no bids or already settled)
    if (!ok || !winner_user_id) {
      return new Response(
        JSON.stringify({ success: true, winner: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Fetch winner profile + auction details in parallel
    const [profileRes, auctionRes] = await Promise.all([
      supabase.from("profiles").select("email, full_name").eq("id", winner_user_id).single(),
      supabase.from("auctions").select("title, image_url").eq("id", auctionId).single(),
    ]);

    // Send bid_won email
    if (RESEND_API_KEY && profileRes.data?.email) {
      try {
        const tmpl = TEMPLATES["bid_won"];
        const ctx = {
          productName: auctionRes.data?.title || "Auction item",
          amount: winner_amount ?? 0,
          productImage: auctionRes.data?.image_url ?? null,
          sessionId: auctionId,
        };
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "iwanyu <hello@iwanyu.store>",
            to: [profileRes.data.email],
            subject: tmpl.subject(ctx),
            html: tmpl.html(ctx),
          }),
        });

        await supabase.from("email_log").insert({
          recipient: profileRes.data.email,
          subject: tmpl.subject(ctx),
          template: "bid_won",
          payload: ctx,
          status: "sent",
        }).catch(() => {});
      } catch (emailErr) {
        console.warn("Failed to send bid_won email:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, winner_user_id, winner_amount }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in settle-auction:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

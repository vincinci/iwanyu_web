import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

/**
 * Vendor Action (Admin only)
 * Approve or reject vendor applications using service role key to bypass RLS.
 *
 * POST body:
 * {
 *   action: "approve" | "reject",
 *   appId: string,
 *   vendorId: string | null,
 *   ownerUserId: string,
 *   storeName: string,
 *   location: string
 * }
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

    // Verify JWT and check admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, email")
      .eq("id", user.id)
      .maybeSingle();

    const isAdmin = profile?.role === "admin" || profile?.email === "bebisdavy@gmail.com";
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json() as {
      action: "approve" | "reject";
      appId: string;
      vendorId: string | null;
      ownerUserId: string;
      storeName: string;
      location: string;
    };

    const { action, appId, vendorId, ownerUserId, storeName, location } = body;

    if (!action || !appId || !ownerUserId) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "approve") {
      const id = vendorId || crypto.randomUUID();

      // Create or update vendor with shop_name
      const { error: vendorErr } = await supabase
        .from("vendors")
        .upsert({
          id,
          name: storeName,
          shop_name: storeName,
          location,
          verified: false,
          owner_user_id: ownerUserId,
          status: "approved",
          verification_status: "verified",
        }, { onConflict: "id" });

      if (vendorErr) {
        console.error("Vendor upsert error:", vendorErr);
        return new Response(
          JSON.stringify({ error: `Failed to update vendor: ${vendorErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update profile role to seller
      await supabase
        .from("profiles")
        .upsert({ id: ownerUserId, role: "seller" }, { onConflict: "id" });

      // Update application status
      await supabase
        .from("vendor_applications")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("id", appId);

      return new Response(
        JSON.stringify({ success: true, vendorId: id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else if (action === "reject") {
      if (vendorId) {
        await supabase
          .from("vendors")
          .update({
            status: "rejected",
            verification_status: "rejected",
          })
          .eq("id", vendorId);
      }

      await supabase
        .from("vendor_applications")
        .update({ status: "rejected", reviewed_at: new Date().toISOString() })
        .eq("id", appId);

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in vendor-action:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

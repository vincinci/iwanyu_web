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
    const { amount, phoneNumber } = await req.json();

    if (!amount || !phoneNumber) {
      throw new Error("Amount and phone number required");
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

    // Check wallet balance
    const { data: wallet } = await supabaseClient
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    if (!wallet || wallet.balance < parseFloat(amount)) {
      throw new Error("Insufficient balance");
    }

    const transactionId = `wth_${Date.now()}_${user.id.substring(0, 8)}`;

    // Call PawaPay API for payout
    const pawapayResponse = await fetch("https://api.pawapay.io/payouts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("PAWAPAY_API_KEY")}`,
      },
      body: JSON.stringify({
        payoutId: transactionId,
        amount: amount.toString(),
        currency: "ZMW",
        correspondent: "MTN_MOMO_ZMB",
        recipient: {
          type: "MSISDN",
          address: {
            value: phoneNumber,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: "Wallet Withdrawal",
      }),
    });

    if (!pawapayResponse.ok) {
      const error = await pawapayResponse.text();
      throw new Error(`PawaPay error: ${error}`);
    }

    const pawapayData = await pawapayResponse.json();

    // Deduct from wallet immediately
    await supabaseClient
      .from("wallets")
      .update({
        balance: wallet.balance - parseFloat(amount),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", user.id);

    // Record transaction
    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        transaction_id: transactionId,
        type: "withdrawal",
        amount: parseFloat(amount),
        status: "pending",
        phone_number: phoneNumber,
        provider: "pawapay",
        metadata: pawapayData,
      });

    return new Response(
      JSON.stringify({
        success: true,
        transactionId,
        message: "Withdrawal initiated. You will receive payment shortly.",
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

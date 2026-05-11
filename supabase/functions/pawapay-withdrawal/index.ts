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

    // Check wallet balance from profiles
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("wallet_balance_rwf, locked_balance_rwf")
      .eq("id", user.id)
      .single();

    if (!profile) {
      throw new Error("Profile not found");
    }

    const availableBalance = (profile.wallet_balance_rwf || 0) - (profile.locked_balance_rwf || 0);

    if (availableBalance < parseInt(amount)) {
      throw new Error("Insufficient balance");
    }

    // Minimum withdrawal amount
    if (parseInt(amount) < 500) {
      throw new Error("Minimum withdrawal is 500 RWF");
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
        currency: "RWF",
        correspondent: "MTN_MOMO_RWA", // Rwanda MTN Mobile Money
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

    const currentBalance = profile.wallet_balance_rwf || 0;
    const newBalance = currentBalance - parseInt(amount);

    // Deduct from wallet immediately
    await supabaseClient
      .from("profiles")
      .update({
        wallet_balance_rwf: newBalance,
      })
      .eq("id", user.id);

    // Record transaction
    await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        external_transaction_id: transactionId,
        type: "withdrawal",
        amount_rwf: parseInt(amount),
        previous_balance_rwf: currentBalance,
        new_balance_rwf: newBalance,
        status: "pending",
        phone_number: phoneNumber,
        payment_method: "pawapay",
        provider: "pawapay",
        metadata: pawapayData,
        description: `PawaPay withdrawal ${transactionId}`,
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

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

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Create transaction ID
    const transactionId = `dep_${Date.now()}_${user.id.substring(0, 8)}`;

    // Call PawaPay API to initiate deposit
    const pawapayResponse = await fetch("https://api.pawapay.io/deposits", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("PAWAPAY_API_KEY")}`,
      },
      body: JSON.stringify({
        depositId: transactionId,
        amount: amount.toString(),
        currency: "ZMW", // Zambian Kwacha
        correspondent: "MTN_MOMO_RWA", // Rwanda MTN Mobile Money
        payer: {
          type: "MSISDN",
          address: {
            value: phoneNumber,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: "Wallet Deposit",
      }),
    });

    if (!pawapayResponse.ok) {
      const error = await pawapayResponse.text();
      throw new Error(`PawaPay error: ${error}`);
    }

    const pawapayData = await pawapayResponse.json();

    // Get current wallet balance
    const { data: wallet } = await supabaseClient
      .from("wallets")
      .select("balance")
      .eq("user_id", user.id)
      .single();

    const currentBalance = wallet?.balance || 0;

    // Store transaction in database
    const { error: dbError } = await supabaseClient
      .from("wallet_transactions")
      .insert({
        user_id: user.id,
        external_transaction_id: transactionId,
        type: "deposit",
        amount_rwf: parseInt(amount),
        previous_balance_rwf: currentBalance,
        new_balance_rwf: currentBalance, // Will be updated on callback
        status: "pending",
        phone_number: phoneNumber,
        payment_method: "pawapay",
        provider: "pawapay",
        metadata: pawapayData,
        description: `PawaPay deposit ${transactionId}`,
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Failed to record transaction");
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId,
        status: "pending",
        message: "Deposit initiated. Check your phone to complete payment.",
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

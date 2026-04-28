import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

interface CartItem {
  productId: string;
  quantity: number;
}

interface CreateOrderRequest {
  items: CartItem[];
  email: string;
  phone: string;
  address: string;
  paymentMethod: "momo" | "wallet";
  discountCode?: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create an authenticated client to resolve the user, and a service-role
    // client for writes that bypass RLS.
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

    const body: CreateOrderRequest = await req.json();
    const { items, email, phone, address, paymentMethod, discountCode } = body;

    if (!items?.length || !email?.trim() || !phone?.trim() || !address?.trim()) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: items, email, phone, address" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Compute totals server-side using the DB RPC
    const itemsPayload = items.map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
    }));

    const { data: totals, error: totalsErr } = await supabase.rpc("compute_order_totals", {
      p_items: itemsPayload,
      p_discount_code: discountCode ?? null,
    });
    if (totalsErr) {
      return new Response(
        JSON.stringify({ error: totalsErr.message }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const {
      subtotal,
      discount_rwf: discountRwf,
      effective_subtotal: effectiveSubtotal,
      service_fee: serviceFee,
      total,
      vendor_payout: vendorPayout,
      line_items: lineItems,
    } = totals as {
      subtotal: number;
      discount_rwf: number;
      effective_subtotal: number;
      service_fee: number;
      total: number;
      vendor_payout: number;
      line_items: Array<{
        productId: string;
        vendorId: string;
        title: string;
        price_rwf: number;
        quantity: number;
        image_url: string | null;
      }>;
    };

    // 2. Decrement stock for each item
    for (const li of lineItems) {
      const { error: stockErr } = await supabase.rpc("decrement_stock", {
        p_product_id: li.productId,
        p_qty: li.quantity,
      });
      if (stockErr) {
        return new Response(
          JSON.stringify({ error: stockErr.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 3. Create the order with server-computed totals
    const paymentMeta = {
      provider: "flutterwave",
      mode: "redirect",
      selected: paymentMethod,
      phone: phone.trim(),
      discount_code: discountCode ?? null,
      discount_rwf: discountRwf,
    };

    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert({
        buyer_user_id: user.id,
        buyer_email: email.trim(),
        shipping_address: address.trim(),
        status: "Placed",
        total_rwf: total,
        service_fee_rwf: serviceFee,
        vendor_payout_rwf: vendorPayout,
        discount_code: discountCode ?? null,
        discount_rwf: discountRwf,
        payment: paymentMeta,
      })
      .select("id")
      .single();

    if (orderErr) {
      return new Response(
        JSON.stringify({ error: orderErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const orderId = orderData.id;

    // 4. Distribute discount proportionally across line items
    let remainingDiscount = Math.min(discountRwf, subtotal);
    const lineDiscounts = lineItems.map((li, idx) => {
      if (remainingDiscount <= 0 || subtotal <= 0) return 0;
      if (idx === lineItems.length - 1) return remainingDiscount;
      const lineTotal = li.price_rwf * li.quantity;
      const proportional = Math.floor((lineTotal / subtotal) * discountRwf);
      const alloc = Math.max(0, Math.min(remainingDiscount, proportional));
      remainingDiscount -= alloc;
      return alloc;
    });

    // 5. Insert order items
    const rows = lineItems.map((li, idx) => {
      const lineTotal = li.price_rwf * li.quantity;
      const lineDiscount = lineDiscounts[idx] ?? 0;
      const discountedLineTotal = Math.max(0, lineTotal - lineDiscount);
      return {
        order_id: orderId,
        product_id: li.productId,
        vendor_id: li.vendorId,
        title: li.title,
        price_rwf: li.price_rwf,
        quantity: li.quantity,
        image_url: li.image_url,
        status: "Placed",
        vendor_payout_rwf: Math.round(discountedLineTotal * 0.93),
      };
    });

    const { error: itemsErr } = await supabase.from("order_items").insert(rows);
    if (itemsErr) {
      return new Response(
        JSON.stringify({ error: itemsErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Notify each vendor of the new order (fire-and-forget) ──
    if (RESEND_API_KEY) {
      (async () => {
        try {
          // Aggregate order value per vendor
          const vendorAmounts = new Map<string, number>();
          for (const row of rows) {
            vendorAmounts.set(row.vendor_id, (vendorAmounts.get(row.vendor_id) ?? 0) + row.price_rwf * row.quantity);
          }
          for (const [vendorId, amount] of vendorAmounts) {
            const { data: vendor } = await supabase
              .from("vendors")
              .select("name, owner_user_id")
              .eq("id", vendorId)
              .single();
            if (!vendor?.owner_user_id) continue;
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", vendor.owner_user_id)
              .single();
            if (!profile?.email) continue;
            const tmpl = TEMPLATES["vendor_new_order"];
            const ctx = { orderId, amount, storeName: vendor.name };
            await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
              body: JSON.stringify({
                from: "iwanyu <hello@iwanyu.store>",
                to: [profile.email],
                subject: tmpl.subject(ctx),
                html: tmpl.html(ctx),
              }),
            });
          }
        } catch (e) {
          console.warn("Failed to send vendor new-order emails:", e);
        }
      })();
    }

    // ── Handle wallet payment ──
    let paymentStatus = "pending";
    if (paymentMethod === "wallet") {
      // Fetch user's current wallet balance
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("wallet_balance_rwf, locked_balance_rwf")
        .eq("id", user.id)
        .single();

      if (profileErr || !profile) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch wallet balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const currentBalance = Number(profile.wallet_balance_rwf ?? 0);
      const availableBalance = currentBalance - Number(profile.locked_balance_rwf ?? 0);

      // Validate sufficient balance
      if (availableBalance < total) {
        return new Response(
          JSON.stringify({ 
            error: `Insufficient wallet balance. Required: ${total}, Available: ${availableBalance}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Deduct from wallet
      const newBalance = currentBalance - total;
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: newBalance })
        .eq("id", user.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: "Failed to deduct wallet balance" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // Update order status to Paid
      const { error: orderUpdateErr } = await supabase
        .from("orders")
        .update({ status: "Paid", payment: { ...paymentMeta, payment_status: "wallet_paid" } })
        .eq("id", orderId);

      if (orderUpdateErr) {
        console.warn("Failed to update order status to Paid:", orderUpdateErr);
      }

      paymentStatus = "wallet_paid";
    }

    return new Response(
      JSON.stringify({
        success: true,
        orderId,
        total,
        serviceFee,
        discountRwf,
        paymentStatus,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error in create-order:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});

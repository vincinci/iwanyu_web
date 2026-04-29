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

type EmailContext = Record<string, unknown>;

async function sendTemplatedEmail(
  supabase: ReturnType<typeof createClient>,
  recipient: string,
  templateKey: string,
  ctx: EmailContext,
): Promise<void> {
  const tmpl = TEMPLATES[templateKey];
  if (!tmpl) return;

  const subject = tmpl.subject(ctx);
  const html = tmpl.html(ctx);

  const emailRes = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
    body: JSON.stringify({
      from: "iwanyu <hello@iwanyu.store>",
      to: [recipient],
      subject,
      html,
    }),
  });

  const emailPayload = await emailRes.json().catch(() => ({}));

  await supabase.from("email_log").insert({
    recipient,
    subject,
    template: templateKey,
    payload: ctx,
    status: emailRes.ok ? "sent" : "failed",
    provider_id: (emailPayload as { id?: string }).id ?? null,
    error: emailRes.ok ? null : JSON.stringify(emailPayload),
  }).catch(() => null);
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

    let walletCurrentBalance = 0;
    let walletAvailableBalance = 0;

    // For wallet checkout, validate funds before creating order records/emails.
    if (paymentMethod === "wallet") {
      let { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("wallet_balance_rwf, locked_balance_rwf")
        .eq("id", user.id)
        .single();

      if (profileErr && /locked_balance_rwf/i.test(profileErr.message)) {
        const fallback = await supabase
          .from("profiles")
          .select("wallet_balance_rwf")
          .eq("id", user.id)
          .single();
        profile = fallback.data as { wallet_balance_rwf?: number; locked_balance_rwf?: number } | null;
        profileErr = fallback.error;
        if (profile && typeof profile.locked_balance_rwf === "undefined") {
          profile.locked_balance_rwf = 0;
        }
      }

      if (profileErr || !profile) {
        return new Response(
          JSON.stringify({ error: `Failed to fetch wallet balance: ${profileErr?.message ?? "profile not found"}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      walletCurrentBalance = Number(profile.wallet_balance_rwf ?? 0);
      walletAvailableBalance = walletCurrentBalance - Number(profile.locked_balance_rwf ?? 0);

      if (walletAvailableBalance < total) {
        return new Response(
          JSON.stringify({
            error: `Insufficient wallet balance. Required: ${total}, Available: ${walletAvailableBalance}`,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }
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

    const paymentMethodLabel = paymentMethod === "wallet" ? "Wallet" : "Mobile Money";

    // ── Notify each vendor + buyer at order placement (fire-and-forget) ──
    // Wallet orders are emailed only after successful wallet deduction.
    if (RESEND_API_KEY && paymentMethod !== "wallet") {
      (async () => {
        try {
          // Aggregate order details per vendor
          const vendorOrderDetails = new Map<string, {
            amount: number;
            itemCount: number;
            items: Array<{ title: string; quantity: number; lineTotal: number }>;
          }>();

          for (const row of rows) {
            const lineTotal = row.price_rwf * row.quantity;
            const current = vendorOrderDetails.get(row.vendor_id) ?? {
              amount: 0,
              itemCount: 0,
              items: [],
            };

            current.amount += lineTotal;
            current.itemCount += row.quantity;
            current.items.push({
              title: row.title,
              quantity: row.quantity,
              lineTotal,
            });

            vendorOrderDetails.set(row.vendor_id, current);
          }

          for (const [vendorId, details] of vendorOrderDetails) {
            const { data: vendor } = await supabase
              .from("vendors")
              .select("name, owner_user_id")
              .eq("id", vendorId)
              .single();

            if (!vendor?.owner_user_id) continue;

            // Prefer profiles.email, fall back to auth.users email (service role can read it)
            const { data: profile } = await supabase
              .from("profiles")
              .select("email")
              .eq("id", vendor.owner_user_id)
              .single();

            let vendorEmail: string | null = profile?.email ?? null;
            if (!vendorEmail) {
              const { data: authUser } = await supabase.auth.admin.getUserById(vendor.owner_user_id);
              vendorEmail = authUser?.user?.email ?? null;
            }

            if (!vendorEmail) continue;

            const ctx = {
              orderId,
              amount: details.amount,
              storeName: vendor.name,
              itemCount: details.itemCount,
              items: details.items,
              buyerEmail: email.trim(),
              shippingPhone: phone.trim(),
              shippingAddress: address.trim(),
            };

            await sendTemplatedEmail(supabase, vendorEmail, "vendor_new_order", ctx);
          }

          const buyerCtx = {
            orderId,
            amount: total,
            currency: "RWF",
            status: paymentMethod === "wallet" ? "Paid" : "Placed",
            paymentMethod: paymentMethodLabel,
            shippingPhone: phone.trim(),
            shippingAddress: address.trim(),
            itemCount: rows.reduce((acc, row) => acc + row.quantity, 0),
            items: rows.map((row) => ({
              title: row.title,
              quantity: row.quantity,
              lineTotal: row.price_rwf * row.quantity,
            })),
          };

          await sendTemplatedEmail(supabase, email.trim(), "order_received", buyerCtx);
        } catch (e) {
          console.warn("Failed to send order placement emails:", e);
        }
      })();
    }

    // ── Handle wallet payment ──
    let paymentStatus = "pending";
    if (paymentMethod === "wallet") {
      // Deduct from wallet
      const newBalance = walletCurrentBalance - total;
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ wallet_balance_rwf: newBalance })
        .eq("id", user.id);

      if (updateErr) {
        return new Response(
          JSON.stringify({ error: `Failed to deduct wallet balance: ${updateErr.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const verifiedAt = new Date().toISOString();

      // Mark wallet orders as paid using a valid order lifecycle status.
      const { error: orderUpdateErr } = await supabase
        .from("orders")
        .update({
          status: "Processing",
          payment_verified_at: verifiedAt,
          payment: {
            ...paymentMeta,
            payment_status: "wallet_paid",
            verified: true,
            verified_at: verifiedAt,
          },
          updated_at: verifiedAt,
        })
        .eq("id", orderId);

      if (orderUpdateErr) {
        console.warn("Failed to update wallet-paid order state:", orderUpdateErr);
      }

      await supabase
        .from("order_items")
        .update({ status: "Processing", updated_at: verifiedAt })
        .eq("order_id", orderId)
        .catch(() => null);

      // ── Credit each vendor's wallet with their payout share ──
      // Aggregate payout per vendor from order items
      const vendorPayouts = new Map<string, { amount: number; ownerId: string | null }>();
      for (const row of rows) {
        const prev = vendorPayouts.get(row.vendor_id);
        if (prev) {
          prev.amount += row.vendor_payout_rwf;
        } else {
          // Resolve vendor owner
          const { data: v } = await supabase
            .from("vendors")
            .select("owner_user_id")
            .eq("id", row.vendor_id)
            .single();
          vendorPayouts.set(row.vendor_id, {
            amount: row.vendor_payout_rwf,
            ownerId: v?.owner_user_id ?? null,
          });
        }
      }

      for (const [vendorId, payout] of vendorPayouts) {
        if (!payout.ownerId || payout.amount <= 0) continue;

        // Increment vendor's wallet balance atomically
        const { data: vProfile } = await supabase
          .from("profiles")
          .select("wallet_balance_rwf")
          .eq("id", payout.ownerId)
          .single();

        const vBalance = Number(vProfile?.wallet_balance_rwf ?? 0);
        await supabase
          .from("profiles")
          .update({ wallet_balance_rwf: vBalance + payout.amount })
          .eq("id", payout.ownerId);

        // Record vendor credit transaction
        await supabase.from("wallet_transactions").insert({
          user_id: payout.ownerId,
          type: "sale_credit",
          amount_rwf: payout.amount,
          status: "completed",
          description: `Payout for order #${String(orderId).slice(0, 8).toUpperCase()}`,
          external_transaction_id: `order_${orderId}_vendor_${vendorId}`,
        }).catch(() => null);
      }

      // ── Record platform fee (service fee + host cut) ──
      const platformFee = total - vendorPayout;
      if (platformFee > 0) {
        await supabase.from("wallet_transactions").insert({
          user_id: user.id,      // attributed to buyer for audit trail
          type: "platform_fee",
          amount_rwf: platformFee,
          status: "completed",
          description: `Platform fee for order #${String(orderId).slice(0, 8).toUpperCase()} (service ${serviceFee} RWF + host cut)`,
          external_transaction_id: `order_${orderId}_platform_fee`,
        }).catch(() => null);
      }

      paymentStatus = "wallet_paid";

      // Send placement notifications only after wallet payment is confirmed.
      if (RESEND_API_KEY) {
        (async () => {
          try {
            const vendorOrderDetails = new Map<string, {
              amount: number;
              itemCount: number;
              items: Array<{ title: string; quantity: number; lineTotal: number }>;
            }>();

            for (const row of rows) {
              const lineTotal = row.price_rwf * row.quantity;
              const current = vendorOrderDetails.get(row.vendor_id) ?? {
                amount: 0,
                itemCount: 0,
                items: [],
              };

              current.amount += lineTotal;
              current.itemCount += row.quantity;
              current.items.push({
                title: row.title,
                quantity: row.quantity,
                lineTotal,
              });

              vendorOrderDetails.set(row.vendor_id, current);
            }

            for (const [vendorId, details] of vendorOrderDetails) {
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

              let vendorEmail: string | null = profile?.email ?? null;
              if (!vendorEmail) {
                const { data: authUser } = await supabase.auth.admin.getUserById(vendor.owner_user_id);
                vendorEmail = authUser?.user?.email ?? null;
              }

              if (!vendorEmail) continue;

              const ctx = {
                orderId,
                amount: details.amount,
                storeName: vendor.name,
                itemCount: details.itemCount,
                items: details.items,
                buyerEmail: email.trim(),
                shippingPhone: phone.trim(),
                shippingAddress: address.trim(),
              };

              await sendTemplatedEmail(supabase, vendorEmail, "vendor_new_order", ctx);
            }

            const buyerCtx = {
              orderId,
              amount: total,
              currency: "RWF",
              status: "Paid",
              paymentMethod: paymentMethodLabel,
              shippingPhone: phone.trim(),
              shippingAddress: address.trim(),
              itemCount: rows.reduce((acc, row) => acc + row.quantity, 0),
              items: rows.map((row) => ({
                title: row.title,
                quantity: row.quantity,
                lineTotal: row.price_rwf * row.quantity,
              })),
            };

            await sendTemplatedEmail(supabase, email.trim(), "order_received", buyerCtx);
          } catch (e) {
            console.warn("Failed to send wallet order placement emails:", e);
          }
        })();
      }
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

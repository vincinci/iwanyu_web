import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

function normalizeStatus(value: unknown): string {
  return String(value ?? "").trim().toUpperCase();
}

function parseAmountRwf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isFailureStatus(status: string): boolean {
  return ["FAILED", "REJECTED", "CANCELLED", "DECLINED", "EXPIRED", "REVERSED"].some((term) => status.includes(term));
}

function isSuccessStatus(status: string): boolean {
  return ["COMPLETED", "SUCCESS", "SETTLED", "PAID"].some((term) => status.includes(term));
}

async function sendOrderConfirmationEmail(
  supabase: ReturnType<typeof createClient>,
  recipient: string,
  ctx: Record<string, unknown>,
): Promise<void> {
  if (!RESEND_API_KEY) return;
  const tmpl = TEMPLATES["order_confirmation"];
  if (!tmpl) return;

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
      to: [recipient],
      subject,
      html,
    }),
  });

  const payload = await emailRes.json().catch(() => ({}));
  await supabase
    .from("email_log")
    .insert({
      recipient,
      subject,
      template: "order_confirmation",
      payload: ctx,
      status: emailRes.ok ? "sent" : "failed",
      provider_id: (payload as { id?: string }).id ?? null,
      error: emailRes.ok ? null : JSON.stringify(payload),
    })
    .catch(() => null);
}

/**
 * Wallet Deposit Callback (PawaPay)
 *
 * Called when a user deposits money via PawaPay mobile money.
 * Webhook from PawaPay with payment status.
 *
 * Incoming webhook format:
 * {
 *   depositId: "uuid",
 *   status: "COMPLETED|FAILED|PROCESSING",
 *   requestedAmount: "string",
 *   currency: "RWF",
 *   country: "string"
 * }
 *
 * This function:
 * 1. Receives PawaPay deposit callback
 * 2. Only processes COMPLETED deposits
 * 3. Checks for duplicate transactions (idempotency)
 * 4. Credits user's wallet
 * 5. Records transaction
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
    const body = await req.json();

    // pawaPay callbacks use `amount`, but some legacy code used `requestedAmount`.
    const depositId = String(body?.depositId ?? "").trim();
    const rawStatus = normalizeStatus(body?.status);
    const currency = String(body?.currency ?? "").trim().toUpperCase();
    const amountRaw = body?.amount ?? body?.requestedAmount;
    const amountRwf = parseAmountRwf(amountRaw);
    const metadata = (body?.metadata && typeof body.metadata === "object") ? body.metadata as Record<string, unknown> : null;

    if (!depositId || !isUuid(depositId)) {
      console.warn("Invalid/missing depositId in callback", { depositId });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate currency (RWF for Rwanda)
    if (currency !== "RWF") {
      console.warn(`Unexpected currency: ${currency}`);
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!rawStatus) {
      console.warn("Missing status in callback", { depositId });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (amountRwf == null || amountRwf <= 0) {
      console.warn("Missing/invalid amount in callback", { depositId, amountRaw });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Try to link the deposit to a wallet transaction (top-up) or an order payment.
    const { data: txnRecord } = await supabase
      .from("wallet_transactions")
      .select("id, user_id, metadata")
      .eq("external_transaction_id", depositId)
      .maybeSingle();

    const { data: legacyTxn } = txnRecord
      ? { data: null }
      : await supabase
        .from("wallet_transactions")
        .select("id, user_id, metadata")
        .eq("reference", depositId)
        .maybeSingle();

    // Preferred order mapping:
    // - We set depositId = orderId for idempotency.
    // - As a fallback, allow metadata.orderId.
    const orderId = (isUuid(depositId) ? depositId : null) || (metadata && typeof metadata.orderId === "string" && isUuid(metadata.orderId) ? metadata.orderId : null);

    const failOrCancel = isFailureStatus(rawStatus);

    if (failOrCancel) {
      const txnMetaStatus = typeof txnRecord?.metadata?.status === "string" ? txnRecord.metadata.status : null;
      if (txnRecord && txnMetaStatus !== "failed" && txnMetaStatus !== "cancelled" && txnMetaStatus !== "completed") {
        const newStatus = rawStatus.includes("FAILED") || rawStatus.includes("REJECTED") || rawStatus.includes("DECLINED") || rawStatus.includes("EXPIRED") || rawStatus.includes("REVERSED")
          ? "failed"
          : "cancelled";

        await supabase
          .from("wallet_transactions")
          .update({
            metadata: {
              ...(txnRecord.metadata ?? {}),
              status: newStatus,
              updated_at: new Date().toISOString(),
            },
          })
          .eq("id", txnRecord.id)
          .catch(() => null);
      } else if (legacyTxn) {
        const newStatus = rawStatus.includes("FAILED") || rawStatus.includes("REJECTED") || rawStatus.includes("DECLINED") || rawStatus.includes("EXPIRED") || rawStatus.includes("REVERSED")
          ? "failed"
          : "cancelled";

        await supabase
          .from("wallet_transactions")
          .update({
            metadata: {
              ...(legacyTxn.metadata ?? {}),
              status: newStatus,
              updated_at: new Date().toISOString(),
            },
          })
          .eq("id", legacyTxn.id)
          .catch(() => null);
      }

      // Do not return non-2xx: pawaPay would keep retrying.
      return new Response(JSON.stringify({ success: true, depositId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isSuccessStatus(rawStatus)) {
      console.log(`Deposit ${depositId} status: ${rawStatus} - waiting`);
      return new Response(JSON.stringify({ success: true, depositId, status: rawStatus }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) If this deposit matches an orderId, finalize the order.
    if (orderId) {
      const { data: existingOrder, error: orderErr } = await supabase
        .from("orders")
        .select("id, total_rwf, payment_verified_at, payment, discount_code, buyer_email")
        .eq("id", orderId)
        .maybeSingle();

      if (!orderErr && existingOrder) {
        if (!existingOrder.payment_verified_at) {
          // Validate amount against server-stored order total.
          if (amountRwf != null && amountRwf < Number(existingOrder.total_rwf)) {
            console.warn("PawaPay callback amount is less than expected order total", {
              orderId,
              depositId,
              expected: existingOrder.total_rwf,
              got: amountRwf,
            });
          } else {
            const verifiedAt = new Date().toISOString();
            const nextPayment = {
              ...(existingOrder.payment ?? {}),
              provider: "pawapay",
              mode: "redirect",
              verified: true,
              verified_at: verifiedAt,
              pawapay_status: rawStatus,
              pawapay_deposit_id: depositId,
              provider_transaction_id: body?.providerTransactionId ?? null,
              amount: amountRwf ?? null,
              currency,
            };

            const { data: updatedRows } = await supabase
              .from("orders")
              .update({
                status: "Processing",
                payment_verified_at: verifiedAt,
                payment: nextPayment,
                updated_at: verifiedAt,
              })
              .eq("id", orderId)
              .is("payment_verified_at", null)
              .select("id");

            if (updatedRows && updatedRows.length > 0) {
              // Update order items
              await supabase
                .from("order_items")
                .update({ status: "Processing", updated_at: verifiedAt })
                .eq("order_id", orderId)
                .catch(() => null);

              // Create vendor payout rows (idempotent)
              try {
                const { data: orderItems } = await supabase
                  .from("order_items")
                  .select("vendor_id, vendor_payout_rwf")
                  .eq("order_id", orderId);

                if (orderItems && orderItems.length > 0) {
                  const vendorTotals = new Map<string, number>();
                  for (const item of orderItems) {
                    const current = vendorTotals.get(item.vendor_id) || 0;
                    vendorTotals.set(item.vendor_id, current + (item.vendor_payout_rwf || 0));
                  }

                  const payoutRows = Array.from(vendorTotals.entries()).map(([vendorId, amount]) => ({
                    vendor_id: vendorId,
                    order_id: orderId,
                    amount_rwf: amount,
                    status: "pending",
                  }));

                  await supabase.from("vendor_payouts").upsert(payoutRows, {
                    onConflict: "vendor_id,order_id",
                  });
                }
              } catch (e) {
                console.warn("Failed to create vendor payout records", e);
              }

              // Increment discount redemption
              try {
                if (existingOrder.discount_code) {
                  await supabase.rpc("increment_discount_redemption", { p_code: existingOrder.discount_code });
                }
              } catch (e) {
                console.warn("Failed to increment discount redemption", e);
              }

              // Send order confirmation email (best-effort)
              if (existingOrder.buyer_email) {
                await sendOrderConfirmationEmail(supabase, existingOrder.buyer_email, {
                  orderId,
                  amount: Number(existingOrder.total_rwf),
                  currency: "RWF",
                  paymentMethod: "Mobile Money",
                }).catch(() => null);
              }
            }
          }
        }

        // Mark linked wallet transaction as completed (do NOT credit wallet for order payments)
        if (txnRecord) {
          const txnMetaStatus = typeof txnRecord?.metadata?.status === "string" ? txnRecord.metadata.status : null;
          if (txnMetaStatus !== "completed") {
            await supabase
              .from("wallet_transactions")
              .update({
                metadata: {
                  ...(txnRecord.metadata ?? {}),
                  status: "completed",
                  updated_at: new Date().toISOString(),
                },
              })
              .eq("id", txnRecord.id)
              .catch(() => null);
          }
        }

        return new Response(JSON.stringify({ success: true, depositId, orderId }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2) Otherwise treat as a wallet top-up (requires an existing pending deposit transaction).
    if (!txnRecord && !legacyTxn) {
      console.warn(`No wallet transaction or order found for deposit ${depositId}`);
      return new Response(JSON.stringify({ success: true, depositId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txnMetaStatus = typeof txnRecord?.metadata?.status === "string"
      ? txnRecord.metadata.status
      : null;

    const legacyStatus = typeof legacyTxn?.metadata?.status === "string"
      ? legacyTxn.metadata.status
      : null;

    if (txnMetaStatus === "completed" || legacyStatus === "completed" ||
        txnMetaStatus === "processing" || legacyStatus === "processing") {
      console.log(`Deposit ${depositId} already processed/processing, skipping`);
      return new Response(JSON.stringify({ success: true, reason: "Already processed", depositId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ATOMIC CLAIM: mark as "processing" only if still pending/null.
    // Single UPDATE with WHERE condition — if two retries race, only one wins.
    const claimTxnId = txnRecord?.id ?? legacyTxn!.id;
    const claimCurrentMeta = txnRecord?.metadata ?? legacyTxn?.metadata ?? {};
    const { data: claimedRows, error: claimErr } = await supabase
      .from("wallet_transactions")
      .update({
        metadata: {
          ...claimCurrentMeta,
          status: "processing",
          claimed_at: new Date().toISOString(),
        },
      })
      .eq("id", claimTxnId)
      .or("metadata->>status.is.null,metadata->>status.eq.pending")
      .select("id");

    // If claimErr or no rows updated, another process already claimed this deposit
    if (claimErr || !claimedRows || claimedRows.length === 0) {
      console.warn(`Deposit ${depositId} claim failed or already claimed, skipping`, claimErr);
      return new Response(JSON.stringify({ success: true, reason: "Already claimed", depositId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = txnRecord?.user_id ?? legacyTxn!.user_id;
    const creditAmount = amountRwf ?? 0;

    // Fetch user profile
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", userId)
      .single();

    if (profileErr || !profile) {
      console.warn(`User not found: ${userId}`);
      // Release the claim so it can be retried
      await supabase
        .from("wallet_transactions")
        .update({ metadata: { ...claimCurrentMeta, status: "pending" } })
        .eq("id", claimTxnId)
        .catch(() => null);
      return new Response(JSON.stringify({ success: true, depositId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const previousBalance = Number(profile.wallet_balance_rwf || 0);

    // Atomic increment — avoids read-then-write race if something slips through
    const { error: updateErr } = await supabase.rpc("increment_wallet_balance", {
      p_user_id: userId,
      p_amount: creditAmount,
    });

    if (updateErr) {
      console.error("Failed to update wallet:", updateErr);
      // Release the claim
      await supabase
        .from("wallet_transactions")
        .update({ metadata: { ...claimCurrentMeta, status: "pending" } })
        .eq("id", claimTxnId)
        .catch(() => null);
      return new Response(JSON.stringify({ success: true, depositId }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark transaction as completed in metadata (single source of truth, works without status column)
    await supabase
      .from("wallet_transactions")
      .update({
        metadata: {
          ...claimCurrentMeta,
          status: "completed",
          amount_rwf: creditAmount,
          updated_at: new Date().toISOString(),
        },
      })
      .eq("id", claimTxnId)
      .catch((e) => console.warn("Failed to mark txn completed:", e));

    console.log(`Wallet credited via PawaPay: User ${userId}, Amount: ${creditAmount} RWF, Deposit: ${depositId}`);

    return new Response(JSON.stringify({ success: true, depositId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in wallet-deposit-callback:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

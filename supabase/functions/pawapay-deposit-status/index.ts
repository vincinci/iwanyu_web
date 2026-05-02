import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { TEMPLATES } from "../_shared/email-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const PAWAPAY_API_KEY = Deno.env.get("PAWAPAY_API_KEY") || "";
const PAWAPAY_API_TOKEN = Deno.env.get("PAWAPAY_API_TOKEN") || "";
const PAWAPAY_ENV = (Deno.env.get("PAWAPAY_ENV") || "live").trim().toLowerCase();
const PAWAPAY_ENDPOINT = Deno.env.get("PAWAPAY_ENDPOINT") || "https://api.pawapay.io";

type DepositStatus = "PROCESSING" | "COMPLETED" | "FAILED";

type DepositStatusResponse = {
  depositId: string;
  status: DepositStatus;
  requestedAmount: string;
  currency: string;
  country: string;
  authorizationUrl?: string;
};

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function parseAmountRwf(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  if (typeof value !== "string") return null;
  const n = Number.parseFloat(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n);
}

function getPawaPayEndpoint(): string {
  const configuredEndpoint = PAWAPAY_ENDPOINT.trim().replace(/\/+$/, "");
  const defaultEndpoint = PAWAPAY_ENV === "sandbox"
    ? "https://api.sandbox.pawapay.io"
    : "https://api.pawapay.io";

  switch (configuredEndpoint) {
    case "https://api.pawapay.cloud":
      return defaultEndpoint;
    case "https://api.sandbox.pawapay.cloud":
      return "https://api.sandbox.pawapay.io";
    default:
      return configuredEndpoint || defaultEndpoint;
  }
}

function getPawaPayCredentials(): string[] {
  return [...new Set([PAWAPAY_API_KEY.trim(), PAWAPAY_API_TOKEN.trim()].filter(Boolean))];
}

async function fetchDepositStatus(
  depositId: string,
  credentials: string[],
  endpoint: string,
): Promise<Response | null> {
  let response: Response | null = null;

  for (const credential of credentials) {
    try {
      response = await fetch(`${endpoint}/v2/deposits/${encodeURIComponent(depositId)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${credential}`,
        },
      });
    } catch {
      response = null;
      continue;
    }

    if (response.status !== 401) {
      break;
    }
  }

  return response;
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

function mapPawaPayDepositStatus(value: unknown): DepositStatus {
  const s = String(value ?? "").trim().toUpperCase();
  if (s === "COMPLETED") return "COMPLETED";
  if (s === "FAILED") return "FAILED";
  return "PROCESSING";
}

function normalizePawaPayAuthorizationUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  const isAllowedHost =
    host === "pawapay.io" || host.endsWith(".pawapay.io") ||
    host === "pawapay.cloud" || host.endsWith(".pawapay.cloud");

  if (!isAllowedHost) return null;

  return url.toString();
}

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

  let step = "init";
  try {
    step = "auth.header";
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Supabase env not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    step = "auth.user";
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    step = "request.parse";
    const body = await req.json().catch(() => ({}));
    const depositId = String(body?.depositId ?? "").trim();
    if (!depositId || !isUuid(depositId)) {
      return new Response(JSON.stringify({ error: "Missing/invalid depositId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    step = "pawapay.credentials";
    const credentials = getPawaPayCredentials();
    if (credentials.length === 0) {
      return new Response(JSON.stringify({ error: "PawaPay API credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    step = "pawapay.request";
    const endpoint = getPawaPayEndpoint();
    const pawaRes = await fetchDepositStatus(depositId, credentials, endpoint);
    if (!pawaRes) {
      return new Response(JSON.stringify({ error: "Failed to reach PawaPay" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!pawaRes.ok) {
      const text = await pawaRes.text();
      return new Response(JSON.stringify({ error: `PawaPay error: ${pawaRes.status}`, details: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    step = "pawapay.parse";
    const raw = await pawaRes.json() as {
      status?: "FOUND" | "NOT_FOUND";
      authorizationUrl?: string;
      authenticationUrl?: string;
      auhtorizationUrl?: string;
      data?: {
        depositId?: string;
        status?: string;
        amount?: string;
        currency?: string;
        country?: string;
        providerTransactionId?: string;
        authorizationUrl?: string;
        authenticationUrl?: string;
        auhtorizationUrl?: string;
      };
    };

    if (raw.status !== "FOUND" || !raw.data?.depositId) {
      const responseBody: DepositStatusResponse = {
        depositId,
        status: "PROCESSING",
        requestedAmount: "0",
        currency: "RWF",
        country: "RWA",
      };
      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = raw.data;
    const mappedStatus = mapPawaPayDepositStatus(data.status);
    const authorizationUrl = normalizePawaPayAuthorizationUrl(
      data.authorizationUrl ?? data.authenticationUrl ?? data.auhtorizationUrl ??
        raw.authorizationUrl ?? raw.authenticationUrl ?? raw.auhtorizationUrl,
    );
    const responseBody: DepositStatusResponse = {
      depositId: data.depositId,
      status: mappedStatus,
      requestedAmount: String(data.amount ?? "0"),
      currency: String(data.currency ?? "RWF"),
      country: String(data.country ?? "RWA"),
    };

    if (authorizationUrl) {
      responseBody.authorizationUrl = authorizationUrl;
    }

    // Optional reconciliation: if completed, mark order/wallet state.
    if (mappedStatus === "COMPLETED") {
      const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
      const depositAmount = parseAmountRwf(data.amount);

      // 1) Try to finalize an order (depositId = orderId).
      const { data: order } = await supabase
        .from("orders")
        .select("id, buyer_user_id, total_rwf, payment_verified_at, payment, discount_code, buyer_email")
        .eq("id", depositId)
        .eq("buyer_user_id", user.id)
        .maybeSingle();

      if (order) {
        if (!order.payment_verified_at) {
          if (depositAmount != null && depositAmount < Number(order.total_rwf)) {
            console.warn("PawaPay deposit amount is less than expected order total", {
              orderId: order.id,
              expected: order.total_rwf,
              got: depositAmount,
            });
          } else {
            const verifiedAt = new Date().toISOString();
            const nextPayment = {
              ...(order.payment ?? {}),
              provider: "pawapay",
              mode: "redirect",
              verified: true,
              verified_at: verifiedAt,
              pawapay_status: data.status ?? null,
              pawapay_deposit_id: depositId,
              provider_transaction_id: data.providerTransactionId ?? null,
              amount: depositAmount ?? null,
              currency: responseBody.currency,
            };

            const { data: updatedRows } = await supabase
              .from("orders")
              .update({
                status: "Processing",
                payment_verified_at: verifiedAt,
                payment: nextPayment,
                updated_at: verifiedAt,
              })
              .eq("id", depositId)
              .is("payment_verified_at", null)
              .select("id");

            if (updatedRows && updatedRows.length > 0) {
              await supabase
                .from("order_items")
                .update({ status: "Processing", updated_at: verifiedAt })
                .eq("order_id", depositId)
                .catch(() => null);

              // Create vendor payout rows (idempotent)
              try {
                const { data: orderItems } = await supabase
                  .from("order_items")
                  .select("vendor_id, vendor_payout_rwf")
                  .eq("order_id", depositId);

                if (orderItems && orderItems.length > 0) {
                  const vendorTotals = new Map<string, number>();
                  for (const item of orderItems) {
                    const current = vendorTotals.get(item.vendor_id) || 0;
                    vendorTotals.set(item.vendor_id, current + (item.vendor_payout_rwf || 0));
                  }

                  const payoutRows = Array.from(vendorTotals.entries()).map(([vendorId, amount]) => ({
                    vendor_id: vendorId,
                    order_id: depositId,
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
                if (order.discount_code) {
                  await supabase.rpc("increment_discount_redemption", { p_code: order.discount_code });
                }
              } catch (e) {
                console.warn("Failed to increment discount redemption", e);
              }

              if (order.buyer_email) {
                await sendOrderConfirmationEmail(supabase, order.buyer_email, {
                  orderId: depositId,
                  amount: Number(order.total_rwf),
                  currency: "RWF",
                  paymentMethod: "Mobile Money",
                }).catch(() => null);
              }
            }
          }
        }

        // Mark wallet transaction (if present) as completed for this buyer
        await supabase
          .from("wallet_transactions")
          .update({ status: "completed", updated_at: new Date().toISOString() })
          .eq("external_transaction_id", depositId)
          .eq("user_id", user.id)
          .neq("status", "completed")
          .catch(() => null);

        return new Response(JSON.stringify(responseBody), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 2) Otherwise, try to reconcile a wallet top-up for this user.
      const { data: txn } = await supabase
        .from("wallet_transactions")
        .select("id, user_id, status")
        .eq("external_transaction_id", depositId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (txn && txn.status !== "completed" && depositAmount != null && depositAmount > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("wallet_balance_rwf")
          .eq("id", user.id)
          .maybeSingle();

        if (profile) {
          const previousBalance = Number(profile.wallet_balance_rwf || 0);
          const newBalance = previousBalance + depositAmount;
          await supabase
            .from("profiles")
            .update({ wallet_balance_rwf: newBalance })
            .eq("id", user.id)
            .catch(() => null);

          await supabase
            .from("wallet_transactions")
            .update({
              status: "completed",
              previous_balance_rwf: previousBalance,
              new_balance_rwf: newBalance,
              updated_at: new Date().toISOString(),
            })
            .eq("id", txn.id)
            .catch(() => null);
        }
      }
    }

    return new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Error in pawapay-deposit-status", { step, error: msg });
    return new Response(JSON.stringify({ error: msg, step }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

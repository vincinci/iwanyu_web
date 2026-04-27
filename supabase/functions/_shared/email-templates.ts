/**
 * Shared email templates for iwanyu transactional emails.
 * All emails use a clean, minimalistic design with the Iwanyu logo,
 * an orange accent, and table-based layout for maximum email client compatibility.
 */

const LOGO_URL = "https://iwanyu.store/logo.png";
const BRAND_ORANGE = "#f07924";
const SITE_URL = "https://iwanyu.store";

// ─── Layout wrapper ────────────────────────────────────────────────────────

export function emailLayout(body: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="format-detection" content="telephone=no,address=no,email=no,date=no,url=no">
  <title>iwanyu</title>
  <style>
    * { box-sizing: border-box; }
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
    table { border-spacing: 0; border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: ${BRAND_ORANGE}; }
    @media only screen and (max-width: 600px) {
      .email-card { border-radius: 0 !important; }
      .email-body { padding: 28px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ""}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f3f4f6;">
    <tr>
      <td align="center" style="padding:40px 16px 48px;">

        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:540px;">

          <!-- Logo -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="${SITE_URL}" style="text-decoration:none;">
                <img src="${LOGO_URL}" alt="iwanyu" width="130" style="display:block;width:130px;height:auto;">
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td class="email-card" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.07);">

              <!-- Orange top accent bar -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:${BRAND_ORANGE};height:4px;font-size:0;line-height:0;">&nbsp;</td>
                </tr>
              </table>

              <!-- Email body -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="email-body" style="padding:36px 40px;">
                    ${body}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:28px;text-align:center;font-size:12px;color:#9ca3af;line-height:1.7;">
              <p style="margin:0;">© 2026 iwanyu &nbsp;·&nbsp;
                <a href="${SITE_URL}" style="color:${BRAND_ORANGE};text-decoration:none;">iwanyu.store</a>
              </p>
              <p style="margin:4px 0 0;">Rwanda's live bidding marketplace</p>
              <p style="margin:8px 0 0;">
                <a href="${SITE_URL}/account" style="color:#d1d5db;text-decoration:none;font-size:11px;">Manage notifications</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Reusable building blocks ──────────────────────────────────────────────

export function ctaButton(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
    <tr>
      <td style="border-radius:10px;background:${BRAND_ORANGE};">
        <a href="${href}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;letter-spacing:-0.2px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function amountBox(label: string, amount: string | number, currency = "RWF"): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr>
      <td style="background:#fff7f0;border:1.5px solid #fde0c8;border-radius:12px;padding:22px 24px;text-align:center;">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.1em;">${label}</p>
        <p style="margin:0;font-size:34px;font-weight:800;color:${BRAND_ORANGE};line-height:1;">${Number(amount).toLocaleString()} <span style="font-size:14px;font-weight:600;color:#d1d5db;">${currency}</span></p>
      </td>
    </tr>
  </table>`;
}

export function detailRows(rows: Array<[string, string]>): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;border-top:1px solid #f3f4f6;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:10px 0;font-size:14px;color:#9ca3af;border-bottom:1px solid #f3f4f6;">${label}</td>
        <td style="padding:10px 0;font-size:14px;font-weight:600;color:#111111;text-align:right;border-bottom:1px solid #f3f4f6;">${value}</td>
      </tr>`).join("")}
  </table>`;
}

export function divider(): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr><td style="border-top:1px solid #f3f4f6;font-size:0;line-height:0;">&nbsp;</td></tr>
  </table>`;
}

export function statusBadge(text: string, color = BRAND_ORANGE): string {
  return `<span style="display:inline-block;padding:4px 12px;background:${color}18;color:${color};font-size:12px;font-weight:700;border-radius:20px;text-transform:uppercase;letter-spacing:0.06em;">${text}</span>`;
}

// ─── All email templates ────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: (ctx: Record<string, unknown>) => string;
  preheader?: (ctx: Record<string, unknown>) => string;
  html: (ctx: Record<string, unknown>) => string;
}

export const TEMPLATES: Record<string, EmailTemplate> = {

  // ── Welcome ────────────────────────────────────────────────────────────
  welcome: {
    subject: () => "Welcome to iwanyu! 🎉",
    preheader: (ctx) => `Hey ${ctx.name || "there"}, your account is ready. Start exploring Rwanda's live marketplace.`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:${BRAND_ORANGE};text-transform:uppercase;letter-spacing:0.08em;">Welcome aboard</p>
      <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Hey ${ctx.name || "there"}, great to have you!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your iwanyu account is ready. Explore thousands of products, join live auctions, and bid to win — all from Rwanda's favourite live marketplace.</p>
      ${divider()}
      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111111;">Here's what you can do:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">🛍️&nbsp;&nbsp;Browse and shop thousands of products</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">🎥&nbsp;&nbsp;Watch live auctions and place bids in real time</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">🏆&nbsp;&nbsp;Win exclusive deals at unbeatable prices</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">🏪&nbsp;&nbsp;Open your own store and start selling</td></tr>
      </table>
      ${ctaButton("Start Shopping", SITE_URL)}
    `, `Hey ${ctx.name || "there"}, your account is ready.`),
  },

  // ── Order confirmation ─────────────────────────────────────────────────
  order_confirmation: {
    subject: (ctx) => `Order confirmed – #${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`,
    preheader: (ctx) => `Your payment of ${Number(ctx.amount || 0).toLocaleString()} RWF has been confirmed. We're on it!`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Payment Confirmed", "#16a34a")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Thank you for your order!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your payment was successful and your order is being prepared. We'll notify you as soon as it ships.</p>
      ${amountBox("Amount Paid", ctx.amount as number, String(ctx.currency || "RWF"))}
      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ["Date", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
        ...(ctx.itemCount ? [["Items", `${ctx.itemCount} item${Number(ctx.itemCount) > 1 ? "s" : ""}`] as [string, string]] : []),
      ])}
      ${ctaButton("View Order", `${SITE_URL}/orders`)}
      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Questions about your order? Visit <a href="${SITE_URL}/help" style="color:${BRAND_ORANGE};text-decoration:none;">iwanyu.store/help</a> or reply to this email.</p>
    `),
  },

  // ── Deposit success ────────────────────────────────────────────────────
  deposit_success: {
    subject: (ctx) => `Wallet topped up – ${Number(ctx.amount || 0).toLocaleString()} RWF added`,
    preheader: (ctx) => `${Number(ctx.amount || 0).toLocaleString()} RWF has been added to your iwanyu wallet. Ready to bid!`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Deposit Successful", "#16a34a")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your wallet has been topped up!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your funds are ready. Use them to bid in live auctions or shop your favourite products on iwanyu.</p>
      ${amountBox("Amount Added", ctx.amount as number)}
      ${ctx.newBalance != null ? detailRows([["New Wallet Balance", `${Number(ctx.newBalance).toLocaleString()} RWF`]]) : ""}
      ${ctaButton("Go to Live Auctions", `${SITE_URL}/live`)}
    `),
  },

  // ── Withdrawal success ─────────────────────────────────────────────────
  withdrawal_success: {
    subject: (ctx) => `Withdrawal processed – ${Number(ctx.amount || 0).toLocaleString()} RWF`,
    preheader: (ctx) => `Your withdrawal of ${Number(ctx.amount || 0).toLocaleString()} RWF is on its way to your mobile money account.`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Withdrawal Processed", "#16a34a")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your withdrawal is on its way!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your funds have been sent to your mobile money account. They should arrive within minutes.</p>
      ${amountBox("Amount Withdrawn", ctx.amount as number)}
      ${detailRows([
        ...(ctx.phone ? [["Mobile Money", String(ctx.phone)] as [string, string]] : []),
        ["Date", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}
      ${ctaButton("View Wallet", `${SITE_URL}/account`)}
    `),
  },

  // ── Bid won ────────────────────────────────────────────────────────────
  bid_won: {
    subject: (ctx) => `You won the auction! 🏆 – ${ctx.productName || "Item"}`,
    preheader: (ctx) => `Congratulations! Your bid of ${Number(ctx.amount || 0).toLocaleString()} RWF won the auction for ${ctx.productName || "the item"}.`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Auction Won", "#7c3aed")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Congratulations, you won! 🎉</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your bid was the highest and you've won the auction. The item will be processed for delivery shortly.</p>
      ${ctx.productImage ? `<img src="${ctx.productImage}" alt="${ctx.productName || "Item"}" width="100%" style="display:block;width:100%;max-height:200px;object-fit:cover;border-radius:10px;margin:20px 0;">` : ""}
      <p style="margin:20px 0 4px;font-size:18px;font-weight:700;color:#111111;">${ctx.productName || "Auction item"}</p>
      ${amountBox("Winning Bid", ctx.amount as number)}
      ${detailRows([
        ...(ctx.sessionId ? [["Session", `#${String(ctx.sessionId).slice(0, 8).toUpperCase()}`] as [string, string]] : []),
        ["Date", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}
      ${ctaButton("View Your Orders", `${SITE_URL}/orders`)}
    `),
  },

  // ── Order completed (delivered) ────────────────────────────────────────
  order_completed: {
    subject: (ctx) => `Order delivered – #${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`,
    preheader: () => "Your order has been delivered. We hope you love it!",
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Delivered", "#16a34a")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your order has arrived!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">We hope you love your purchase. If you have any questions or concerns, our support team is here to help.</p>
      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ["Delivered", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}
      ${ctaButton("Rate Your Experience", `${SITE_URL}/orders`)}
      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Have an issue with your order? Contact us at <a href="${SITE_URL}/help" style="color:${BRAND_ORANGE};text-decoration:none;">iwanyu.store/help</a></p>
    `),
  },

  // ── Order shipped ──────────────────────────────────────────────────────
  order_shipped: {
    subject: (ctx) => `Your order #${String(ctx.orderId || "").slice(0, 8).toUpperCase()} has shipped`,
    preheader: (ctx) => `Great news — your order${ctx.trackingNumber ? ` (${ctx.trackingNumber})` : ""} is on its way!`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Shipped", BRAND_ORANGE)}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your order is on its way!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Good news — your order has been shipped and is heading to you. Estimated delivery is usually within 1–3 business days.</p>
      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ...(ctx.trackingNumber ? [["Tracking Number", String(ctx.trackingNumber)] as [string, string]] : []),
      ])}
      ${ctaButton("Track Order", `${SITE_URL}/orders`)}
    `),
  },

  // ── Order cancelled ────────────────────────────────────────────────────
  order_cancelled: {
    subject: (ctx) => `Order #${String(ctx.orderId || "").slice(0, 8).toUpperCase()} has been cancelled`,
    preheader: () => "Your order was cancelled. If you were charged, a refund is on its way.",
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Cancelled", "#dc2626")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your order has been cancelled</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your order has been cancelled. ${ctx.refund ? "A refund has been initiated and should reflect in your account within 3–5 business days." : "No charge was made."}</p>
      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ...(ctx.reason ? [["Reason", String(ctx.reason)] as [string, string]] : []),
      ])}
      ${ctaButton("Shop Again", SITE_URL)}
      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Need help? Reach us at <a href="${SITE_URL}/help" style="color:${BRAND_ORANGE};text-decoration:none;">iwanyu.store/help</a></p>
    `),
  },

  // ── Vendor: new order received ─────────────────────────────────────────
  vendor_new_order: {
    subject: (ctx) => `New order received – #${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`,
    preheader: (ctx) => `A customer just ordered from your store${ctx.storeName ? ` (${ctx.storeName})` : ""}. Review it now.`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("New Order", "#2563eb")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">You have a new order!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">A customer has placed an order from your store. Log in to your seller dashboard to review and process it promptly.</p>
      ${amountBox("Order Value", ctx.amount as number || 0)}
      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ...(ctx.storeName ? [["Store", String(ctx.storeName)] as [string, string]] : []),
        ["Received", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}
      ${ctaButton("View in Dashboard", `${SITE_URL}/seller/orders`)}
    `),
  },

  // ── Vendor: payout completed ───────────────────────────────────────────
  payout_completed: {
    subject: (ctx) => `Payout of ${Number(ctx.amount || 0).toLocaleString()} RWF processed`,
    preheader: (ctx) => `Your earnings of ${Number(ctx.amount || 0).toLocaleString()} RWF have been sent to your mobile money.`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Payout Sent", "#16a34a")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your earnings are on the way!</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Your payout has been processed and is being transferred to your mobile money account. It should arrive shortly.</p>
      ${amountBox("Payout Amount", ctx.amount as number)}
      ${detailRows([
        ...(ctx.orderId ? [["Order Reference", `#${String(ctx.orderId).slice(0, 8).toUpperCase()}`] as [string, string]] : []),
        ["Date", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}
      ${ctaButton("View Earnings", `${SITE_URL}/seller/dashboard`)}
    `),
  },

  // ── Seller store approved ──────────────────────────────────────────────
  seller_approved: {
    subject: (ctx) => `Your store "${ctx.storeName || "Store"}" is live on iwanyu! 🎉`,
    preheader: (ctx) => `Congratulations! Your store ${ctx.storeName || ""} has been approved. Start listing products now.`,
    html: (ctx) => emailLayout(`
      <p style="margin:0 0 8px;">${statusBadge("Store Approved", "#16a34a")}</p>
      <h1 style="margin:12px 0 16px;font-size:24px;font-weight:800;color:#111111;line-height:1.25;">Your store is live! 🏪</h1>
      <p style="margin:0;font-size:15px;color:#6b7280;line-height:1.7;">Congratulations — your store <strong style="color:#111111;">${ctx.storeName || ""}</strong> has been reviewed and approved. You can now start listing products and selling on iwanyu.</p>
      ${divider()}
      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111111;">Getting started:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">📦&nbsp;&nbsp;Add your first product from the seller dashboard</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">🎥&nbsp;&nbsp;Go live and auction your products in real time</td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#6b7280;">💰&nbsp;&nbsp;Track your earnings and request withdrawals</td></tr>
      </table>
      ${ctaButton("Open Seller Dashboard", `${SITE_URL}/seller/dashboard`)}
    `),
  },

};

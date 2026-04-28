/**
 * Shared email templates for iwanyu transactional emails.
 */

const LOGO_URL = "https://iwanyu.store/logo.png";
const BRAND_ORANGE = "#f07924";
const SITE_URL = "https://iwanyu.store";
const SUPPORT_EMAIL = "hello@iwanyu.store";

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
    body { margin: 0; padding: 0; background-color: #f0f0f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
    table { border-spacing: 0; border-collapse: collapse; }
    img { border: 0; outline: none; text-decoration: none; }
    a { color: ${BRAND_ORANGE}; }
    @media only screen and (max-width: 600px) {
      .email-card { border-radius: 0 !important; }
      .email-body { padding: 28px 20px !important; }
      .email-header { padding: 18px 20px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f0f0f0;">
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;color:#f0f0f0;">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;</div>` : ""}

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background-color:#f0f0f0;">
    <tr>
      <td align="center" style="padding:28px 12px 44px;">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:560px;">

          <tr>
            <td class="email-card" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.09);">

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr><td style="background:${BRAND_ORANGE};height:5px;font-size:0;line-height:0;">&nbsp;</td></tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="email-header" style="padding:22px 36px 18px;border-bottom:1px solid #f3f4f6;">
                    <a href="${SITE_URL}" style="text-decoration:none;">
                      <img src="${LOGO_URL}" alt="iwanyu" width="105" style="display:block;width:105px;height:auto;">
                    </a>
                  </td>
                </tr>
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td class="email-body" style="padding:32px 36px 36px;color:#111111;">
                    ${body}
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding-top:22px;text-align:center;font-size:12px;color:#9ca3af;line-height:1.9;">
              <p style="margin:0;font-weight:600;color:#6b7280;">iwanyu &mdash; Rwanda's live bidding marketplace</p>
              <p style="margin:1px 0 8px;font-size:11px;">Kigali, Rwanda &nbsp;&middot;&nbsp; <a href="mailto:${SUPPORT_EMAIL}" style="color:#9ca3af;text-decoration:none;">${SUPPORT_EMAIL}</a></p>
              <p style="margin:0;font-size:11px;">
                <a href="${SITE_URL}/help" style="color:#b0b0b0;text-decoration:none;">Help Center</a>
                &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}/privacy" style="color:#b0b0b0;text-decoration:none;">Privacy Policy</a>
                &nbsp;&middot;&nbsp;
                <a href="${SITE_URL}/account" style="color:#b0b0b0;text-decoration:none;">Unsubscribe</a>
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">&copy; 2026 iwanyu. All rights reserved.</p>
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
      <td style="border-radius:8px;background:${BRAND_ORANGE};">
        <a href="${href}" style="display:inline-block;padding:14px 30px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;">${label}</a>
      </td>
    </tr>
  </table>`;
}

export function amountBox(label: string, amount: string | number, currency = "RWF"): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:24px 0;">
    <tr>
      <td style="background:#fff8f2;border:1.5px solid #fde0c8;border-radius:10px;padding:22px 24px;text-align:center;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.12em;">${label}</p>
        <p style="margin:0;font-size:38px;font-weight:800;color:${BRAND_ORANGE};line-height:1;letter-spacing:-1px;">${Number(amount).toLocaleString()} <span style="font-size:16px;font-weight:600;color:#d1d5db;letter-spacing:0;">${currency}</span></p>
      </td>
    </tr>
  </table>`;
}

export function detailRows(rows: Array<[string, string]>): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:20px 0;">
    ${rows.map(([label, value]) => `
      <tr>
        <td style="padding:11px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${label}</td>
        <td style="padding:11px 0;font-size:14px;font-weight:600;color:#111111;text-align:right;border-bottom:1px solid #f3f4f6;">${value}</td>
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

// ─── Templates ────────────────────────────────────────────────────────────

export interface EmailTemplate {
  subject: (ctx: Record<string, unknown>) => string;
  preheader?: (ctx: Record<string, unknown>) => string;
  html: (ctx: Record<string, unknown>) => string;
}

export const TEMPLATES: Record<string, EmailTemplate> = {

  welcome: {
    subject: (ctx) => `Welcome to iwanyu${ctx.name ? `, ${ctx.name}` : ""}!`,
    preheader: () => `Your account is ready. Start exploring Rwanda's live marketplace.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Account Created", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Welcome${ctx.name ? `, ${ctx.name}` : ""} — you're all set. 👋</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">Your iwanyu account is live. You can now shop products, join live auctions, and bid in real time — all from Rwanda's fastest-growing live marketplace.</p>

      ${divider()}

      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111111;">Here's what you can do on iwanyu:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f9fafb;">
          <strong style="color:#111;">🎥 Watch live auctions</strong><br>
          <span style="color:#6b7280;font-size:13px;">Join a live session, see products in real time, and bid to win.</span>
        </td></tr>
        <tr><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f9fafb;">
          <strong style="color:#111;">🛍️ Shop without bidding</strong><br>
          <span style="color:#6b7280;font-size:13px;">Browse thousands of products and buy instantly at listed prices.</span>
        </td></tr>
        <tr><td style="padding:8px 0;font-size:14px;border-bottom:1px solid #f9fafb;">
          <strong style="color:#111;">💳 Top up your wallet</strong><br>
          <span style="color:#6b7280;font-size:13px;">Add funds via Mobile Money to bid and pay seamlessly.</span>
        </td></tr>
        <tr><td style="padding:8px 0;font-size:14px;">
          <strong style="color:#111;">🏪 Open your own store</strong><br>
          <span style="color:#6b7280;font-size:13px;">Apply to sell — go live and auction your products directly to buyers.</span>
        </td></tr>
      </table>

      ${ctaButton("Explore iwanyu", SITE_URL)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Questions? We're always here — reply to this email or visit <a href="${SITE_URL}/help" style="color:${BRAND_ORANGE};text-decoration:none;">our Help Center</a>.
      </p>
    `, `Your iwanyu account is ready.`),
  },

  order_confirmation: {
    subject: (ctx) => `Order confirmed – #${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`,
    preheader: (ctx) => `Your payment of ${Number(ctx.amount || 0).toLocaleString()} RWF was successful. Your order is being prepared.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Order Confirmed", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Your order is confirmed 🛍️</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        We've received your payment and your order is being prepared. You'll get another email as soon as it ships.
      </p>

      ${amountBox("Amount Paid", ctx.amount as number, String(ctx.currency || "RWF"))}

      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ["Date", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
        ...(ctx.itemCount ? [["Items", `${ctx.itemCount} item${Number(ctx.itemCount) > 1 ? "s" : ""}`] as [string, string]] : []),
        ...(ctx.paymentMethod ? [["Payment", String(ctx.paymentMethod)] as [string, string]] : []),
      ])}

      ${ctaButton("View My Order", `${SITE_URL}/orders`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Something wrong? Reply to this email or visit <a href="${SITE_URL}/help" style="color:${BRAND_ORANGE};text-decoration:none;">our Help Center</a>.
      </p>
    `),
  },

  deposit_success: {
    subject: (ctx) => `You topped up ${Number(ctx.amount || 0).toLocaleString()} RWF on iwanyu`,
    preheader: (ctx) => `${Number(ctx.amount || 0).toLocaleString()} RWF is now in your wallet. New balance: ${Number(ctx.newBalance || 0).toLocaleString()} RWF.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Deposit Confirmed", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">
        ${ctx.name ? `Hey ${ctx.name} — your` : "Your"} wallet is topped up! 🎉
      </h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        We've received your payment and credited <strong>${Number(ctx.amount || 0).toLocaleString()} RWF</strong> to your iwanyu wallet. The funds are available right now — no holds, no delays.
      </p>

      ${amountBox("Amount Credited", ctx.amount as number)}

      ${detailRows([
        ["New Wallet Balance", `${Number(ctx.newBalance ?? 0).toLocaleString()} RWF`],
        ["Credited on", String(ctx.date || new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" }))],
        ...(ctx.ref ? [["Transaction Ref", String(ctx.ref)] as [string, string]] : []),
      ])}

      ${divider()}

      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111111;">What you can do right now</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:7px 0;font-size:14px;color:#4b5563;line-height:1.5;border-bottom:1px solid #f9fafb;">
          <span style="color:${BRAND_ORANGE};font-weight:700;">→</span>&nbsp;
          <strong style="color:#111;">Bid in live auctions</strong> — jump into a session and place real-time bids
        </td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#4b5563;line-height:1.5;border-bottom:1px solid #f9fafb;">
          <span style="color:${BRAND_ORANGE};font-weight:700;">→</span>&nbsp;
          <strong style="color:#111;">Shop instantly</strong> — pay for any product at checkout using your balance
        </td></tr>
        <tr><td style="padding:7px 0;font-size:14px;color:#4b5563;line-height:1.5;">
          <span style="color:${BRAND_ORANGE};font-weight:700;">→</span>&nbsp;
          <strong style="color:#111;">Withdraw anytime</strong> — send unused funds back to your Mobile Money
        </td></tr>
      </table>

      ${ctaButton("Browse Live Auctions", `${SITE_URL}/live`)}

      ${divider()}
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
        Didn't make this deposit? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">Contact us immediately</a> and we'll investigate right away.
      </p>
    `, `${Number(ctx.amount || 0).toLocaleString()} RWF is now in your iwanyu wallet.`),
  },

  withdrawal_success: {
    subject: (ctx) => `Withdrawal of ${Number(ctx.amount || 0).toLocaleString()} RWF is on its way`,
    preheader: (ctx) => `Your ${Number(ctx.amount || 0).toLocaleString()} RWF withdrawal has been sent to your Mobile Money.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Withdrawal Processed", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Your withdrawal is on its way 💸</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        We've processed your request and sent <strong>${Number(ctx.amount || 0).toLocaleString()} RWF</strong> to your Mobile Money account. It should arrive within a few minutes.
      </p>

      ${amountBox("Amount Withdrawn", ctx.amount as number)}

      ${detailRows([
        ...(ctx.phone ? [["Mobile Money", String(ctx.phone)] as [string, string]] : []),
        ["Processed on", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })],
        ...(ctx.ref ? [["Reference", String(ctx.ref)] as [string, string]] : []),
      ])}

      ${ctaButton("View My Wallet", `${SITE_URL}/wallet`)}

      ${divider()}
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
        Didn't request this withdrawal? <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">Contact our support team</a> immediately.
      </p>
    `),
  },

  bid_won: {
    subject: (ctx) => `You won the auction! 🏆 — ${ctx.productName || "Item"}`,
    preheader: (ctx) => `Your bid of ${Number(ctx.amount || 0).toLocaleString()} RWF was the highest. ${ctx.productName || "The item"} is yours!`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Auction Won 🏆", "#7c3aed")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">
        Congratulations${ctx.name ? `, ${ctx.name}` : ""}! You won. 🎉
      </h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        Your bid was the highest and you've won the auction for <strong>${ctx.productName || "the item"}</strong>. We're now processing your order and will be in touch shortly.
      </p>

      ${ctx.productImage ? `<img src="${ctx.productImage}" alt="${ctx.productName || "Item"}" width="100%" style="display:block;width:100%;max-height:200px;object-fit:cover;border-radius:10px;margin:20px 0;">` : ""}

      ${amountBox("Winning Bid", ctx.amount as number)}

      ${detailRows([
        ["Item", String(ctx.productName || "Auction item")],
        ...(ctx.sessionId ? [["Session", `#${String(ctx.sessionId).slice(0, 8).toUpperCase()}`] as [string, string]] : []),
        ["Won on", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}

      ${ctaButton("View My Order", `${SITE_URL}/orders`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Questions about your order? Reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">${SUPPORT_EMAIL}</a>.
      </p>
    `),
  },

  order_completed: {
    subject: (ctx) => `Order delivered — #${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`,
    preheader: () => "Your order has been marked as delivered. We hope you love what you got!",
    html: (ctx) => emailLayout(`
      ${statusBadge("Delivered", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Your order has arrived! 📦</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        Great news — your order has been delivered. We hope you're happy with your purchase. If anything isn't right, we're here to help.
      </p>

      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ["Delivered", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}

      ${ctaButton("Leave a Review", `${SITE_URL}/orders`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Issue with your order? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">${SUPPORT_EMAIL}</a> within 7 days.
      </p>
    `),
  },

  order_shipped: {
    subject: (ctx) => `Order #${String(ctx.orderId || "").slice(0, 8).toUpperCase()} is on its way`,
    preheader: (ctx) => `Your order is heading your way${ctx.trackingNumber ? ` — tracking: ${ctx.trackingNumber}` : ""}. Estimated delivery: 1–3 business days.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Shipped", BRAND_ORANGE)}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Your order is on its way! 🚚</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        Your order has left the seller and is heading to you. Delivery usually takes 1–3 business days within Kigali, a bit longer upcountry.
      </p>

      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ["Shipped on", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
        ...(ctx.trackingNumber ? [["Tracking #", String(ctx.trackingNumber)] as [string, string]] : []),
      ])}

      ${ctaButton("View Order Status", `${SITE_URL}/orders`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Not getting your delivery? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">${SUPPORT_EMAIL}</a>.
      </p>
    `),
  },

  order_cancelled: {
    subject: (ctx) => `Order #${String(ctx.orderId || "").slice(0, 8).toUpperCase()} has been cancelled`,
    preheader: () => "Your order was cancelled. If you were charged, your refund is on its way.",
    html: (ctx) => emailLayout(`
      ${statusBadge("Order Cancelled", "#dc2626")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Your order has been cancelled</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        Your order <strong>#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}</strong> has been cancelled.
        ${ctx.refund ? " A full refund has been initiated and should reflect in your iwanyu wallet within minutes." : " No charge was made to your account."}
      </p>

      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ...(ctx.reason ? [["Reason", String(ctx.reason)] as [string, string]] : []),
        ["Cancelled on", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}

      ${ctaButton("Shop Again", SITE_URL)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Questions? Reply to this email or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">${SUPPORT_EMAIL}</a>.
      </p>
    `),
  },

  vendor_new_order: {
    subject: (ctx) => `New order received — #${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`,
    preheader: (ctx) => `A customer just ordered from ${ctx.storeName ? `your store (${ctx.storeName})` : "your store"}. Log in to process it now.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("New Order", "#2563eb")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">You've got a new order! 🛒</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        A customer just placed an order${ctx.storeName ? ` from <strong>${ctx.storeName}</strong>` : ""}. Log in to your seller dashboard to review and process it.
      </p>

      ${amountBox("Order Value", ctx.amount as number || 0)}

      ${detailRows([
        ["Order ID", `#${String(ctx.orderId || "").slice(0, 8).toUpperCase()}`],
        ...(ctx.storeName ? [["Store", String(ctx.storeName)] as [string, string]] : []),
        ...(ctx.itemCount ? [["Items", `${ctx.itemCount} item${Number(ctx.itemCount) > 1 ? "s" : ""}`] as [string, string]] : []),
        ["Received", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })],
      ])}

      ${ctaButton("Process This Order", `${SITE_URL}/seller/orders`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Process orders promptly to maintain your seller rating. Buyers expect updates within 24 hours.
      </p>
    `),
  },

  payout_completed: {
    subject: (ctx) => `Payout of ${Number(ctx.amount || 0).toLocaleString()} RWF sent to your account`,
    preheader: (ctx) => `Your earnings of ${Number(ctx.amount || 0).toLocaleString()} RWF have been sent to your Mobile Money.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Payout Sent", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">Your earnings are on the way! 💰</h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        Your payout has been processed and transferred to your Mobile Money account. Funds should arrive within minutes.
      </p>

      ${amountBox("Payout Amount", ctx.amount as number)}

      ${detailRows([
        ...(ctx.phone ? [["Mobile Money", String(ctx.phone)] as [string, string]] : []),
        ...(ctx.orderId ? [["Order Ref", `#${String(ctx.orderId).slice(0, 8).toUpperCase()}`] as [string, string]] : []),
        ["Sent on", new Date().toLocaleDateString("en-RW", { day: "numeric", month: "long", year: "numeric" })],
      ])}

      ${ctaButton("View Earnings Dashboard", `${SITE_URL}/seller/dashboard`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Funds not arriving? Contact us at <a href="mailto:${SUPPORT_EMAIL}" style="color:${BRAND_ORANGE};text-decoration:none;">${SUPPORT_EMAIL}</a> and we'll investigate immediately.
      </p>
    `),
  },

  seller_approved: {
    subject: (ctx) => `Your store "${ctx.storeName || "Store"}" is live on iwanyu! 🎉`,
    preheader: (ctx) => `${ctx.storeName || "Your store"} has been approved. You can now list products and sell on iwanyu.`,
    html: (ctx) => emailLayout(`
      ${statusBadge("Store Approved", "#16a34a")}
      <h1 style="margin:16px 0 10px;font-size:22px;font-weight:800;color:#111111;line-height:1.3;">
        ${ctx.name ? `Congratulations, ${ctx.name}!` : "Congratulations!"} Your store is live. 🏪
      </h1>
      <p style="margin:0;font-size:15px;color:#4b5563;line-height:1.7;">
        <strong>${ctx.storeName || "Your store"}</strong> has been reviewed and approved by our team. You're ready to start selling on iwanyu right now.
      </p>

      ${divider()}

      <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#111111;">Get started in 3 steps:</p>
      <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
        <tr><td style="padding:9px 0;font-size:14px;color:#4b5563;line-height:1.5;border-bottom:1px solid #f9fafb;">
          <span style="display:inline-block;width:22px;height:22px;background:${BRAND_ORANGE};color:#fff;font-size:12px;font-weight:700;border-radius:50%;text-align:center;line-height:22px;margin-right:8px;">1</span>
          <strong style="color:#111;">Add your first product</strong> — upload photos, set your price, and publish.
        </td></tr>
        <tr><td style="padding:9px 0;font-size:14px;color:#4b5563;line-height:1.5;border-bottom:1px solid #f9fafb;">
          <span style="display:inline-block;width:22px;height:22px;background:${BRAND_ORANGE};color:#fff;font-size:12px;font-weight:700;border-radius:50%;text-align:center;line-height:22px;margin-right:8px;">2</span>
          <strong style="color:#111;">Go live</strong> — start a live session and auction your products to buyers.
        </td></tr>
        <tr><td style="padding:9px 0;font-size:14px;color:#4b5563;line-height:1.5;">
          <span style="display:inline-block;width:22px;height:22px;background:${BRAND_ORANGE};color:#fff;font-size:12px;font-weight:700;border-radius:50%;text-align:center;line-height:22px;margin-right:8px;">3</span>
          <strong style="color:#111;">Get paid</strong> — earnings are paid out directly to your Mobile Money after each order.
        </td></tr>
      </table>

      ${ctaButton("Open Seller Dashboard", `${SITE_URL}/seller/dashboard`)}

      ${divider()}
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Need help? Read our <a href="${SITE_URL}/help" style="color:${BRAND_ORANGE};text-decoration:none;">Seller Guide</a> or reply to this email — we're happy to help.
      </p>
    `),
  },

};

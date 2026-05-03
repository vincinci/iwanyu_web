// api/pawapay-webhook.ts
// Receives PawaPay deposit/refund callbacks and forwards to Supabase functions

import { VercelRequest, VercelResponse } from '@vercel/node';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body;

    if (!body) {
      return res.status(400).json({ error: 'Missing request body' });
    }

    // Determine the callback type based on the request body
    const depositId = body.depositId;
    const payoutId = body.payoutId;
    const refundId = body.refundId;

    let callbackUrl: string;

    if (depositId) {
      // Deposit callback
      callbackUrl = `${SUPABASE_URL}/functions/v1/wallet-deposit-callback`;
    } else if (refundId) {
      // Refund callback
      callbackUrl = `${SUPABASE_URL}/functions/v1/wallet-refund-callback`;
    } else if (payoutId) {
      // Payout callback (seller withdrawal)
      callbackUrl = `${SUPABASE_URL}/functions/v1/seller-payout-callback`;
    } else {
      return res.status(400).json({ error: 'Unknown callback type' });
    }

    // Forward the webhook to Supabase function
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        // Forward any signature headers from PawaPay
        ...(req.headers['x-webhook-token'] && { 'x-webhook-token': String(req.headers['x-webhook-token']) }),
        ...(req.headers['x-pawapay-signature'] && { 'x-pawapay-signature': String(req.headers['x-pawapay-signature']) }),
        ...(req.headers['content-digest'] && { 'content-digest': String(req.headers['content-digest']) }),
        ...(req.headers['signature'] && { 'signature': String(req.headers['signature']) }),
        ...(req.headers['signature-input'] && { 'signature-input': String(req.headers['signature-input']) }),
      },
      body: JSON.stringify(body),
    });

    const responseBody = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('Supabase function error:', {
        status: response.status,
        body: responseBody,
      });
      return res.status(response.status).json(responseBody);
    }

    return res.status(200).json({ success: true, ...responseBody });
  } catch (error) {
    console.error('PawaPay webhook error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
}

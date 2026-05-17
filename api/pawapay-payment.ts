// api/pawapay-payment.ts
// PawaPay Deposits API for Order Payments
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const pawapayApiKey = process.env.PAWAPAY_API_KEY || '';

const PAWAPAY_API_BASE = 'https://api.pawapay.io';

// Get allowed origin from environment or default to production domain
const ALLOWED_ORIGIN = process.env.VERCEL_ENV === 'production'
  ? 'https://www.iwanyu.store'
  : 'http://localhost:8080';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

// Rate limiting: track requests by user ID
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { orderId, phoneNumber: rawPhone, correspondent } = req.body;
    // PawaPay requires digits only — no +, spaces, or separators
    const phoneNumber = String(rawPhone || '').replace(/[^0-9]/g, '');

    if (!orderId || !phoneNumber) {
      return res.status(400).json({ error: 'Order ID and phone number required' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    if (!pawapayApiKey) {
      return res.status(500).json({ error: 'PawaPay API key missing' });
    }

    const supabaseServiceRoleClient = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    
    // Create client with user's token to verify authentication
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    let user;
    try {
      const { data: userData, error: userError } = await userSupabase.auth.getUser();
      if (userError || !userData.user) {
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
      user = userData.user;
    } catch (authErr) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Apply rate limiting per user (5 requests per minute)
    if (!checkRateLimit(user.id)) {
      return res.status(429).json({
        error: 'Too many payment requests. Please try again in a few moments.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    }

    // Use service role client for database operations
    const supabase = supabaseServiceRoleClient;

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('buyer_user_id', user.id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (String(order.status).toLowerCase() !== 'pending' && String(order.status).toLowerCase() !== 'placed') {
      return res.status(400).json({ error: 'Order already processed' });
    }

    // Generate unique transaction ID — PawaPay requires exactly 36 characters (UUID)
    const transactionId = crypto.randomUUID();

    // Call PawaPay Deposits API for order payment
    // Reference: POST https://api.pawapay.io/deposits
    const pawapayResponse = await fetch(`${PAWAPAY_API_BASE}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pawapayApiKey}`,
      },
      body: JSON.stringify({
        depositId: transactionId,
        amount: String(order.total_rwf ?? order.total_amount ?? 0),
        currency: 'RWF', // Rwanda Francs
        correspondent: correspondent || 'MTN_MOMO_RWA',
        payer: {
          type: 'MSISDN',
          address: {
            value: phoneNumber,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: `Order ${orderId}`,
      }),
    });

    if (!pawapayResponse.ok) {
      const errorText = await pawapayResponse.text();
      console.error('PawaPay API error:', errorText);
      return res.status(400).json({ error: `PawaPay error: ${errorText}` });
    }

    const pawapayData = await pawapayResponse.json();

    // Update order with transaction details
    await supabase
      .from('orders')
      .update({
        transaction_id: transactionId,
        payment_method: 'pawapay',
        payment_provider: 'pawapay',
        payment_phone: phoneNumber,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    return res.status(200).json({
      success: true,
      transactionId,
      message: 'Payment initiated. Check your phone to complete payment.',
      pawapayData,
    });
  } catch (error: any) {
    console.error('Payment error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

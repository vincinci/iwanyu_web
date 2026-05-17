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

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// Rate limiting: track requests by user ID
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 deposits per minute

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
  setCors(res);

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { amount, phoneNumber: rawPhone, correspondent } = req.body || {};
    // PawaPay requires digits only — no +, spaces, or separators
    const phoneNumber = String(rawPhone || '').replace(/[^0-9]/g, '');
    const parsedAmount = Number(amount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !phoneNumber) {
      return res.status(400).json({ error: 'Valid amount and phone number required' });
    }
    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }
    if (!pawapayApiKey) {
      return res.status(500).json({ error: 'PawaPay API key missing' });
    }

    const service = createClient(supabaseUrl, supabaseServiceKey);
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Authorization header missing' });

    const token = authHeader.replace('Bearer ', '').trim();
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return res.status(401).json({ error: 'Invalid authentication token' });

    const userId = authData.user.id;

    // Apply rate limiting per user (5 deposits per minute)
    if (!checkRateLimit(userId)) {
      return res.status(429).json({
        error: 'Too many deposit requests. Please try again in a few moments.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    }

    // PawaPay requires depositId to be exactly 36 characters (UUID format)
    const transactionId = crypto.randomUUID();

    const { data: profile } = await service
      .from('profiles')
      .select('wallet_balance_rwf')
      .eq('id', userId)
      .single();

    const currentBalance = Number(profile?.wallet_balance_rwf ?? 0);

    const { error: txInsertError } = await service
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'deposit',
        amount_rwf: Math.round(parsedAmount),
        balance_after_rwf: currentBalance,
        status: 'pending',
        reference: transactionId,
        provider: correspondent || 'MTN_MOMO_RWA',
        phone: String(phoneNumber),
        metadata: {},
        description: `PawaPay deposit ${transactionId}`,
      });

    if (txInsertError) {
      return res.status(500).json({ error: `Failed to record transaction: ${txInsertError.message}` });
    }

    const pawapayResponse = await fetch(`${PAWAPAY_API_BASE}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${pawapayApiKey}`,
      },
      body: JSON.stringify({
        depositId: transactionId,
        amount: String(Math.round(parsedAmount)),
        currency: 'RWF',
        correspondent: correspondent || 'MTN_MOMO_RWA',
        payer: {
          type: 'MSISDN',
          address: { value: String(phoneNumber) },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: 'Wallet Deposit',
      }),
    });

    if (!pawapayResponse.ok) {
      const errorText = await pawapayResponse.text();
      await service
        .from('transactions')
        .update({ status: 'failed', metadata: { error: errorText }, updated_at: new Date().toISOString() })
        .eq('reference', transactionId);
      return res.status(400).json({ error: `PawaPay error: ${errorText}` });
    }

    const pawapayData = await pawapayResponse.json();
    await service
      .from('transactions')
      .update({ metadata: pawapayData, updated_at: new Date().toISOString() })
      .eq('reference', transactionId);

    return res.status(200).json({
      success: true,
      transactionId,
      message: 'Deposit initiated. Check your phone to complete payment.',
      pawapayData,
    });
  } catch (error: any) {
    return res.status(500).json({ error: error?.message || 'Internal server error' });
  }
}

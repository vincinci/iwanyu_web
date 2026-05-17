// api/pawapay-status.ts
// Check PawaPay transaction status (deposit or payout)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkDepositStatus, checkPayoutStatus } from './lib/pawapay-utils';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const pawapayApiKey = process.env.PAWAPAY_API_KEY || '';

// Get allowed origin from environment or default to production domain
const ALLOWED_ORIGIN = process.env.VERCEL_ENV === 'production'
  ? 'https://www.iwanyu.store'
  : 'http://localhost:8080';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

// Rate limiting: track requests by user ID
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10; // 10 requests per minute (higher for status checks)

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

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId } = req.query;

    if (!transactionId || typeof transactionId !== 'string') {
      return res.status(400).json({ error: 'Transaction ID required' });
    }

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    if (!pawapayApiKey) {
      return res.status(500).json({ error: 'PawaPay API key missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    const { data: userData, error: userError } = await userSupabase.auth.getUser();
    const user = userData.user;

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Apply rate limiting per user (10 requests per minute for status checks)
    if (!checkRateLimit(user.id)) {
      return res.status(429).json({
        error: 'Too many status requests. Please try again in a few moments.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    }

    // Check transaction type based on prefix
    let pawapayStatus: any;
    let transactionType: string;

    if (transactionId.startsWith('dep_') || transactionId.startsWith('pay_')) {
      // Deposit (wallet or order payment)
      pawapayStatus = await checkDepositStatus(transactionId, pawapayApiKey);
      transactionType = 'deposit';
    } else if (transactionId.startsWith('wth_')) {
      // Withdrawal (payout)
      pawapayStatus = await checkPayoutStatus(transactionId, pawapayApiKey);
      transactionType = 'payout';
    } else {
      return res.status(400).json({ error: 'Invalid transaction ID format' });
    }

    // Get transaction from database
    let dbTransaction = null;
    
    if (transactionId.startsWith('pay_')) {
      // Order payment
      const { data: order } = await supabase
        .from('orders')
        .select('*')
        .eq('transaction_id', transactionId)
        .eq('buyer_user_id', user.id)
        .single();
      
      dbTransaction = order;
    } else {
      // Wallet transaction
      const { data: transaction } = await supabase
        .from('transactions')
        .select('*')
        .eq('reference', transactionId)
        .eq('user_id', user.id)
        .single();
      
      dbTransaction = transaction;
    }

    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
      success: true,
      transactionId,
      transactionType,
      pawapayStatus,
      dbStatus: dbTransaction,
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

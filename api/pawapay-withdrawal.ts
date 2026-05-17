// api/pawapay-withdrawal.ts
// PawaPay Payouts API - Send money to mobile money accounts (withdrawal/disbursement)
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
const RATE_LIMIT_MAX_REQUESTS = 3; // 3 withdrawals per minute (stricter than payments)

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
    const { amount, phoneNumber: rawPhone, correspondent } = req.body;
    // PawaPay requires digits only — no +, spaces, or separators
    const phoneNumber = String(rawPhone || '').replace(/[^0-9]/g, '');

    if (!amount || !phoneNumber) {
      return res.status(400).json({ error: 'Amount and phone number required' });
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

    // Apply rate limiting per user (3 withdrawals per minute - stricter for security)
    if (!checkRateLimit(user.id)) {
      return res.status(429).json({
        error: 'Too many withdrawal requests. Please try again in a few moments.',
        retryAfter: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000),
      });
    }

    // Use service role client for database operations
    const supabase = supabaseServiceRoleClient;

    // Check wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance_rwf, locked_balance_rwf')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const availableBalance = (profile.wallet_balance_rwf || 0) - (profile.locked_balance_rwf || 0);
    const withdrawAmount = parseInt(amount);

    if (availableBalance < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    // Minimum withdrawal validation
    if (withdrawAmount < 100) {
      return res.status(400).json({ error: 'Minimum withdrawal is 100 RWF' });
    }

    // Generate unique transaction ID — PawaPay requires exactly 36 characters (UUID)
    const transactionId = crypto.randomUUID();
    const currentBalance = profile.wallet_balance_rwf || 0;
    const newBalance = currentBalance - withdrawAmount;

    // Record transaction in unified transactions table first
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'withdrawal',
        amount_rwf: withdrawAmount,
        balance_after_rwf: newBalance,
        status: 'pending',
        reference: transactionId,
        provider: correspondent || 'MTN_MOMO_RWA',
        phone: phoneNumber,
        metadata: { source: 'pawapay' },
        description: `PawaPay withdrawal ${transactionId}`,
      });

    if (txError) {
      console.error('Database error:', txError);
      return res.status(500).json({ error: `Failed to record transaction: ${txError.message}` });
    }

    // Deduct from wallet immediately (optimistic update)
    await supabase
      .from('profiles')
      .update({
        wallet_balance_rwf: newBalance,
      })
      .eq('id', user.id);

    // Auto-detect provider if not specified
    let detectedCorrespondent = correspondent;
    if (!detectedCorrespondent) {
      try {
        const predictResponse = await fetch(`${PAWAPAY_API_BASE}/predict-provider`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${pawapayApiKey}`,
          },
          body: JSON.stringify({ msisdn: phoneNumber }),
        });

        if (predictResponse.ok) {
          const predicted = await predictResponse.json();
          detectedCorrespondent = predicted.correspondent;
        }
      } catch (err) {
        console.warn('Provider prediction failed, using default:', err);
        detectedCorrespondent = 'MTN_MOMO_RWA';
      }
    }

    // Call PawaPay Payouts API
    // Reference: POST https://api.pawapay.io/payouts
    const pawapayResponse = await fetch(`${PAWAPAY_API_BASE}/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pawapayApiKey}`,
      },
      body: JSON.stringify({
        payoutId: transactionId,
        amount: amount.toString(),
        currency: 'RWF',
        correspondent: detectedCorrespondent || 'MTN_MOMO_RWA',
        recipient: {
          type: 'MSISDN',
          address: {
            value: phoneNumber,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: 'Wallet Withdrawal',
      }),
    });

    if (!pawapayResponse.ok) {
      const errorText = await pawapayResponse.text();
      console.error('PawaPay API error:', errorText);

      // Rollback wallet balance
      await supabase
        .from('profiles')
        .update({
          wallet_balance_rwf: currentBalance,
        })
        .eq('id', user.id);

      // Update transaction status to failed
      await supabase
        .from('transactions')
        .update({
          status: 'failed',
          metadata: { error: errorText },
          updated_at: new Date().toISOString(),
        })
        .eq('reference', transactionId);

      return res.status(400).json({ error: `PawaPay error: ${errorText}` });
    }

    const pawapayData = await pawapayResponse.json();

    // If PawaPay immediately rejected (HTTP 200 but status=REJECTED), rollback
    if (pawapayData.status === 'REJECTED') {
      await supabase.from('profiles').update({ wallet_balance_rwf: currentBalance }).eq('id', user.id);
      await supabase.from('transactions').update({ status: 'failed', metadata: pawapayData, updated_at: new Date().toISOString() }).eq('reference', transactionId);
      return res.status(400).setHeader('Access-Control-Allow-Origin', '*').json({
        error: `Withdrawal rejected: ${pawapayData.rejectionReason?.rejectionMessage || 'Unknown reason'}`,
        rejectionCode: pawapayData.rejectionReason?.rejectionCode,
        pawapayData,
      });
    }

    // Update transaction with PawaPay response
    await supabase
      .from('transactions')
      .update({
        metadata: pawapayData,
        updated_at: new Date().toISOString(),
      })
      .eq('reference', transactionId);

    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
      success: true,
      transactionId,
      message: 'Withdrawal initiated. Funds will be sent to your mobile money account.',
      pawapayData,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

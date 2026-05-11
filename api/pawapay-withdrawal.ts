// api/pawapay-withdrawal.ts
// PawaPay Payouts API - Send money to mobile money accounts (withdrawal/disbursement)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const pawapayApiKey = process.env.PAWAPAY_API_KEY || '';

const PAWAPAY_API_BASE = 'https://api.pawapay.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
      .end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, phoneNumber, correspondent } = req.body;

    if (!amount || !phoneNumber) {
      return res.status(400).json({ error: 'Amount and phone number required' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
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

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

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
    if (withdrawAmount < 500) {
      return res.status(400).json({ error: 'Minimum withdrawal is 500 RWF' });
    }

    // Generate unique transaction ID
    const transactionId = `wth_${Date.now()}_${user.id.substring(0, 8)}`;
    const currentBalance = profile.wallet_balance_rwf || 0;
    const newBalance = currentBalance - withdrawAmount;

    // Record transaction in database FIRST
    const { error: txError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        external_transaction_id: transactionId,
        type: 'withdrawal',
        amount_rwf: withdrawAmount,
        previous_balance_rwf: currentBalance,
        new_balance_rwf: newBalance,
        status: 'pending',
        phone_number: phoneNumber,
        payment_method: 'pawapay',
        provider: correspondent || 'MTN_MOMO_RWA',
        metadata: {},
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
        .from('wallet_transactions')
        .update({
          status: 'failed',
          metadata: { error: errorText },
        })
        .eq('external_transaction_id', transactionId);

      return res.status(400).json({ error: `PawaPay error: ${errorText}` });
    }

    const pawapayData = await pawapayResponse.json();

    // Update transaction with PawaPay response
    await supabase
      .from('wallet_transactions')
      .update({
        metadata: pawapayData,
      })
      .eq('external_transaction_id', transactionId);

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

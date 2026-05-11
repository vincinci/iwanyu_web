// api/pawapay-deposit.ts
// PawaPay Deposits API - Initiate mobile money deposit (collection)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const pawapayApiKey = process.env.PAWAPAY_API_KEY || '';

const PAWAPAY_API_BASE = 'https://api.pawapay.io';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Set CORS headers first
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { amount, phoneNumber, correspondent } = req.body;

    console.log('[PawaPay Deposit] Request received:', { 
      amount, 
      phoneNumber: phoneNumber?.substring(0, 7) + '***', 
      correspondent,
      hasAuth: !!req.headers.authorization
    });

    if (!amount || !phoneNumber) {
      console.error('[PawaPay Deposit] Missing required fields');
      return res.status(400).json({ error: 'Amount and phone number required' });
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[PawaPay Deposit] Missing Supabase config:', { 
        hasUrl: !!supabaseUrl, 
        hasServiceKey: !!supabaseServiceKey 
      });
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    if (!pawapayApiKey) {
      console.error('[PawaPay Deposit] Missing PawaPay API key');
      return res.status(500).json({ error: 'PawaPay API key missing. Please set PAWAPAY_API_KEY in Vercel environment variables.' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authenticated user
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Authorization header missing' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    let user;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser(token);
      if (userError) {
        console.error('[PawaPay Deposit] Auth error:', userError);
        return res.status(401).json({ error: 'Invalid authentication token' });
      }
      user = userData.user;
    } catch (authErr: any) {
      console.error('[PawaPay Deposit] Auth exception:', authErr);
      return res.status(401).json({ error: 'Authentication failed' });
    }

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    console.log('[PawaPay Deposit] User authenticated:', user.id);

    // Generate unique transaction ID
    const transactionId = `dep_${Date.now()}_${user.id.substring(0, 8)}`;

    // Get current wallet balance
    const { data: profile } = await supabase
      .from('profiles')
      .select('wallet_balance_rwf')
      .eq('id', user.id)
      .single();

    const currentBalance = profile?.wallet_balance_rwf || 0;

    // Record transaction in database FIRST (pending status)
    const { error: dbError } = await supabase
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        external_transaction_id: transactionId,
        type: 'deposit',
        amount_rwf: parseInt(amount),
        previous_balance_rwf: currentBalance,
        new_balance_rwf: currentBalance,
        status: 'pending',
        phone_number: phoneNumber,
        payment_method: 'pawapay',
        provider: correspondent || 'MTN_MOMO_RWA',
        metadata: {},
        description: `PawaPay wallet deposit ${transactionId}`,
      });

    if (dbError) {
      console.error('Database error:', dbError);
      return res.status(500).json({ error: `Failed to record transaction: ${dbError.message}` });
    }

    // Call PawaPay Deposits API
    // Reference: POST https://api.pawapay.io/deposits
    console.log('[PawaPay Deposit] Calling PawaPay API...');
    
    const pawapayResponse = await fetch(`${PAWAPAY_API_BASE}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${pawapayApiKey}`,
      },
      body: JSON.stringify({
        depositId: transactionId,
        amount: amount.toString(),
        currency: 'RWF',
        correspondent: correspondent || 'MTN_MOMO_RWA',
        payer: {
          type: 'MSISDN',
          address: {
            value: phoneNumber,
          },
        },
        customerTimestamp: new Date().toISOString(),
        statementDescription: 'Wallet Deposit',
      }),
    });

    console.log('[PawaPay Deposit] PawaPay response status:', pawapayResponse.status);

    if (!pawapayResponse.ok) {
      const errorText = await pawapayResponse.text();
      console.error('PawaPay API error:', errorText);

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

    // Update transaction with PawaPay response metadata
    await supabase
      .from('wallet_transactions')
      .update({
        metadata: pawapayDajson({
      success: true,
      transactionId,
      message: 'Deposit initiated. Check your phone to complete payment.',
      pawapayData,
    });
  } catch (error: any) {
    console.error('[PawaPay Deposit] Unhandled error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message
  } catch (error: any) {
    console.error('[PawaPay Deposit] Error:', error);
    return res.status(500).json({ 
      error: error.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

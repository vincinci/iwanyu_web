// api/pawapay-status.ts
// Check PawaPay transaction status (deposit or payout)
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { checkDepositStatus, checkPayoutStatus } from './lib/pawapay-utils';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const pawapayApiKey = process.env.PAWAPAY_API_KEY || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return res.status(204).setHeader('Access-Control-Allow-Origin', '*')
      .setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
      .setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type')
      .end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { transactionId } = req.query;

    if (!transactionId || typeof transactionId !== 'string') {
      return res.status(400).json({ error: 'Transaction ID required' });
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
        .eq('user_id', user.id)
        .single();
      
      dbTransaction = order;
    } else {
      // Wallet transaction
      const { data: transaction } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('external_transaction_id', transactionId)
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

// api/pawapay-payment.ts
// PawaPay Deposits API for Order Payments
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
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
    const { orderId, phoneNumber, correspondent } = req.body;

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

    // Generate unique transaction ID
    const transactionId = `pay_${Date.now()}_${orderId}`;

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

    return res.status(200).setHeader('Access-Control-Allow-Origin', '*').json({
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

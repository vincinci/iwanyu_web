// api/pawapay-webhook.ts
// PawaPay Webhook Handler - Receives callbacks for deposits and payouts
import { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const payload = req.body;
    console.log('PawaPay webhook received:', JSON.stringify(payload, null, 2));

    if (!supabaseUrl || !supabaseServiceKey) {
      return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Extract transaction details from webhook
    const {
      depositId,
      payoutId,
      status,
      amount,
      currency,
      correspondent,
      created,
      failureReason,
    } = payload;

    const transactionId = depositId || payoutId;

    if (!transactionId) {
      return res.status(400).json({ error: 'No transaction ID in webhook' });
    }

    // Determine if this is a deposit or payout
    const isDeposit = !!depositId;
    const isPayout = !!payoutId;

    // Check if this is an order payment, wallet deposit, or withdrawal
    if (transactionId.startsWith('pay_')) {
      // Order Payment Callback
      await handleOrderPaymentCallback(supabase, transactionId, status, payload);
    } else if (transactionId.startsWith('dep_')) {
      // Wallet Deposit Callback
      await handleWalletDepositCallback(supabase, transactionId, status, amount, payload);
    } else if (transactionId.startsWith('wth_')) {
      // Wallet Withdrawal Callback
      await handleWalletWithdrawalCallback(supabase, transactionId, status, amount, payload);
    } else {
      console.warn('Unknown transaction type:', transactionId);
    }

    return res.status(200).json({ success: true, received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}

/**
 * Handle order payment callback
 */
async function handleOrderPaymentCallback(
  supabase: any,
  transactionId: string,
  status: string,
  payload: any
) {
  try {
    // Find order by transaction ID
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('transaction_id', transactionId)
      .single();

    if (orderError || !order) {
      console.error('Order not found for transaction:', transactionId);
      return;
    }

    // Map PawaPay status to order status
    let orderStatus = 'pending';
    if (status === 'COMPLETED' || status === 'ACCEPTED') {
      orderStatus = 'confirmed';
    } else if (status === 'FAILED' || status === 'REJECTED' || status === 'CANCELLED') {
      orderStatus = 'failed';
    }

    // Update order status
    await supabase
      .from('orders')
      .update({
        status: orderStatus,
        payment_status: status.toLowerCase(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    console.log(`Order ${order.id} payment updated to ${orderStatus}`);
  } catch (error) {
    console.error('Order payment callback error:', error);
  }
}

/**
 * Handle wallet deposit callback
 */
async function handleWalletDepositCallback(
  supabase: any,
  transactionId: string,
  status: string,
  amount: string,
  payload: any
) {
  try {
    // Find transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('external_transaction_id', transactionId)
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found:', transactionId);
      return;
    }

    // Map status
    const txStatus = status === 'COMPLETED' ? 'completed' : 'failed';

    // Update transaction
    await supabase
      .from('wallet_transactions')
      .update({
        status: txStatus,
        metadata: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('external_transaction_id', transactionId);

    // If completed, update wallet balance
    if (status === 'COMPLETED') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('wallet_balance_rwf')
        .eq('id', transaction.user_id)
        .single();

      const currentBalance = profile?.wallet_balance_rwf || 0;
      const depositAmount = parseInt(amount);
      const newBalance = currentBalance + depositAmount;

      // Update wallet balance
      await supabase
        .from('profiles')
        .update({
          wallet_balance_rwf: newBalance,
        })
        .eq('id', transaction.user_id);

      // Update transaction with new balance
      await supabase
        .from('wallet_transactions')
        .update({
          new_balance_rwf: newBalance,
        })
        .eq('external_transaction_id', transactionId);

      console.log(`Wallet deposit completed for user ${transaction.user_id}: +${depositAmount} RWF`);
    } else {
      console.log(`Wallet deposit failed for transaction ${transactionId}: ${status}`);
    }
  } catch (error) {
    console.error('Wallet deposit callback error:', error);
  }
}

/**
 * Handle wallet withdrawal (payout) callback
 */
async function handleWalletWithdrawalCallback(
  supabase: any,
  transactionId: string,
  status: string,
  amount: string,
  payload: any
) {
  try {
    // Find transaction
    const { data: transaction, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .eq('external_transaction_id', transactionId)
      .single();

    if (fetchError || !transaction) {
      console.error('Transaction not found:', transactionId);
      return;
    }

    // Map status
    const txStatus = status === 'COMPLETED' ? 'completed' : 'failed';

    // Update transaction
    await supabase
      .from('wallet_transactions')
      .update({
        status: txStatus,
        metadata: payload,
        updated_at: new Date().toISOString(),
      })
      .eq('external_transaction_id', transactionId);

    // If failed, refund the wallet (we deducted optimistically)
    if (status === 'FAILED' || status === 'REJECTED' || status === 'CANCELLED') {
      const withdrawAmount = transaction.amount_rwf;
      const previousBalance = transaction.previous_balance_rwf;

      // Refund to wallet
      await supabase
        .from('profiles')
        .update({
          wallet_balance_rwf: previousBalance,
        })
        .eq('id', transaction.user_id);

      console.log(`Withdrawal failed, refunded ${withdrawAmount} RWF to user ${transaction.user_id}`);
    } else if (status === 'COMPLETED') {
      console.log(`Withdrawal completed for user ${transaction.user_id}: -${transaction.amount_rwf} RWF`);
    }
  } catch (error) {
    console.error('Wallet withdrawal callback error:', error);
  }
}

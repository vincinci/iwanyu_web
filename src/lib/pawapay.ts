import { getSupabaseClient } from './supabaseClient';

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

export class PawaPay {
  /**
   * Initiate a wallet deposit
   */
  static async deposit(amount: number, phoneNumber: string): Promise<PaymentResponse> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pawapay-deposit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount, phoneNumber }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Deposit failed');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Initiate a wallet withdrawal
   */
  static async withdraw(amount: number, phoneNumber: string): Promise<PaymentResponse> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pawapay-withdrawal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount, phoneNumber }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Withdrawal failed');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Pay for an order
   */
  static async payOrder(orderId: string, phoneNumber: string): Promise<PaymentResponse> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pawapay-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId, phoneNumber }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Payment failed');
      }

      return data;
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Check transaction status
   */
  static async checkStatus(transactionId: string): Promise<any> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data, error } = await supabase
        .from('wallet_transactions')
        .select('*')
        .eq('transaction_id', transactionId)
        .single();

      if (error) throw error;

      return data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  /**
   * Get user's wallet balance
   */
  static async getBalance(): Promise<number> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        console.error('Supabase client not available');
        return 0;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('User not authenticated');
        return 0;
      }

      console.log('Fetching wallet for user:', user.id);

      // Read from profiles table (same as Header)
      const { data, error } = await supabase
        .from('profiles')
        .select('wallet_balance_rwf, locked_balance_rwf')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Wallet fetch error:', error);
        return 0;
      }

      if (!data) {
        console.log('No profile found');
        return 0;
      }

      const wallet = Number(data.wallet_balance_rwf ?? 0);
      const locked = Number(data.locked_balance_rwf ?? 0);
      const available = Math.max(0, wallet - locked);

      console.log('Wallet balance:', { wallet, locked, available });
      return available;
    } catch (error) {
      console.error('getBalance error:', error);
      return 0;
    }
  }

  /**
   * Format phone number for PawaPay (remove spaces, add country code if missing)
   */
  static formatPhoneNumber(phone: string, countryCode: string = '250'): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present
    if (!cleaned.startsWith(countryCode)) {
      // Remove leading zero if present
      if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = countryCode + cleaned;
    }
    
    return cleaned;
  }
}

import { getSupabaseClient } from './supabaseClient';

export interface PaymentResponse {
  success: boolean;
  transactionId?: string;
  message?: string;
  error?: string;
}

// Get API base URL (Vercel deployment or local)
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:5173';
};

export class PawaPay {
  /**
   * Initiate a wallet deposit using PawaPay Deposits API
   * Reference: POST https://api.pawapay.io/deposits
   */
  static async deposit(
    amount: number, 
    phoneNumber: string, 
    correspondent?: string
  ): Promise<PaymentResponse> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/pawapay-deposit`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount, phoneNumber, correspondent }),
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
   * Initiate a wallet withdrawal using PawaPay Payouts API
   * Reference: POST https://api.pawapay.io/payouts
   */
  static async withdraw(
    amount: number, 
    phoneNumber: string, 
    correspondent?: string
  ): Promise<PaymentResponse> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/pawapay-withdrawal`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount, phoneNumber, correspondent }),
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
   * Pay for an order using PawaPay Deposits API
   * Reference: POST https://api.pawapay.io/deposits
   */
  static async payOrder(
    orderId: string, 
    phoneNumber: string, 
    correspondent?: string
  ): Promise<PaymentResponse> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/pawapay-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ orderId, phoneNumber, correspondent }),
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
   * Check transaction status via PawaPay Status API
   * Reference: GET https://api.pawapay.io/deposits/{depositId}
   * Reference: GET https://api.pawapay.io/payouts/{payoutId}
   */
  static async checkStatus(transactionId: string): Promise<any> {
    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client not available');

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${getApiBaseUrl()}/api/pawapay-status?transactionId=${transactionId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Status check failed');
      }

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
        return 0;
      }

      const wallet = Number(data.wallet_balance_rwf ?? 0);
      const locked = Number(data.locked_balance_rwf ?? 0);
      const available = Math.max(0, wallet - locked);

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

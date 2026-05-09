/**
 * Payment Service Layer
 * Centralized payment operations for wallet deposits and withdrawals
 */

import {
  initializePawaPayDeposit,
  PawaPayDepositParams,
  PawaPayDepositResponse,
} from "./pawapay";
import { getSupabaseClient } from "./supabaseClient";
import { CountryCode } from "@/lib/region";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export type PaymentMethod = "mobile_money";

export interface WalletDepositRequest {
  amount: number;
  phone: string;
  method: PaymentMethod;
  country?: CountryCode;
  provider?: string;
}

export interface WalletWithdrawRequest {
  amount: number;
  phone: string;
  network: "MTN" | "Airtel" | "Orange" | string;
}

export interface PaymentResult {
  success: boolean;
  message: string;
  referenceId?: string;
  redirectUrl?: string;
}

export type PaymentStatus = "idle" | "processing" | "pending" | "success" | "failed";

export interface PaymentState {
  status: PaymentStatus;
  message?: string;
  lastReference?: string;
}

// ─────────────────────────────────────────────────────────────
// Payment Errors
// ─────────────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

export class DuplicatePaymentError extends PaymentError {
  constructor(reference: string) {
    super(`Payment already in progress: ${reference}`, "DUPLICATE", false);
    this.name = "DuplicatePaymentError";
  }
}

export class InsufficientFundsError extends PaymentError {
  constructor(available: number, requested: number) {
    super(
      `Insufficient funds. Available: ${available}, Requested: ${requested}`,
      "INSUFFICIENT_FUNDS",
      false
    );
    this.name = "InsufficientFundsError";
  }
}

export class PaymentDeclinedError extends PaymentError {
  constructor(reason?: string) {
    super(`Payment declined: ${reason ?? "Unknown"}`, "DECLINED", false);
    this.name = "PaymentDeclinedError";
  }
}

export class PaymentNetworkError extends PaymentError {
  constructor(message = "Network error") {
    super(message, "NETWORK_ERROR", true);
    this.name = "PaymentNetworkError";
  }
}

// ─────────────────────────────────────────────────────────────
// Idempotency Manager
// ─────────────────────────────────────────────────────────────

/**
 * Prevents duplicate payment requests within a time window
 */
class IdempotencyManager {
  private pendingRequests = new Map<string, number>();
  private readonly TIME_WINDOW_MS = 2 * 60 * 1000; // 2 minutes

  /**
   * Check if a request is already in progress
   * Returns true if duplicate
   */
  isDuplicate(userId: string, amount: number): boolean {
    const key = this.getKey(userId, amount);
    const timestamp = this.pendingRequests.get(key);

    if (!timestamp) return false;

    // Check if within time window
    if (Date.now() - timestamp > this.TIME_WINDOW_MS) {
      this.pendingRequests.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Mark a request as in progress
   */
  markInProgress(userId: string, amount: number): void {
    const key = this.getKey(userId, amount);
    this.pendingRequests.set(key, Date.now());
  }

  /**
   * Clear a request after completion
   */
  markComplete(userId: string, amount: number): void {
    const key = this.getKey(userId, amount);
    this.pendingRequests.delete(key);
  }

  private getKey(userId: string, amount: number): string {
    const now = new Date();
    // Key includes minute-level timestamp for deduplication
    const minuteKey = `${now.getFullYear()}${now.getMonth()}${now.getDate()}${now.getHours()}${now.getMinutes()}`;
    return `${userId}-${amount}-${minuteKey}`;
  }
}

const idempotencyManager = new IdempotencyManager();

// ─────────────────────────────────────────────────────────────
// Payment Service
// ─────────────────────────────────────────────────────────────

/**
 * Main payment service for wallet operations
 */
export const paymentService = {
  /**
   * Deposit funds to wallet via PawaPay mobile money
   */
  async depositMobileMoney(
    request: WalletDepositRequest,
    userId: string
  ): Promise<PaymentResult> {
    const supabase = getSupabaseClient();

    // Check for duplicate request
    if (idempotencyManager.isDuplicate(userId, request.amount)) {
      return {
        success: false,
        message: "A deposit is already in progress. Please wait or try again.",
      };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new PaymentError("Please log in to continue.", "AUTH_REQUIRED", false);
      }

      // Mark request as in progress
      idempotencyManager.markInProgress(userId, request.amount);

      const correlationId = `wallet-${userId}-${Date.now()}`;

      // Initialize deposit with PawaPay
      const params: PawaPayDepositParams = {
        amount: Math.round(request.amount),
        currency: "RWF",
        country: request.country ?? "RW",
        accountIdentifier: request.phone,
        provider: request.provider,
        correlationId,
      };

      const result = await initializePawaPayDeposit(params, accessToken);

      if (!result?.depositId) {
        throw new PaymentError(
          "Failed to initialize payment. Please try again.",
          "INIT_FAILED",
          true
        );
      }

      // Create pending transaction in database
      const { error: txnError } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: userId,
          type: "deposit",
          amount_rwf: Math.round(request.amount),
          external_transaction_id: result.depositId,
          payment_method: "pawapay_momo",
          status: "pending",
          description: `Wallet deposit ${correlationId}`,
        });

      if (txnError) {
        console.error("Failed to create pending transaction (modern schema):", txnError);

        const { error: legacyError } = await supabase
          .from("wallet_transactions")
          .insert({
            user_id: userId,
            kind: "deposit",
            amount: Math.round(request.amount),
            reference: result.depositId,
            metadata: {
              status: "pending",
              payment_method: "pawapay_momo",
              correlationId,
            },
          });

        if (legacyError) {
          console.error("Failed to create pending transaction (legacy schema):", legacyError);
        }
        // Continue anyway - transaction can be reconciled later
      }

      // Store pending deposit ID for callback
      sessionStorage.setItem("pendingDepositId", result.depositId);

      // Direct deposit flow: confirm on the user's phone and verify in-app.
      window.location.assign(
        `${window.location.origin}/wallet-callback?depositId=${encodeURIComponent(result.depositId)}`
      );

      return {
        success: true,
        message: "Deposit initiated. Waiting for confirmation...",
        referenceId: result.depositId,
        redirectUrl: "/wallet-callback",
      };
    } catch (error) {
      idempotencyManager.markComplete(userId, request.amount);

      if (error instanceof PaymentError) {
        return { success: false, message: error.message };
      }

      console.error("Deposit error:", error);
      return {
        success: false,
        message: error instanceof Error ? error.message : "Deposit failed. Please try again.",
      };
    }
  },

  /**
   * Withdraw wallet balance to mobile money (for all users)
   */
  async withdrawWalletBalance(
    request: WalletWithdrawRequest,
    userId: string
  ): Promise<PaymentResult> {
    const supabase = getSupabaseClient();

    // Check for duplicate
    if (idempotencyManager.isDuplicate(userId, request.amount)) {
      return {
        success: false,
        message: "A withdrawal is already in progress. Please wait or try again.",
      };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new PaymentError("Please log in to continue.", "AUTH_REQUIRED", false);
      }

      idempotencyManager.markInProgress(userId, request.amount);

      // Get user's wallet
      const { data: wallet } = await supabase
        .from("wallets")
        .select("id, available_rwf")
        .eq("user_id", userId)
        .maybeSingle();

      if (!wallet) {
        throw new PaymentError(
          "No wallet found. Please contact support.",
          "NO_WALLET",
          false
        );
      }

      if ((wallet.available_rwf ?? 0) < request.amount) {
        throw new InsufficientFundsError(
          wallet.available_rwf ?? 0,
          request.amount
        );
      }

      // Call withdrawal edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wallet-withdrawal`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletId: wallet.id,
            amountRwf: Math.round(request.amount),
            mobileNetwork: request.network,
            phoneNumber: request.phone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new PaymentError(
          result.error || result.message || "Withdrawal failed. Please try again.",
          "WITHDRAWAL_FAILED",
          true
        );
      }

      idempotencyManager.markComplete(userId, request.amount);

      return {
        success: true,
        message: `${request.amount.toLocaleString()} RWF is on the way to +${request.phone}`,
        referenceId: result.withdrawalId || result.referenceId,
      };
    } catch (error) {
      idempotencyManager.markComplete(userId, request.amount);

      if (error instanceof PaymentError || error instanceof InsufficientFundsError) {
        return { success: false, message: error.message };
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Withdrawal failed. Please try again.",
      };
    }
  },

  /**
   * Withdraw seller earnings to mobile money
   */
  async withdraw(request: WalletWithdrawRequest, userId: string): Promise<PaymentResult> {
    const supabase = getSupabaseClient();

    // Check for duplicate
    if (idempotencyManager.isDuplicate(userId, request.amount)) {
      return {
        success: false,
        message: "A withdrawal is already in progress. Please wait or try again.",
      };
    }

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) {
        throw new PaymentError("Please log in to continue.", "AUTH_REQUIRED", false);
      }

      idempotencyManager.markInProgress(userId, request.amount);

      // Get vendor info
      const { data: vendor } = await supabase
        .from("vendors")
        .select("id, payout_balance_rwf")
        .eq("owner_user_id", userId)
        .maybeSingle();

      if (!vendor) {
        throw new PaymentError(
          "You must be a verified seller to withdraw earnings.",
          "NOT_SELLER",
          false
        );
      }

      if ((vendor.payout_balance_rwf ?? 0) < request.amount) {
        throw new InsufficientFundsError(
          vendor.payout_balance_rwf ?? 0,
          request.amount
        );
      }

      // Call withdrawal edge function
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-withdrawal-callback`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            vendorId: vendor.id,
            amountRwf: Math.round(request.amount),
            mobileNetwork: request.network,
            phoneNumber: request.phone,
            reason: "Seller earnings withdrawal",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new PaymentError(
          result.message || "Withdrawal failed. Please try again.",
          "WITHDRAWAL_FAILED",
          true
        );
      }

      idempotencyManager.markComplete(userId, request.amount);

      return {
        success: true,
        message: `${request.amount.toLocaleString()} RWF is on the way to +${request.phone}`,
        referenceId: result.referenceId,
      };
    } catch (error) {
      idempotencyManager.markComplete(userId, request.amount);

      if (error instanceof PaymentError || error instanceof InsufficientFundsError) {
        return { success: false, message: error.message };
      }

      return {
        success: false,
        message: error instanceof Error ? error.message : "Withdrawal failed. Please try again.",
      };
    }
  },

  /**
   * Clear any pending idempotency state
   */
  clearPending(userId: string, amount: number): void {
    idempotencyManager.markComplete(userId, amount);
  },
};

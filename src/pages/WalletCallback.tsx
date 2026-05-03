import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { checkDepositStatus } from "@/lib/pawapay";

const INITIAL_WAIT_MS = 5 * 60 * 1000;
const INITIAL_POLL_INTERVAL_MS = 3000;
const PENDING_POLL_INTERVAL_MS = 5000;

export default function WalletCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [status, setStatus] = useState<"verifying" | "success" | "failed" | "pending">("verifying");
  const [message, setMessage] = useState("Checking your deposit...");
  const [amountRwf, setAmountRwf] = useState<number | null>(null);
  const [newBalanceRwf, setNewBalanceRwf] = useState<number | null>(null);
  const [waitStartedAt] = useState(() => Date.now());
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(INITIAL_WAIT_MS / 1000));

  const maybeRedirectToPawaPayAuth = (depositId: string, url: string | undefined): void => {
    if (!url) return;
    const key = `pawapayAuthRedirected:${depositId}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    window.location.assign(url);
  };

  type WalletTransactionRow = {
    status?: string | null;
    amount_rwf?: number | null;
    amount?: number | null;
    new_balance_rwf?: number | null;
  };

  const getAmountFromRow = (row: WalletTransactionRow | null): number | null => {
    if (!row) return null;
    if (typeof row.amount_rwf === "number") return row.amount_rwf;
    if (typeof row.amount === "number") return row.amount;
    return null;
  };

  const fetchWalletTransaction = async (depositId: string): Promise<WalletTransactionRow | null> => {
    // Try modern schema first.
    const modern = await supabase
      .from("wallet_transactions")
      .select("status, amount_rwf, new_balance_rwf")
      .eq("user_id", user!.id)
      .eq("external_transaction_id", depositId)
      .maybeSingle();

    if (!modern.error) return modern.data as WalletTransactionRow | null;

    // Fallback for older schema where amount_rwf/new_balance_rwf may not exist.
    const legacyAmount = await supabase
      .from("wallet_transactions")
      .select("status, amount")
      .eq("user_id", user!.id)
      .eq("external_transaction_id", depositId)
      .maybeSingle();

    if (!legacyAmount.error) return legacyAmount.data as WalletTransactionRow | null;

    // Final fallback for very old rows that used reference instead of external_transaction_id.
    const legacyReference = await supabase
      .from("wallet_transactions")
      .select("status, amount")
      .eq("user_id", user!.id)
      .eq("reference", depositId)
      .maybeSingle();

    if (!legacyReference.error) return legacyReference.data as WalletTransactionRow | null;

    return null;
  };

  useEffect(() => {
    if (status === "success" || status === "failed") return;

    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((waitStartedAt + INITIAL_WAIT_MS - Date.now()) / 1000));
      setRemainingSeconds(remaining);
    };

    updateRemaining();
    const timer = window.setInterval(updateRemaining, 1000);
    return () => window.clearInterval(timer);
  }, [status, waitStartedAt]);

  useEffect(() => {
    let isActive = true;

    const pause = async (ms: number) => {
      await new Promise((resolve) => window.setTimeout(resolve, ms));
    };

    const completeDeposit = (displayAmount: number, nextBalance: number | null) => {
      if (!isActive) return;
      sessionStorage.removeItem("pendingDepositId");
      setAmountRwf(displayAmount || null);
      setNewBalanceRwf(nextBalance);
      setStatus("success");
      setMessage(`${formatMoney(displayAmount)} has been added to your wallet.`);

      toast({
        title: "Deposit received",
        description: `${formatMoney(displayAmount)} added to your wallet.`,
      });
    };

    const failDeposit = (nextMessage: string) => {
      if (!isActive) return;
      setStatus("failed");
      setMessage(nextMessage);
    };

    const isCompletedStatus = (value: unknown) => {
      const status = String(value ?? "").trim().toUpperCase();
      return ["COMPLETED", "SETTLED", "PAID", "SUCCESS"].includes(status);
    };

    const isFailedStatus = (value: unknown) => {
      const status = String(value ?? "").trim().toUpperCase();
      return ["FAILED", "REJECTED", "CANCELLED", "DECLINED"].includes(status);
    };

    const isCancelledStatus = (value: unknown) => {
      const status = String(value ?? "").trim().toUpperCase();
      return status === "CANCELLED";
    };

    const verify = async () => {
      try {
        const depositId = searchParams.get("depositId") || sessionStorage.getItem("pendingDepositId");
        const returnedStatus = searchParams.get("status")?.toUpperCase();

        if (returnedStatus === "CANCELLED" || returnedStatus === "FAILED") {
          failDeposit(returnedStatus === "CANCELLED"
            ? "The deposit was cancelled."
            : "The deposit was not completed.");
          return;
        }

        if (!depositId) {
          setStatus("failed");
          setMessage("Missing deposit information. Please try again.");
          return;
        }

        if (!supabase || !user) {
          setStatus("failed");
          setMessage("Please log in to verify your deposit.");
          return;
        }

        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;

        setStatus("verifying");
        setMessage("Waiting for you to confirm the deposit on your phone...");

        while (isActive) {
          const data = await fetchWalletTransaction(depositId);

          if (data && isCompletedStatus(data.status)) {
            const displayAmount = getAmountFromRow(data) ?? 0;
            completeDeposit(displayAmount, data.new_balance_rwf ?? null);
            return;
          }

          if (data && isCancelledStatus(data.status)) {
            failDeposit("The deposit was cancelled.");
            return;
          }

          if (data && isFailedStatus(data.status)) {
            failDeposit("The deposit did not complete. You can try again.");
            return;
          }

          if (accessToken) {
            const statusRes = await checkDepositStatus(depositId, accessToken).catch(() => null);

            const authUrl = statusRes?.authorizationUrl || statusRes?.authenticationUrl;
            if (authUrl) {
              maybeRedirectToPawaPayAuth(depositId, authUrl);
              return;
            }

            if (statusRes && isFailedStatus(statusRes.status)) {
              failDeposit("The deposit was declined or cancelled.");
              return;
            }

            if (statusRes && isCompletedStatus(statusRes.status)) {
              const reconciled = await fetchWalletTransaction(depositId);

              if (reconciled && isCompletedStatus(reconciled.status)) {
                const displayAmount = getAmountFromRow(reconciled) ?? (Number(statusRes.requestedAmount || 0) || 0);
                completeDeposit(displayAmount, reconciled.new_balance_rwf ?? null);
                return;
              }

              const fallbackAmount = Number(statusRes.requestedAmount || 0) || 0;
              completeDeposit(fallbackAmount, null);
              return;
            }
          }

          if (Date.now() - waitStartedAt >= INITIAL_WAIT_MS) {
            setStatus("pending");
            setMessage("Still waiting for confirmation. You can leave this page open while we keep checking, or come back to the wallet later.");
            await pause(PENDING_POLL_INTERVAL_MS);
          } else {
            setStatus("verifying");
            setMessage("Waiting for you to confirm the deposit on your phone...");
            await pause(INITIAL_POLL_INTERVAL_MS);
          }
        }
      } catch (error) {
        console.error("Wallet verification error:", error);
        failDeposit(
          error instanceof Error ? error.message : "Unexpected error. Please contact support.",
        );
      }
    };

    verify();
    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, supabase, toast, user, waitStartedAt]);

  return (
    <StorefrontPage>
      <div className="container flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          {status === "verifying" && (
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-gray-900">Checking deposit</h1>
              <p className="text-sm text-gray-500">{message}</p>
              <p className="text-xs text-gray-400">
                We will keep this page waiting for up to {Math.floor(remainingSeconds / 60)}:
                {String(remainingSeconds % 60).padStart(2, "0")}
                before switching to background polling.
              </p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-gray-900">Deposit complete</h1>
              <p className="text-sm text-gray-500">{message}</p>

              {newBalanceRwf !== null && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-left">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-400">New balance</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{formatMoney(newBalanceRwf)}</p>
                  {amountRwf !== null && (
                    <p className="mt-2 text-sm text-gray-500">Deposit amount: {formatMoney(amountRwf)}</p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  className="rounded-full bg-gray-900 text-white hover:bg-gray-800"
                  onClick={() => navigate("/live")}
                >
                  Browse Live Auctions
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => navigate("/wallet")}>
                  Back to Wallet
                </Button>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-gray-900">Deposit pending</h1>
              <p className="text-sm text-gray-500">{message}</p>
              <p className="text-xs text-gray-400">
                This page is still polling. If the deposit is approved, it will update automatically. If it is cancelled, you will see that here.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800" onClick={() => navigate("/wallet")}>
                  Stop Waiting
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => window.location.reload()}>
                  Check Again
                </Button>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-4">
              <h1 className="text-2xl font-semibold text-gray-900">Deposit issue</h1>
              <p className="text-sm text-gray-500">{message}</p>
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button
                  className="rounded-full bg-gray-900 text-white hover:bg-gray-800"
                  onClick={() => navigate("/wallet")}
                >
                  Try Again
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => navigate("/")}>
                  Go Home
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { checkDepositStatus } from "@/lib/pawapay";

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

  const maybeRedirectToPawaPayAuth = (depositId: string, url: string | undefined): void => {
    if (!url) return;
    const key = `pawapayAuthRedirected:${depositId}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    window.location.assign(url);
  };

  useEffect(() => {
    const verify = async () => {
      try {
        const depositId = searchParams.get("depositId") || sessionStorage.getItem("pendingDepositId");
        const returnedStatus = searchParams.get("status")?.toUpperCase();

        if (returnedStatus === "CANCELLED" || returnedStatus === "FAILED") {
          setStatus("failed");
          setMessage("The deposit was not completed.");
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

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const { data, error } = await supabase
            .from("wallet_transactions")
            .select("status, amount_rwf, new_balance_rwf")
            .eq("user_id", user.id)
            .eq("external_transaction_id", depositId)
            .maybeSingle();

          if (error || !data) {
            setStatus("failed");
            setMessage("We could not find this deposit in your wallet history.");
            return;
          }

          if (data.status === "completed") {
            sessionStorage.removeItem("pendingDepositId");
            setAmountRwf(data.amount_rwf ?? null);
            setNewBalanceRwf(data.new_balance_rwf ?? null);
            setStatus("success");
            setMessage(`${formatMoney(data.amount_rwf ?? 0)} has been added to your wallet.`);

            toast({
              title: "Deposit received",
              description: `${formatMoney(data.amount_rwf ?? 0)} added to your wallet.`,
            });
            return;
          }

          if (data.status === "failed" || data.status === "cancelled") {
            setStatus("failed");
            setMessage("The deposit did not complete. You can try again.");
            return;
          }

          await new Promise((resolve) => setTimeout(resolve, 2500));
        }

        // Webhook may be delayed or misconfigured; attempt an authenticated status check
        // which also reconciles the wallet transaction when it is completed.
        if (accessToken) {
          const statusRes = await checkDepositStatus(depositId, accessToken).catch(() => null);

          const authUrl = statusRes?.authorizationUrl || statusRes?.authenticationUrl;
          if (authUrl) {
            maybeRedirectToPawaPayAuth(depositId, authUrl);
            return;
          }

          if (statusRes?.status === "FAILED") {
            setStatus("failed");
            setMessage("The deposit did not complete. You can try again.");
            return;
          }

          if (statusRes?.status === "COMPLETED") {
            // Re-check wallet transaction to read new balance.
            const { data } = await supabase
              .from("wallet_transactions")
              .select("status, amount_rwf, new_balance_rwf")
              .eq("user_id", user.id)
              .eq("external_transaction_id", depositId)
              .maybeSingle();

            if (data?.status === "completed") {
              sessionStorage.removeItem("pendingDepositId");
              setAmountRwf(data.amount_rwf ?? null);
              setNewBalanceRwf(data.new_balance_rwf ?? null);
              setStatus("success");
              setMessage(`${formatMoney(data.amount_rwf ?? 0)} has been added to your wallet.`);

              toast({
                title: "Deposit received",
                description: `${formatMoney(data.amount_rwf ?? 0)} added to your wallet.`,
              });
              return;
            }
          }
        }

        setStatus("pending");
        setMessage("Your deposit is still pending confirmation. The wallet will update automatically once PawaPay confirms it.");
      } catch (error) {
        console.error("Wallet verification error:", error);
        setStatus("failed");
        setMessage(
          error instanceof Error ? error.message : "Unexpected error. Please contact support.",
        );
      }
    };

    verify();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StorefrontPage>
      <div className="container flex min-h-screen items-center justify-center px-4 py-12">
        <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 text-center shadow-sm">
          {status === "verifying" && (
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-gray-900">Checking deposit</h1>
              <p className="text-sm text-gray-500">{message}</p>
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
              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800" onClick={() => navigate("/wallet")}>
                  Return to Wallet
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

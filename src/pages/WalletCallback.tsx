import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, XCircle, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";

export default function WalletCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment…");
  const [amountRwf, setAmountRwf] = useState<number | null>(null);
  const [newBalanceRwf, setNewBalanceRwf] = useState<number | null>(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const transactionId = searchParams.get("transaction_id") || searchParams.get("tx_id");
        const flwStatus = searchParams.get("status");
        const topupId =
          searchParams.get("topupId") || sessionStorage.getItem("pendingTopupId");

        if (flwStatus === "cancelled") {
          setStatus("failed");
          setMessage("Payment was cancelled. Your wallet was not charged.");
          return;
        }

        if (flwStatus === "failed") {
          setStatus("failed");
          setMessage("Payment failed. Please try again.");
          return;
        }

        if (!transactionId || !topupId) {
          setStatus("failed");
          setMessage("Missing payment information. Please try again.");
          return;
        }

        if (!supabase || !user) {
          setStatus("failed");
          setMessage("Please log in to verify your payment.");
          return;
        }

        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;
        if (!accessToken) {
          setStatus("failed");
          setMessage("Session expired. Please log in again.");
          return;
        }

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) throw new Error("Configuration missing");

        const verifyRes = await fetch(
          `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/wallet-topup-verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ topupId, transactionId }),
          },
        );

        const data = await verifyRes.json();

        if (!verifyRes.ok || !data.success) {
          setStatus("failed");
          setMessage(data.error || "Payment verification failed. Please contact support.");
          return;
        }

        sessionStorage.removeItem("pendingTopupId");
        setAmountRwf(data.amountRwf ?? null);
        setNewBalanceRwf(data.newBalanceRwf ?? null);
        setStatus("success");
        setMessage(`${formatMoney(data.amountRwf ?? 0)} has been added to your wallet.`);

        toast({
          title: "Wallet topped up!",
          description: `${formatMoney(data.amountRwf ?? 0)} added successfully.`,
        });
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
      <div className="container min-h-screen py-12 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          {status === "verifying" && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-amber-500 mx-auto" />
              <h1 className="text-2xl font-semibold">Verifying Payment</h1>
              <p className="text-muted-foreground">{message}</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-semibold text-green-600">Wallet Topped Up!</h1>
              <p className="text-muted-foreground">{message}</p>

              {newBalanceRwf !== null && (
                <div className="rounded-2xl bg-amber-50 border border-amber-100 px-6 py-4 inline-flex items-center gap-3 mx-auto">
                  <Wallet className="h-5 w-5 text-amber-500 shrink-0" />
                  <div className="text-left">
                    <p className="text-xs text-gray-500">New balance</p>
                    <p className="font-bold text-gray-900">{formatMoney(newBalanceRwf)}</p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 justify-center pt-4 flex-wrap">
                <Button
                  className="rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                  onClick={() => navigate("/live")}
                >
                  Browse Live Auctions
                </Button>
                <Button variant="outline" className="rounded-full" onClick={() => navigate("/wallet")}>
                  Top Up Again
                </Button>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-4">
              <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <XCircle className="h-10 w-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-semibold text-red-600">Payment Issue</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center pt-4 flex-wrap">
                <Button
                  className="rounded-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
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

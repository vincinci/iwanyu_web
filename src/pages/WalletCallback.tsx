import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { checkDepositStatus } from "@/lib/pawapay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

type PollState = "pending" | "success" | "failed" | "timeout";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75; // 5 minutes

export default function WalletCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const depositIdFromUrl = params.get("depositId");
  const depositId = depositIdFromUrl || sessionStorage.getItem("pendingWalletDepositId");

  const [pollState, setPollState] = useState<PollState>("pending");
  const [countdown, setCountdown] = useState(0);
  const pollCount = useRef(0);
  const supabase = getSupabaseClient();

  // Realtime subscription — instantly catches webhook update from Supabase
  useEffect(() => {
    if (!depositId) return;
    const channel = supabase
      .channel(`wallet-tx-${depositId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "wallet_transactions",
          filter: `external_transaction_id=eq.${depositId}`,
        },
        (payload) => {
          const newStatus = (payload.new as Record<string, unknown>)?.status as string | undefined;
          if (newStatus === "completed") {
            setPollState("success");
            sessionStorage.removeItem("pendingWalletDepositId");
            setTimeout(() => navigate("/wallet", { replace: true }), 2000);
          } else if (newStatus === "failed" || newStatus === "cancelled") {
            setPollState("failed");
            sessionStorage.removeItem("pendingWalletDepositId");
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [depositId, navigate, supabase]);

  useEffect(() => {
    if (!depositId) {
      navigate("/wallet", { replace: true });
      return;
    }

    // Persist in case of page refresh
    sessionStorage.setItem("pendingWalletDepositId", depositId);

    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      pollCount.current += 1;

      if (pollCount.current > MAX_POLLS) {
        setPollState("timeout");
        sessionStorage.removeItem("pendingWalletDepositId");
        return;
      }

      try {
        // Check wallet_transactions table for webhook signal
        // depositId is stored in external_transaction_id (modern) or reference (legacy)
        const { data: txRow } = await supabase
          .from("wallet_transactions")
          .select("id, status, metadata")
          .or(`external_transaction_id.eq.${depositId},reference.eq.${depositId}`)
          .maybeSingle();

        const txStatus = txRow?.status || (txRow?.metadata as Record<string, unknown> | null)?.status as string | undefined;

        if (txStatus === "completed") {
          setPollState("success");
          sessionStorage.removeItem("pendingWalletDepositId");
          setTimeout(() => navigate("/wallet", { replace: true }), 2000);
          return;
        }
        if (txStatus === "failed" || txStatus === "cancelled") {
          setPollState("failed");
          sessionStorage.removeItem("pendingWalletDepositId");
          return;
        }

        // Fall back to direct PawaPay status check (requires auth token)
        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;
        if (accessToken) {
          const pawaResult = await checkDepositStatus(depositId, accessToken);
          const pawaStatus = pawaResult?.status;
          if (pawaStatus === "COMPLETED") {
            setPollState("success");
            sessionStorage.removeItem("pendingWalletDepositId");
            setTimeout(() => navigate("/wallet", { replace: true }), 2000);
            return;
          }
          if (pawaStatus === "FAILED" || pawaStatus === "REJECTED" || pawaStatus === "CANCELLED") {
            setPollState("failed");
            sessionStorage.removeItem("pendingWalletDepositId");
            return;
          }
        }
      } catch (e) {
        console.error("Poll error:", e);
      }

      let secs = POLL_INTERVAL_MS / 1000;
      setCountdown(secs);
      const tick = setInterval(() => {
        secs -= 1;
        setCountdown(secs);
        if (secs <= 0) clearInterval(tick);
      }, 1000);
      timer = setTimeout(() => {
        clearInterval(tick);
        poll();
      }, POLL_INTERVAL_MS);
    };

    void poll();
    return () => { if (timer) clearTimeout(timer); };
  }, [depositId, navigate, supabase]);

  if (pollState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-semibold text-gray-900">Deposit confirmed!</h1>
        <p className="text-gray-500">Your wallet has been topped up. Redirecting...</p>
      </div>
    );
  }

  if (pollState === "failed" || pollState === "timeout") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <XCircle className="h-16 w-16 text-red-400" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {pollState === "timeout" ? "Deposit timed out" : "Deposit failed"}
        </h1>
        <p className="text-gray-500">
          {pollState === "timeout"
            ? "We didn't receive confirmation in time."
            : "The deposit was not completed."}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/wallet")}>Back to wallet</Button>
          <Button onClick={() => { sessionStorage.removeItem("pendingWalletDepositId"); navigate("/wallet"); }}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-6">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Confirming deposit…</h1>
        <p className="mt-1 text-sm text-gray-500">Please approve the request on your phone.</p>
      </div>
      {countdown > 0 && (
        <p className="text-xs text-gray-400">Checking again in {countdown}s…</p>
      )}
      <Button variant="ghost" size="sm" onClick={() => navigate("/wallet")}>
        Back to wallet
      </Button>
    </div>
  );
}

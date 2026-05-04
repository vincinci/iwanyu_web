import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { checkDepositStatus } from "@/lib/pawapay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

type PollState = "pending" | "success" | "failed" | "timeout";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 100; // ~5 minutes

export default function WalletCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const depositIdFromUrl = params.get("depositId");
  const depositId = depositIdFromUrl || sessionStorage.getItem("pendingWalletDepositId");

  const [pollState, setPollState] = useState<PollState>("pending");
  const [countdown, setCountdown] = useState(0);
  const pollCount = useRef(0);
  const succeeded = useRef(false);
  const supabase = getSupabaseClient();

  const handleSuccess = () => {
    if (succeeded.current) return;
    succeeded.current = true;
    setPollState("success");
    sessionStorage.removeItem("pendingWalletDepositId");
    setTimeout(() => navigate("/wallet", { replace: true }), 2500);
  };

  const handleFailed = () => {
    if (succeeded.current) return;
    setPollState("failed");
    sessionStorage.removeItem("pendingWalletDepositId");
  };

  // PRIMARY SIGNAL: subscribe to profile wallet_balance_rwf changes
  // When PawaPay webhook fires and credits wallet, this fires immediately
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`profile-balance-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newBalance = (payload.new as Record<string, unknown>)?.wallet_balance_rwf;
          const oldBalance = (payload.old as Record<string, unknown>)?.wallet_balance_rwf;
          // If balance increased, deposit was credited
          if (
            newBalance !== undefined &&
            oldBalance !== undefined &&
            Number(newBalance) > Number(oldBalance)
          ) {
            handleSuccess();
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, supabase]);

  // SECONDARY SIGNAL: subscribe to wallet_transactions status change
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
        },
        (payload) => {
          const newStatus = (payload.new as Record<string, unknown>)?.status as string | undefined;
          const extId = (payload.new as Record<string, unknown>)?.external_transaction_id as string | undefined;
          const ref = (payload.new as Record<string, unknown>)?.reference as string | undefined;
          if (extId !== depositId && ref !== depositId) return;
          if (newStatus === "completed") handleSuccess();
          else if (newStatus === "failed" || newStatus === "cancelled") handleFailed();
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositId, supabase]);

  // TERTIARY: polling fallback
  useEffect(() => {
    if (!depositId) {
      navigate("/wallet", { replace: true });
      return;
    }
    sessionStorage.setItem("pendingWalletDepositId", depositId);

    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      if (succeeded.current) return;
      pollCount.current += 1;

      if (pollCount.current > MAX_POLLS) {
        if (!succeeded.current) setPollState("timeout");
        sessionStorage.removeItem("pendingWalletDepositId");
        return;
      }

      try {
        // Check wallet_transactions for status
        const { data: txRow } = await supabase
          .from("wallet_transactions")
          .select("id, status, metadata")
          .or(`external_transaction_id.eq.${depositId},reference.eq.${depositId}`)
          .maybeSingle();

        const metaStatus = txRow?.metadata
          ? (txRow.metadata as Record<string, unknown>)?.status as string | undefined
          : undefined;
        const txStatus = txRow?.status || metaStatus;

        if (txStatus === "completed") { handleSuccess(); return; }
        if (txStatus === "failed" || txStatus === "cancelled") { handleFailed(); return; }

        // Direct PawaPay check
        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;
        if (accessToken) {
          const pawaResult = await checkDepositStatus(depositId, accessToken);
          const pawaStatus = pawaResult?.status;
          if (pawaStatus === "COMPLETED") { handleSuccess(); return; }
          if (pawaStatus === "FAILED" || pawaStatus === "REJECTED" || pawaStatus === "CANCELLED") {
            handleFailed(); return;
          }
        }

        // Also check profile balance directly
        if (user?.id) {
          const storedInitial = sessionStorage.getItem(`initialBalance-${user.id}`);
          const { data: profile } = await supabase
            .from("profiles")
            .select("wallet_balance_rwf")
            .eq("id", user.id)
            .maybeSingle();
          if (profile && storedInitial !== null) {
            if (Number(profile.wallet_balance_rwf) > Number(storedInitial)) {
              handleSuccess(); return;
            }
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
      timer = setTimeout(() => { clearInterval(tick); poll(); }, POLL_INTERVAL_MS);
    };

    void poll();
    return () => { if (timer) clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depositId, navigate, supabase, user?.id]);

  // Store initial balance on mount so we can detect increase
  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("profiles")
      .select("wallet_balance_rwf")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          sessionStorage.setItem(`initialBalance-${user.id}`, String(data.wallet_balance_rwf ?? 0));
        }
      });
  }, [user?.id, supabase]);

  if (pollState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-semibold text-gray-900">Deposit confirmed!</h1>
        <p className="text-gray-500">Your wallet has been topped up. Redirecting to your wallet...</p>
      </div>
    );
  }

  if (pollState === "failed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <XCircle className="h-16 w-16 text-red-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Deposit failed</h1>
        <p className="text-gray-500">The payment was not completed. Please try again.</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/wallet")}>Back to wallet</Button>
        </div>
      </div>
    );
  }

  if (pollState === "timeout") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <XCircle className="h-16 w-16 text-amber-400" />
        <h1 className="text-2xl font-semibold text-gray-900">Taking too long</h1>
        <p className="text-gray-500">
          We didn't receive confirmation in time. If money was deducted from your phone,
          check your wallet balance — it may have already been credited.
        </p>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/wallet")}>Check my wallet</Button>
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
        Check my wallet instead
      </Button>
    </div>
  );
}

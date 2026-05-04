import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { checkDepositStatus } from "@/lib/pawapay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

type PollState = "pending" | "success" | "failed" | "timeout";
type FailureReason = "insufficient_funds" | "declined" | "expired" | "generic";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 100; // ~5 minutes

function mapFailureCode(code?: string): FailureReason {
  if (!code) return "generic";
  const c = code.toUpperCase();
  if (c.includes("INSUFFICIENT") || c.includes("BALANCE")) return "insufficient_funds";
  if (c.includes("TIMEOUT") || c.includes("EXPIRED")) return "expired";
  if (c.includes("DECLINED") || c.includes("CANCELLED") || c.includes("REJECTED") || c.includes("PAYER")) return "declined";
  return "generic";
}

export default function WalletCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { user } = useAuth();

  const depositIdFromUrl = params.get("depositId");
  const depositId = depositIdFromUrl || sessionStorage.getItem("pendingWalletDepositId");

  const [pollState, setPollState] = useState<PollState>("pending");
  const [countdown, setCountdown] = useState(0);
  const [failureReason, setFailureReason] = useState<FailureReason>("generic");
  const [depositedAmount, setDepositedAmount] = useState<number | null>(null);
  const [newWalletBalance, setNewWalletBalance] = useState<number | null>(null);
  const pollCount = useRef(0);
  const succeeded = useRef(false);
  const supabase = getSupabaseClient();

  const handleSuccess = (amount?: number, balance?: number) => {
    if (succeeded.current) return;
    succeeded.current = true;
    setPollState("success");
    if (amount != null) setDepositedAmount(amount);
    if (balance != null) setNewWalletBalance(balance);
    sessionStorage.removeItem("pendingWalletDepositId");
    // No auto-redirect — let the user read the confirmation page
  };

  const handleFailed = (reason: FailureReason = "generic") => {
    if (succeeded.current) return;
    setFailureReason(reason);
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
          const newBal = (payload.new as Record<string, unknown>)?.wallet_balance_rwf;
          const oldBal = (payload.old as Record<string, unknown>)?.wallet_balance_rwf;
          if (newBal !== undefined && oldBal !== undefined && Number(newBal) > Number(oldBal)) {
            const credited = Number(newBal) - Number(oldBal);
            handleSuccess(credited, Number(newBal));
          }
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          const extId = (payload.new as Record<string, unknown>)?.external_transaction_id as string | undefined;
          const ref = (payload.new as Record<string, unknown>)?.reference as string | undefined;
          if (extId !== depositId && ref !== depositId) return;
          // Legacy schema stores status inside metadata
          const metaRaw = (payload.new as Record<string, unknown>)?.metadata;
          const meta = typeof metaRaw === "object" && metaRaw !== null ? metaRaw as Record<string, unknown> : {};
          const status = meta.status as string | undefined;
          if (status === "completed") handleSuccess();
          else if (status === "failed") handleFailed("generic");
          else if (status === "cancelled") handleFailed("declined");
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [depositId]); // eslint-disable-line react-hooks/exhaustive-deps

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
        if (!succeeded.current) {
          // Mark the pending transaction as expired
          void (async () => {
            const { data: txn } = await supabase
              .from("wallet_transactions")
              .select("id, metadata")
              .eq("reference", depositId!)
              .maybeSingle();
            if (txn) {
              await supabase
                .from("wallet_transactions")
                .update({
                  metadata: {
                    ...(txn.metadata as Record<string, unknown> ?? {}),
                    status: "expired",
                    expired_at: new Date().toISOString(),
                  },
                })
                .eq("id", txn.id);
            }
          })();
          setFailureReason("expired");
          setPollState("timeout");
        }
        sessionStorage.removeItem("pendingWalletDepositId");
        return;
      }

      try {
        // Check wallet_transactions for status in metadata (legacy schema)
        const { data: txRow } = await supabase
          .from("wallet_transactions")
          .select("id, metadata")
          .eq("reference", depositId!)
          .maybeSingle();

        const metaStatus = txRow?.metadata
          ? (txRow.metadata as Record<string, unknown>)?.status as string | undefined
          : undefined;

        if (metaStatus === "completed") { handleSuccess(); return; }
        if (metaStatus === "failed") { handleFailed("generic"); return; }
        if (metaStatus === "cancelled") { handleFailed("declined"); return; }
        if (metaStatus === "expired") { setFailureReason("expired"); setPollState("timeout"); return; }

        // Direct PawaPay check
        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;
        if (accessToken) {
          const pawaResult = await checkDepositStatus(depositId, accessToken);
          const pawaStatus = pawaResult?.status;
          if (pawaStatus === "COMPLETED") {
            const amt = pawaResult?.requestedAmount ? Math.round(Number(pawaResult.requestedAmount)) : undefined;
            let newBal: number | undefined;
            if (user?.id) {
              const { data: prof } = await supabase.from("profiles").select("wallet_balance_rwf").eq("id", user.id).maybeSingle();
              if (prof) newBal = Number(prof.wallet_balance_rwf);
            }
            handleSuccess(amt, newBal);
            return;
          }
          if (pawaStatus === "FAILED") {
            const code = pawaResult?.failureReason?.failureCode;
            handleFailed(mapFailureCode(code));
            return;
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
  }, [depositId, navigate, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-green-50 to-white p-6 text-center">
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping rounded-full bg-green-300 opacity-50" style={{ animationDuration: "1.5s", animationIterationCount: "3" }} />
          <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-green-500 shadow-xl">
            <CheckCircle2 className="h-14 w-14 text-white" strokeWidth={1.5} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-green-700">Deposit Confirmed!</h1>
        {depositedAmount != null && depositedAmount > 0 && (
          <p className="mt-3 text-2xl font-semibold text-gray-800">
            RWF {depositedAmount.toLocaleString()} added to your wallet
          </p>
        )}
        {newWalletBalance != null && (
          <p className="mt-1 text-base text-gray-500">
            New balance:{" "}
            <span className="font-semibold text-gray-700">RWF {newWalletBalance.toLocaleString()}</span>
          </p>
        )}
        <div className="mt-6 w-full max-w-sm rounded-2xl border border-green-100 bg-white p-5 shadow-sm text-left space-y-2">
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            Mobile money payment received successfully
          </p>
          <p className="flex items-center gap-2 text-sm text-gray-600">
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-500" />
            Wallet balance updated
          </p>
        </div>
        <Button
          className="mt-8 bg-green-600 px-8 hover:bg-green-700"
          onClick={() => navigate("/wallet", { replace: true })}
        >
          Go to Wallet
        </Button>
      </div>
    );
  }

  const FAILURE_COPY: Record<FailureReason, { title: string; body: string }> = {
    insufficient_funds: {
      title: "Insufficient funds",
      body: "Your mobile money account doesn't have enough balance for this deposit. Please top up your mobile money and try again.",
    },
    declined: {
      title: "Payment declined",
      body: "You cancelled or declined the payment on your phone. No money was taken from your account. You can try again anytime.",
    },
    expired: {
      title: "Session expired",
      body: "You didn't confirm the payment on your phone in time. Your session expired automatically. No money was taken.",
    },
    generic: {
      title: "Deposit failed",
      body: "The payment could not be completed. Please try again.",
    },
  };

  if (pollState === "failed") {
    const copy = FAILURE_COPY[failureReason];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-red-200 bg-red-50">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
          <p className="mt-2 max-w-sm text-gray-500">{copy.body}</p>
        </div>
        {failureReason === "insufficient_funds" && (
          <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Tip: Make sure your mobile money account has enough balance before trying again.
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/wallet")}>Back to wallet</Button>
          <Button onClick={() => navigate("/wallet")}>Try again</Button>
        </div>
      </div>
    );
  }

  if (pollState === "timeout") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-amber-200 bg-amber-50">
          <XCircle className="h-12 w-12 text-amber-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Session expired</h1>
          <p className="mt-2 max-w-sm text-gray-500">
            We waited 5 minutes but you didn't confirm the payment on your phone.
            Your deposit session has been cancelled automatically.
          </p>
        </div>
        <div className="max-w-sm rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          If money was already deducted from your phone, check your wallet balance — it may already have been credited.
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/wallet")}>Check wallet</Button>
          <Button onClick={() => navigate("/wallet")}>Try again</Button>
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

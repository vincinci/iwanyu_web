import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { checkDepositStatus } from "@/lib/pawapay";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/auth";

type PollState = "pending" | "success" | "failed" | "timeout";
type FailureReason = "insufficient_funds" | "declined" | "expired" | "generic";

function mapFailureCode(code?: string): FailureReason {
  if (!code) return "generic";
  const c = code.toUpperCase();
  if (c.includes("INSUFFICIENT") || c.includes("BALANCE")) return "insufficient_funds";
  if (c.includes("TIMEOUT") || c.includes("EXPIRED")) return "expired";
  if (c.includes("DECLINED") || c.includes("CANCELLED") || c.includes("REJECTED") || c.includes("PAYER")) return "declined";
  return "generic";
}

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75; // 5 minutes

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const depositId = params.get("depositId");
  const { user } = useAuth();
  const _ = user; // accessed via supabase.auth.getSession()

  const [pollState, setPollState] = useState<PollState>("pending");
  const [countdown, setCountdown] = useState(0);
  const [failureReason, setFailureReason] = useState<FailureReason>("generic");
  const pollCount = useRef(0);
  const supabase = getSupabaseClient();

  useEffect(() => {
    if (!depositId || !orderId) {
      navigate("/orders", { replace: true });
      return;
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const poll = async () => {
      pollCount.current += 1;

      if (pollCount.current > MAX_POLLS) {
        setPollState("timeout");
        return;
      }

      try {
        // PRIMARY: Check order payment_verified_at (set by webhook when PawaPay confirms)
        const { data: orderRow } = await supabase
          .from("orders")
          .select("id, payment_verified_at, status")
          .eq("id", orderId!)
          .maybeSingle();

        if (orderRow?.payment_verified_at) {
          setPollState("success");
          setTimeout(() => navigate(`/order-confirmation/${orderId}`, { replace: true }), 1500);
          return;
        }

        // SECONDARY: Check wallet_transactions using only base columns (legacy schema)
        const { data: txRow } = await supabase
          .from("wallet_transactions")
          .select("id, metadata")
          .eq("reference", depositId!)
          .maybeSingle();

        const txStatus = (txRow?.metadata as Record<string, unknown> | null)?.status as string | undefined;

        if (txStatus === "completed") {
          setPollState("success");
          setTimeout(() => navigate(`/order-confirmation/${orderId}`, { replace: true }), 1500);
          return;
        }
        if (txStatus === "failed") {
          setFailureReason("generic");
          setPollState("failed");
          return;
        }
        if (txStatus === "cancelled") {
          setFailureReason("declined");
          setPollState("failed");
          return;
        }

        // TERTIARY: Direct PawaPay status check
        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;
        if (accessToken) {
          const pawaResult = await checkDepositStatus(depositId!, accessToken);
          const pawaStatus = pawaResult?.status;
          if (pawaStatus === "COMPLETED") {
            setPollState("success");
            setTimeout(() => navigate(`/order-confirmation/${orderId}`, { replace: true }), 1500);
            return;
          }
          if (pawaStatus === "FAILED" || pawaStatus === "REJECTED" || pawaStatus === "CANCELLED") {
            setFailureReason(mapFailureCode(pawaResult?.failureReason?.failureCode));
            setPollState("failed");
            return;
          }
        }
      } catch (e) {
        console.error("Poll error:", e);
      }

      // Still pending — count down before next poll
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
  }, [depositId, navigate, orderId, supabase]);

  if (pollState === "success") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h1 className="text-2xl font-semibold text-gray-900">Payment confirmed!</h1>
        <p className="text-gray-500">Redirecting to your order...</p>
      </div>
    );
  }

  if (pollState === "failed" || pollState === "timeout") {
    const FAILURE_COPY: Record<FailureReason, { title: string; body: string }> = {
      insufficient_funds: {
        title: "Insufficient funds",
        body: "Your mobile money account doesn't have enough balance. Please top up and try again.",
      },
      declined: {
        title: "Payment declined",
        body: "You cancelled or declined the payment on your phone. No money was taken. You can try again.",
      },
      expired: {
        title: "Payment timed out",
        body: "You didn't confirm the payment on your phone in time. No money was taken.",
      },
      generic: {
        title: "Payment failed",
        body: "The payment could not be completed. You can try again.",
      },
    };
    const reason = pollState === "timeout" ? "expired" : failureReason;
    const copy = FAILURE_COPY[reason];
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-red-200 bg-red-50">
          <XCircle className="h-12 w-12 text-red-500" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{copy.title}</h1>
          <p className="mt-2 max-w-sm text-gray-500">{copy.body}</p>
        </div>
        {reason === "insufficient_funds" && (
          <div className="max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Make sure your mobile money account has enough balance before trying again.
          </div>
        )}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate("/orders")}>My orders</Button>
          <Button onClick={() => navigate("/checkout")}>Try again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-center p-6">
      <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Confirming payment…</h1>
        <p className="mt-1 text-sm text-gray-500">Please approve the request on your phone.</p>
      </div>
      {countdown > 0 && (
        <p className="text-xs text-gray-400">Checking again in {countdown}s…</p>
      )}
      <Button variant="ghost" size="sm" onClick={() => navigate("/orders")}>
        Check my orders instead
      </Button>
    </div>
  );
}

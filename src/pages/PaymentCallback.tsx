import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { checkDepositStatus } from "@/lib/pawapay";
import { Button } from "@/components/ui/button";

type PollState = "pending" | "success" | "failed" | "timeout";

const POLL_INTERVAL_MS = 4000;
const MAX_POLLS = 75; // 5 minutes

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("orderId");
  const depositId = params.get("depositId");

  const [pollState, setPollState] = useState<PollState>("pending");
  const [countdown, setCountdown] = useState(0);
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
        // Check wallet_transactions table for completion signal from webhook
        const { data: txRow } = await supabase
          .from("wallet_transactions")
          .select("status")
          .eq("metadata->>depositId", depositId)
          .maybeSingle();

        if (txRow?.status === "completed") {
          setPollState("success");
          // Mark order as Processing now that payment is confirmed
          await supabase
            .from("orders")
            .update({ status: "Processing", payment_status: "paid" })
            .eq("id", orderId);
          setTimeout(() => navigate(`/order-confirmation/${orderId}`, { replace: true }), 1500);
          return;
        }
        if (txRow?.status === "failed") {
          setPollState("failed");
          return;
        }

        // Fall back to direct PawaPay status check
        const status = await checkDepositStatus(depositId);
        if (status === "COMPLETED") {
          setPollState("success");
          await supabase
            .from("orders")
            .update({ status: "Processing", payment_status: "paid" })
            .eq("id", orderId);
          setTimeout(() => navigate(`/order-confirmation/${orderId}`, { replace: true }), 1500);
          return;
        }
        if (status === "FAILED" || status === "CANCELLED") {
          setPollState("failed");
          return;
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center p-6">
        <XCircle className="h-16 w-16 text-red-400" />
        <h1 className="text-2xl font-semibold text-gray-900">
          {pollState === "timeout" ? "Payment timed out" : "Payment failed"}
        </h1>
        <p className="text-gray-500">
          {pollState === "timeout"
            ? "We didn't receive confirmation in time. Please check your orders."
            : "The payment was not completed. You can try again."}
        </p>
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

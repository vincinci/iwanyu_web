import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { checkDepositStatus } from "@/lib/pawapay";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [status, setStatus] = useState<"verifying" | "success" | "failed" | "pending">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  const maybeRedirectToPawaPayAuth = (depositId: string, url: string | undefined): void => {
    if (!url) return;
    const key = `pawapayAuthRedirected:${depositId}`;
    if (sessionStorage.getItem(key) === "1") return;
    sessionStorage.setItem(key, "1");
    window.location.assign(url);
  };

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const orderId = searchParams.get("orderId") || sessionStorage.getItem("pendingOrderId");
        const pawaStatus = (searchParams.get("status") || "").toLowerCase();
        const depositId =
          searchParams.get("depositId") ||
          sessionStorage.getItem("pendingDepositId") ||
          orderId ||
          "";

        if (pawaStatus === "cancelled" || pawaStatus === "failed") {
          setStatus("failed");
          setMessage("Payment failed or was cancelled. Your order is saved but not paid.");
          return;
        }

        if (!orderId || !depositId) {
          setStatus("failed");
          setMessage("Missing payment information. Please check your orders.");
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
          setMessage("Session expired. Please log in and check your orders.");
          return;
        }

        setStatus("verifying");
        setMessage("Confirming your Mobile Money payment...");

        const pollOnce = async (): Promise<"completed" | "failed" | "pending"> => {
          const res = await checkDepositStatus(depositId, accessToken);
          const s = String(res?.status ?? "").trim().toUpperCase();
          const failedStatuses = new Set(["FAILED", "REJECTED", "CANCELLED", "DECLINED"]);
          const completedStatuses = new Set(["COMPLETED", "SETTLED", "PAID", "SUCCESS"]);
          if (completedStatuses.has(s)) return "completed";
          if (failedStatuses.has(s)) return "failed";

          const authUrl = res?.authorizationUrl || res?.authenticationUrl;
          if (authUrl) {
            maybeRedirectToPawaPayAuth(depositId, authUrl);
          }
          return "pending";
        };

        // Poll for a short window. The edge function also reconciles the DB state when completed.
        for (let attempt = 0; attempt < 10; attempt += 1) {
          const state = await pollOnce();
          if (state === "completed") {
            sessionStorage.removeItem("pendingOrderId");
            sessionStorage.removeItem("pendingDepositId");

            setStatus("success");
            setMessage("Payment successful! Your order is now being processed.");

            toast({
              title: "Payment successful",
              description: `Order ${orderId} is now processing.`,
            });

            navigate(`/order-confirmation/${orderId}`);
            return;
          }

          if (state === "failed") {
            setStatus("failed");
            setMessage("Payment failed. Please try again.");
            return;
          }

          await new Promise((r) => window.setTimeout(r, 2000));
        }

        // Timed out waiting; order is saved and may still complete via webhook.
        setStatus("pending");
        setMessage("Payment is still pending. Please confirm the payment on your phone and check your orders in a few minutes.");
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("failed");
        setMessage(error instanceof Error ? error.message : "Unknown error occurred");
      }
    };

    verifyPayment();
  }, [searchParams, supabase, user, toast, navigate]);

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12 flex items-center justify-center">
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
              <h1 className="text-2xl font-semibold text-green-600">Payment Successful!</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate("/orders")}>View Orders</Button>
                <Button variant="outline" onClick={() => navigate("/")}>
                  Continue Shopping
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
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate("/orders")}>View Orders</Button>
                <Button variant="outline" onClick={() => navigate("/checkout")}>
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="space-y-4">
              <Loader2 className="h-16 w-16 animate-spin text-amber-500 mx-auto" />
              <h1 className="text-2xl font-semibold">Payment Pending</h1>
              <p className="text-muted-foreground">{message}</p>
              <div className="flex gap-3 justify-center pt-4">
                <Button onClick={() => navigate("/orders")}>View Orders</Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Check Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}

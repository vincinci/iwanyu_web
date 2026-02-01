import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { clear } = useCart();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [status, setStatus] = useState<"verifying" | "success" | "failed">("verifying");
  const [message, setMessage] = useState("Verifying your payment...");

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Get transaction details from URL params (Flutterwave adds these)
        const transactionId = searchParams.get("transaction_id") || searchParams.get("tx_id");
        const flwStatus = searchParams.get("status");
        const orderId = searchParams.get("orderId") || sessionStorage.getItem("pendingOrderId");
        const expectedAmount = searchParams.get("amount") || sessionStorage.getItem("pendingOrderAmount");

        // If payment was cancelled or failed at Flutterwave
        if (flwStatus === "cancelled") {
          setStatus("failed");
          setMessage("Payment was cancelled. Your order has been saved but not paid.");
          return;
        }

        if (flwStatus === "failed") {
          setStatus("failed");
          setMessage("Payment failed. Please try again.");
          return;
        }

        if (!transactionId || !orderId || !expectedAmount) {
          setStatus("failed");
          setMessage("Missing payment information. Please contact support.");
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

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error("Supabase configuration missing");
        }

        // Call verification endpoint
        const verifyRes = await fetch(
          `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/flutterwave-verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              orderId,
              transactionId,
              expectedAmount: Number(expectedAmount),
            }),
          }
        );

        if (!verifyRes.ok) {
          const errorText = await verifyRes.text();
          console.error("Verification failed:", errorText);
          setStatus("failed");
          setMessage("Payment verification failed. Please contact support.");
          return;
        }

        // Success!
        clear(); // Clear cart
        sessionStorage.removeItem("pendingOrderId");
        sessionStorage.removeItem("pendingOrderAmount");

        setStatus("success");
        setMessage("Payment successful! Your order is now being processed.");

        toast({
          title: "Payment successful",
          description: `Order ${orderId} is now processing.`,
        });
      } catch (error) {
        console.error("Payment verification error:", error);
        setStatus("failed");
        setMessage(error instanceof Error ? error.message : "Unknown error occurred");
      }
    };

    verifyPayment();
  }, [searchParams, supabase, user, clear, toast]);

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
        </div>
      </div>
    </StorefrontPage>
  );
}

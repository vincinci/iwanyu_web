import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/context/auth";
import { Check, Package, Loader2 } from "lucide-react";

interface OrderDetails {
  id: string;
  total_rwf: number;
  status: string;
  created_at: string;
  items?: Array<{
    product_name: string;
    quantity: number;
    price_rwf: number;
  }>;
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) {
        setError("No order ID provided");
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_rwf, status, created_at")
          .eq("id", orderId)
          .single();

        if (fetchError) {
          console.error("Error fetching order:", fetchError);
          setError("Order not found");
        } else {
          setOrder(data);
        }
      } catch (err) {
        console.error("Error:", err);
        setError("Failed to load order");
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, supabase]);

  if (loading) {
    return (
      <StorefrontPage>
        <div className="container mx-auto max-w-md px-4 py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-4 text-gray-500">Loading order details...</p>
        </div>
      </StorefrontPage>
    );
  }

  if (error || !order) {
    return (
      <StorefrontPage>
        <div className="container mx-auto max-w-md px-4 py-12 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <Package className="h-8 w-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900">Order Not Found</h1>
          <p className="mt-2 text-gray-500">{error || "We couldn't find this order."}</p>
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => navigate("/")} className="w-full">
              Go Home
            </Button>
            <Button variant="outline" onClick={() => navigate("/orders")} className="w-full">
              View Orders
            </Button>
          </div>
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage>
      <div className="container mx-auto max-w-md px-4 py-8">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* Success Icon */}
          <div className="mb-6 flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Check className="h-10 w-10 text-green-600" />
            </div>
          </div>

          {/* Header */}
          <div className="text-center">
            <h1 className="text-2xl font-semibold text-gray-900">Order Confirmed!</h1>
            <p className="mt-2 text-gray-500">
              Thank you for your purchase. Your order has been placed successfully.
            </p>
          </div>

          {/* Order Details */}
          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-sm text-gray-500">Order ID</span>
              <span className="font-medium text-gray-900">{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 py-3">
              <span className="text-sm text-gray-500">Total</span>
              <span className="font-semibold text-gray-900">{order.total_rwf?.toLocaleString()} RWF</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm text-gray-500">Status</span>
              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                {order.status || "Processing"}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => navigate("/orders")} className="w-full">
              View Order Details
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="w-full">
              Continue Shopping
            </Button>
          </div>
        </div>
      </div>
    </StorefrontPage>
  );
}

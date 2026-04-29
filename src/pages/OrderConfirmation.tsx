import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/context/auth";
import { Check, Package, Loader2, MapPin, Truck, CreditCard } from "lucide-react";

interface OrderItem {
  product_id: string;
  title: string;
  quantity: number;
  price_rwf: number;
  image_url: string;
  status: string;
}

interface OrderDetails {
  id: string;
  total_rwf: number;
  status: string;
  created_at: string;
  shipping_address: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  payment_method: string | null;
  items?: OrderItem[];
}

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, isReady } = useAuth();
  const supabase = getSupabaseClient();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchOrder = async () => {
      if (!isReady) {
        return;
      }

      if (!orderId) {
        setError("No order ID provided");
        setLoading(false);
        return;
      }

      if (!user) {
        setError("Please sign in to view this order");
        setLoading(false);
        return;
      }

      const fetchWithRetry = async (attempt = 0): Promise<void> => {
        try {
        const normalizedOrderId = decodeURIComponent(orderId).trim();

        // Fetch order details
        const { data: orderData, error: fetchError } = await supabase
          .from("orders")
          .select("id, total_rwf, status, created_at, shipping_address, shipping_name, shipping_phone, payment_method")
          .eq("id", normalizedOrderId)
          .eq("buyer_user_id", user.id)
          .single();

        if (fetchError) {
          if (attempt === 0) {
            window.setTimeout(() => {
              if (!cancelled) {
                void fetchWithRetry(1);
              }
            }, 1200);
            return;
          }
          console.error("Error fetching order:", fetchError);
          setError("Order not found");
          return;
        }

        // Fetch order items
        const { data: itemsData, error: itemsError } = await supabase
          .from("order_items")
          .select("product_id, title, quantity, price_rwf, image_url, status")
          .eq("order_id", normalizedOrderId);

        if (itemsError) {
          console.error("Error fetching order items:", itemsError);
        }

        setOrder({
          ...orderData,
          items: itemsData || []
        });
        } catch (err) {
          if (attempt === 0) {
            window.setTimeout(() => {
              if (!cancelled) {
                void fetchWithRetry(1);
              }
            }, 1200);
            return;
          }
          console.error("Error:", err);
          setError("Failed to load order");
        } finally {
          if (!cancelled) {
            setLoading(false);
          }
        }
      };

      await fetchWithRetry();
    };

    void fetchOrder();
    return () => {
      cancelled = true;
    };
  }, [isReady, orderId, supabase, user]);

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

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "paid":
      case "processing":
        return "bg-blue-100 text-blue-700";
      case "shipped":
        return "bg-purple-100 text-purple-700";
      case "delivered":
        return "bg-green-100 text-green-700";
      case "cancelled":
      case "refunded":
        return "bg-red-100 text-red-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

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

          {/* Order ID & Date */}
          <div className="mt-6 rounded-2xl bg-gray-50 p-4">
            <div className="flex items-center justify-between border-b border-gray-200 pb-3">
              <span className="text-sm text-gray-500">Order ID</span>
              <span className="font-medium text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
            </div>
            <div className="flex items-center justify-between border-b border-gray-200 py-3">
              <span className="text-sm text-gray-500">Date</span>
              <span className="text-sm text-gray-900">{formatDate(order.created_at)}</span>
            </div>
            <div className="flex items-center justify-between pt-3">
              <span className="text-sm text-gray-500">Status</span>
              <span className={`rounded-full px-3 py-1 text-xs font-medium ${getStatusColor(order.status || "Processing")}`}>
                {order.status || "Processing"}
              </span>
            </div>
          </div>

          {/* Order Items */}
          {order.items && order.items.length > 0 && (
            <div className="mt-6">
              <h3 className="mb-3 text-lg font-semibold text-gray-900">Items</h3>
              <div className="space-y-3">
                {order.items.map((item, index) => (
                  <div key={index} className="flex gap-3 rounded-2xl border border-gray-200 p-3">
                    {/* Product Image */}
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-100">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.title} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    {/* Product Details */}
                    <div className="flex flex-1 flex-col justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900 line-clamp-2">{item.title}</h4>
                        <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusColor(item.status)}`}>
                          {item.status}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {(item.price_rwf * item.quantity).toLocaleString()} RWF
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Shipping Info */}
          {(order.shipping_name || order.shipping_address) && (
            <div className="mt-6">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
                <MapPin className="h-5 w-5" /> Shipping
              </h3>
              <div className="rounded-2xl border border-gray-200 p-4">
                {order.shipping_name && (
                  <p className="font-medium text-gray-900">{order.shipping_name}</p>
                )}
                {order.shipping_phone && (
                  <p className="text-sm text-gray-500">{order.shipping_phone}</p>
                )}
                {order.shipping_address && (
                  <p className="mt-1 text-sm text-gray-500">{order.shipping_address}</p>
                )}
              </div>
            </div>
          )}

          {/* Payment Info */}
          <div className="mt-6">
            <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-gray-900">
              <CreditCard className="h-5 w-5" /> Payment
            </h3>
            <div className="rounded-2xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Method</span>
                <span className="font-medium text-gray-900">
                  {order.payment_method === "wallet" ? "Wallet" : 
                   order.payment_method === "pawapay_momo" ? "Mobile Money" : 
                   order.payment_method === "flutterwave_card" ? "Card" : 
                   order.payment_method || "N/A"}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-3">
                <span className="text-lg font-semibold text-gray-900">Total</span>
                <span className="text-xl font-bold text-gray-900">{order.total_rwf?.toLocaleString()} RWF</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3">
            <Button onClick={() => navigate("/orders")} className="w-full">
              View All Orders
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

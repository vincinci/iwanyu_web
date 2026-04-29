import StorefrontPage from "@/components/StorefrontPage";
import { formatMoney } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useState } from "react";
import { Package, ShoppingBag, Clock, CheckCircle, Truck, XCircle, LogIn, ChevronDown, ChevronUp, MapPin, CreditCard } from "lucide-react";

type DbOrder = {
  id: string;
  created_at: string;
  status: string;
  total_rwf: number;
  shipping_address: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  payment_method: string | null;
};

type OrderItem = {
  product_id: string;
  title: string;
  quantity: number;
  price_rwf: number;
  image_url: string;
  status: string;
};

type ViewOrder = {
  id: string;
  status: string;
  createdAt: string;
  total: number;
  shippingAddress: string | null;
  shippingName: string | null;
  shippingPhone: string | null;
  paymentMethod: string | null;
  items: OrderItem[];
};

const statusConfig: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  pending: { icon: <Clock className="h-4 w-4" />, color: "text-yellow-700", bgColor: "bg-yellow-50 border-yellow-200" },
  processing: { icon: <Package className="h-4 w-4" />, color: "text-blue-700", bgColor: "bg-blue-50 border-blue-200" },
  shipped: { icon: <Truck className="h-4 w-4" />, color: "text-purple-700", bgColor: "bg-purple-50 border-purple-200" },
  delivered: { icon: <CheckCircle className="h-4 w-4" />, color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  cancelled: { icon: <XCircle className="h-4 w-4" />, color: "text-red-700", bgColor: "bg-red-50 border-red-200" },
};

export default function OrdersPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const supabase = getSupabaseClient();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<ViewOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabase || !user) {
        setOrders([]);
        return;
      }

      setLoading(true);
      try {
        // Fetch orders with shipping and payment details
        const { data: ordersData, error: ordersError } = await supabase
          .from("orders")
          .select("id, created_at, status, total_rwf, shipping_address, shipping_name, shipping_phone, payment_method")
          .eq("buyer_user_id", user.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (ordersError) throw ordersError;

        // Fetch order items for all orders
        const orderIds = (ordersData ?? []).map(o => o.id);
        let itemsData: OrderItem[] = [];
        
        if (orderIds.length > 0) {
          const { data: items } = await supabase
            .from("order_items")
            .select("product_id, title, quantity, price_rwf, image_url, status, order_id")
            .in("order_id", orderIds);
          
          itemsData = items || [];
        }

        // Combine orders with their items
        const combinedOrders: ViewOrder[] = (ordersData ?? []).map((o) => ({
          id: o.id,
          status: o.status,
          createdAt: o.created_at,
          total: Number(o.total_rwf ?? 0),
          shippingAddress: o.shipping_address,
          shippingName: o.shipping_name,
          shippingPhone: o.shipping_phone,
          paymentMethod: o.payment_method,
          items: itemsData.filter(item => (item as any).order_id === o.id),
        }));

        if (!cancelled) setOrders(combinedOrders);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const getStatusInfo = (status: string) => {
    return statusConfig[status.toLowerCase()] ?? statusConfig.pending;
  };

  const toggleOrder = (orderId: string) => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return "N/A";
    switch (method) {
      case "wallet": return "Wallet";
      case "pawapay_momo": return "Mobile Money";
      case "flutterwave_card": return "Card";
      default: return method;
    }
  };

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-gray-900" />
          <h1 className="text-3xl font-semibold text-gray-900">{t("orders.title")}</h1>
        </div>
        <p className="text-gray-600 mb-8">{t("orders.subtitle")}</p>

        {!user ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
              <LogIn className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              {t("orders.signInTitle")}
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              {t("orders.signInDesc")}
            </p>
            <Link to="/login">
              <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 px-8">
                <LogIn className="mr-2 h-4 w-4" />
                {t("orders.signIn")}
              </Button>
            </Link>
          </div>
        ) : null}

        {!supabase && user ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="font-semibold text-red-900">{t("orders.unavailable")}</div>
            <div className="mt-1 text-red-700">{t("orders.dbNotConfigured")}</div>
          </div>
        ) : null}

        {user && supabase && (
          <div className="space-y-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse">
                    <div className="h-5 bg-gray-200 rounded w-48 mb-4"></div>
                    <div className="flex gap-8">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-32"></div>
                      <div className="h-4 bg-gray-200 rounded w-28"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange-50 mb-6">
                  <ShoppingBag className="w-12 h-12 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {t("orders.noneTitle")}
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  {t("orders.noneDesc")}
                </p>
                <Link to="/">
                  <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 px-8">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    {t("orders.startShopping")}
                  </Button>
                </Link>
              </div>
            ) : (
              orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const isExpanded = expandedOrder === order.id;
                
                return (
                  <div 
                    key={order.id} 
                    className="rounded-xl border border-gray-200 bg-white shadow-sm transition hover:border-gray-400 hover:shadow-md overflow-hidden"
                  >
                    {/* Order Header - Always Visible */}
                    <div 
                      onClick={() => toggleOrder(order.id)}
                      className="cursor-pointer p-4"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <span className="text-base font-mono text-gray-700">
                            Order #{order.id.slice(0, 8)}...
                          </span>
                          <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border flex items-center gap-1.5 px-3 py-1 w-fit`}>
                            {statusInfo.icon}
                            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-gray-500">
                          <span className="text-sm">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                          <span className="font-bold text-gray-900">{formatMoney(order.total)}</span>
                          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Order Details */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {/* Order Items */}
                        {order.items.length > 0 && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                              <Package className="h-4 w-4" /> Items ({order.items.length})
                            </h4>
                            <div className="space-y-3">
                              {order.items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
                                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                    {item.image_url ? (
                                      <img 
                                        src={item.image_url} 
                                        alt={item.title} 
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center">
                                        <Package className="h-6 w-6 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  <div className="flex flex-1 flex-col justify-between">
                                    <div>
                                      <h5 className="font-medium text-gray-900 text-sm line-clamp-2">{item.title}</h5>
                                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.bgColor} ${statusInfo.color}`}>
                                        {item.status}
                                      </span>
                                      <span className="font-semibold text-gray-900 text-sm">
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
                        {(order.shippingName || order.shippingAddress) && (
                          <div className="mb-4">
                            <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                              <MapPin className="h-4 w-4" /> Shipping Address
                            </h4>
                            <div className="rounded-lg border border-gray-200 bg-white p-3">
                              {order.shippingName && (
                                <p className="font-medium text-gray-900 text-sm">{order.shippingName}</p>
                              )}
                              {order.shippingPhone && (
                                <p className="text-xs text-gray-500">{order.shippingPhone}</p>
                              )}
                              {order.shippingAddress && (
                                <p className="text-sm text-gray-500">{order.shippingAddress}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Payment Info */}
                        <div>
                          <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <CreditCard className="h-4 w-4" /> Payment
                          </h4>
                          <div className="rounded-lg border border-gray-200 bg-white p-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-gray-500">Method</span>
                              <span className="font-medium text-gray-900 text-sm">
                                {getPaymentMethodLabel(order.paymentMethod)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-2">
                              <span className="font-semibold text-gray-900">Total</span>
                              <span className="font-bold text-gray-900">{formatMoney(order.total)}</span>
                            </div>
                          </div>
                        </div>

                        {/* View Full Details Button */}
                        <Button 
                          onClick={() => navigate(`/order-confirmation/${order.id}`)}
                          className="w-full mt-4"
                          variant="outline"
                        >
                          View Full Order Details
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

import StorefrontPage from "@/components/StorefrontPage";
import { formatMoney } from "@/lib/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useEffect, useMemo, useState } from "react";
import { Package, ShoppingBag, Clock, CheckCircle, Truck, XCircle, LogIn } from "lucide-react";

type DbOrder = {
  id: string;
  created_at: string;
  status: string;
  total_rwf: number;
};

type ViewOrder = {
  id: string;
  status: string;
  createdAt: string;
  total: number;
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
  const supabase = getSupabaseClient();
  const [dbOrders, setDbOrders] = useState<DbOrder[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!supabase || !user) {
        setDbOrders(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("orders")
          .select("id, created_at, status, total_rwf")
          .eq("buyer_user_id", user.id)
          .order("created_at", { ascending: false });

        if (cancelled) return;
        if (error) throw error;

        setDbOrders((data ?? []) as DbOrder[]);
      } catch {
        if (!cancelled) setDbOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  const viewOrders: ViewOrder[] = useMemo(
    () =>
      (dbOrders ?? []).map((o) => ({
        id: o.id,
        status: o.status,
        createdAt: o.created_at,
        total: Number(o.total_rwf ?? 0),
      })),
    [dbOrders]
  );

  const getStatusInfo = (status: string) => {
    return statusConfig[status.toLowerCase()] ?? statusConfig.pending;
  };

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="flex items-center gap-3 mb-2">
          <Package className="h-8 w-8 text-gray-900" />
          <h1 className="text-3xl font-semibold text-gray-900">Your Orders</h1>
        </div>
        <p className="text-gray-600 mb-8">Track and manage your orders</p>

        {!user ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-gray-100 mb-6">
              <LogIn className="w-12 h-12 text-gray-400" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Sign in to see your orders
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Your order history, tracking information, and purchase details are available after signing in.
            </p>
            <Link to="/login">
              <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 px-8">
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          </div>
        ) : null}

        {!supabase && user ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
            <div className="font-semibold text-red-900">Orders are not available</div>
            <div className="mt-1 text-red-700">Database connection is not configured.</div>
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
            ) : viewOrders.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange-50 mb-6">
                  <ShoppingBag className="w-12 h-12 text-orange-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  No orders yet
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  When you make a purchase, your orders will appear here. Start shopping to see your order history!
                </p>
                <Link to="/">
                  <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 px-8">
                    <ShoppingBag className="mr-2 h-4 w-4" />
                    Start Shopping
                  </Button>
                </Link>
              </div>
            ) : (
              viewOrders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                return (
                  <Card key={order.id} className="border border-gray-200 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <CardTitle className="text-base font-mono text-gray-700">
                          Order #{order.id.slice(0, 8)}...
                        </CardTitle>
                        <Badge className={`${statusInfo.bgColor} ${statusInfo.color} border flex items-center gap-1.5 px-3 py-1`}>
                          {statusInfo.icon}
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                        <div>
                          <span className="text-gray-500">Date:</span>{" "}
                          <span className="font-medium text-gray-900">
                            {new Date(order.createdAt).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Total:</span>{" "}
                          <span className="font-bold text-gray-900">{formatMoney(order.total)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

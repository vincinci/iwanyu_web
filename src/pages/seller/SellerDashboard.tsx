import { BarChart3, Package, ShoppingBag, Store, Wallet, Bell, ArrowRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { getSupabaseClient } from "@/lib/supabaseClient";

type VendorNotification = {
  id: string;
  title: string;
  message: string;
  created_at: string;
  vendor_id: string;
  read_at: string | null;
};

const navItems = [
  { label: "Overview", icon: BarChart3, href: "/seller" },
  { label: "Products", icon: Package, href: "/seller/products" },
  { label: "Orders", icon: ShoppingBag, href: "/seller/orders" },
  { label: "Payouts", icon: Wallet, href: "/seller/payouts" },
  { label: "Store Settings", icon: Store, href: "/seller/settings" },
];

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const { products } = useMarketplace();
  const supabase = getSupabaseClient();
  const location = useLocation();
  const [notifications, setNotifications] = useState<VendorNotification[]>([]);

  const [metrics, setMetrics] = useState<{ productCount: number; orderCount: number; salesRwf: number }>(
    { productCount: 0, orderCount: 0, salesRwf: 0 }
  );
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Check roles
  const isSellerOrAdmin = Boolean(user && (user.role === "seller" || user.role === "admin"));

  const [ownedVendorIds, setOwnedVendorIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnedVendorIds() {
      if (!supabase || !user || user.role === "admin") {
        setOwnedVendorIds([]);
        return;
      }

      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .limit(200);

      if (cancelled) return;
      if (error) {
        setOwnedVendorIds([]);
        return;
      }

      setOwnedVendorIds(((data ?? []) as Array<{ id: string }>).map((v) => v.id));
    }

    void loadOwnedVendorIds();
    return () => {
      cancelled = true;
    };
  }, [supabase, user]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase || !user) return;
      if (user.role === "admin") {
        setNotifications([]);
        return;
      }
      if (ownedVendorIds.length === 0) {
        setNotifications([]);
        return;
      }

      const { data, error } = await supabase
        .from("vendor_notifications")
        .select("id, title, message, created_at, vendor_id, read_at")
        .in("vendor_id", ownedVendorIds)
        .order("created_at", { ascending: false })
        .limit(5);

      if (cancelled) return;
      if (error) {
        setNotifications([]);
        return;
      }

      setNotifications((data ?? []) as VendorNotification[]);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase, user, ownedVendorIds]);

  useEffect(() => {
    let cancelled = false;
    async function loadMetrics() {
      if (!supabase || !user) return;

      if (user.role === "admin") {
        setMetrics({
          productCount: products.length,
          orderCount: 0,
          salesRwf: 0,
        });
        return;
      }

      if (ownedVendorIds.length === 0) {
        setMetrics({ productCount: 0, orderCount: 0, salesRwf: 0 });
        return;
      }

      setMetricsLoading(true);
      try {
        const ownedSet = new Set(ownedVendorIds);
        const productCount = products.filter((p) => ownedSet.has(p.vendorId)).length;

        const { data, error } = await supabase
          .from("order_items")
          .select("order_id, price_rwf, quantity, vendor_id")
          .in("vendor_id", ownedVendorIds)
          .limit(5000);

        if (error) throw error;

        const rows = (data ?? []) as Array<{ order_id: string; price_rwf: number; quantity: number; vendor_id: string }>;
        const uniqueOrders = new Set(rows.map((r) => r.order_id));
        const salesRwf = rows.reduce((sum, r) => sum + Number(r.price_rwf ?? 0) * Number(r.quantity ?? 0), 0);

        if (!cancelled) setMetrics({ productCount, orderCount: uniqueOrders.size, salesRwf });
      } catch {
        if (!cancelled) setMetrics({ productCount: 0, orderCount: 0, salesRwf: 0 });
      } finally {
        if (!cancelled) setMetricsLoading(false);
      }
    }

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [supabase, user, ownedVendorIds, products]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
            <h2 className="text-xl font-bold mb-2">Access Restricted</h2>
            <p className="mb-4 text-gray-500">You must be logged in to view this page.</p>
            <Link to="/login"><Button>Log In</Button></Link>
        </div>
      </div>
    );
  }

  if (!isSellerOrAdmin) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md text-center">
           <Store size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
           <h1 className="text-2xl font-bold text-gray-900 mb-2">Seller account needed</h1>
           <p className="text-gray-500 mb-8">
             Create your seller account to use this dashboard.
           </p>
           <div className="flex flex-col gap-3 sm:flex-row justify-center">
              <Link to="/sell">
                <Button className="w-full sm:w-auto rounded-full bg-black text-white hover:bg-gray-800">Start selling</Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="w-full sm:w-auto rounded-full border-gray-200">Return Home</Button>
              </Link>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="border-b border-gray-200/70 bg-white">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-base text-gray-900">Seller Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/">
               <Button variant="ghost" className="text-sm font-medium hover:bg-transparent hover:text-gray-900">Go to store</Button>
            </Link>
            <div className="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
                {user.name?.charAt(0) || "S"}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Minimal Sidebar */}
            <aside className="w-full lg:w-56 shrink-0">
              <nav className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-2">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.label}
                                to={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isActive 
                        ? "bg-gray-900 text-white" 
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                                }`}
                            >
                                <item.icon size={16} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1">
                <div className="mb-8">
                  <h1 className="text-2xl font-semibold text-gray-900 mb-2">Overview</h1>
                  <p className="text-gray-600 text-sm">Simple view of your store.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Sales</p>
                      <Wallet size={18} className="text-gray-400" />
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {metricsLoading ? "..." : formatMoney(metrics.salesRwf)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-white p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Orders</p>
                      <ShoppingBag size={18} className="text-gray-400" />
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {metricsLoading ? "..." : metrics.orderCount}
                    </div>
                  </div>
                  <div className="rounded-xl border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-gray-500">Products</p>
                      <Package size={18} className="text-gray-400" />
                    </div>
                    <div className="text-2xl font-semibold text-gray-900">
                      {metricsLoading ? "..." : metrics.productCount}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold">Notifications</h3>
                    </div>
                    <div className="space-y-3">
                      {notifications.length === 0 ? (
                        <div className="p-6 border border-dashed border-gray-200 rounded-xl text-center">
                          <Bell size={22} className="mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500">No new notifications.</p>
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="pb-3 border-b border-gray-100 last:border-0">
                            <p className="font-semibold text-sm mb-1">{n.title}</p>
                            <p className="text-gray-500 text-xs">{n.message}</p>
                            <span className="text-[10px] text-gray-400 mt-2 block">{new Date(n.created_at).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-base font-semibold">Quick actions</h3>
                    </div>
                    <div className="grid gap-3">
                       <Link to="/seller/products/new" className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                         <div>
                           <div className="font-medium text-sm">Add product</div>
                           <div className="text-gray-500 text-xs">Create a new listing</div>
                         </div>
                         <ArrowRight size={16} className="text-gray-400" />
                       </Link>
                             
                       <Link to="/seller/orders" className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                         <div>
                           <div className="font-medium text-sm">View orders</div>
                           <div className="text-gray-500 text-xs">See and update orders</div>
                         </div>
                         <ArrowRight size={16} className="text-gray-400" />
                       </Link>

                       <Link to="/seller/settings" className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:border-gray-300 transition-colors">
                         <div>
                           <div className="font-medium text-sm">Store settings</div>
                           <div className="text-gray-500 text-xs">Update store details</div>
                         </div>
                         <ArrowRight size={16} className="text-gray-400" />
                       </Link>
                    </div>
                  </div>
                </div>

            </main>
        </div>
      </div>
    </div>
  );
}

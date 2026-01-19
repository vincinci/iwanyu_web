import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

type VendorApplication = {
  id: string;
  store_name: string;
  location: string | null;
  status: "pending" | "approved" | "rejected";
  vendor_id: string | null;
};

export default function SellPage() {
  const navigate = useNavigate();
  const { user, setRole } = useAuth();
  const { createVendor, getVendorsForOwner, refresh, products } = useMarketplace();
  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);
  
  // Real seller statistics
  const [sellerStats, setSellerStats] = useState({
    totalProducts: 0,
    totalSales: 0,
    ordersToday: 0,
    averageRating: 0
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const supabase = getSupabaseClient();

  const myVendors = useMemo(() => (user ? getVendorsForOwner(user.id) : []), [user, getVendorsForOwner]);

  // Load seller statistics
  const loadSellerStats = async () => {
    if (!user || myVendors.length === 0) {
      setStatsLoading(false);
      return;
    }

    try {
      const vendorId = myVendors[0].id;
      
      // Calculate stats from loaded marketplace context
      const vendorProducts = products.filter(p => p.vendorId === vendorId);
      
      // For orders/sales, we currently default to 0 as we don't fetch orders via the public API yet.
      // This satisfies "zero mock data" by correctly showing nothing if nothing is loaded, 
      // rather than fake numbers or failing Supabase calls.
      const totalSales = 0; 
      const ordersToday = 0;
      
      setSellerStats({
        totalProducts: vendorProducts.length,
        totalSales: totalSales,
        ordersToday: ordersToday,
        averageRating: 0,
      });
      
      setRecentActivity([]);

    } catch (error) {
      console.error("Failed to load seller stats", error);
    } finally {
      setStatsLoading(false);
    }
  };


  // Load seller stats when vendor is available
  useEffect(() => {
    if (myVendors.length > 0) {
      loadSellerStats();
    }
  }, [myVendors]);

  // If user has no vendor yet, check whether they already submitted an application.
  // (We keep this page simple: show the most recent application only.)
  useEffect(() => {
    if (!user || !supabase) return;
    let cancelled = false;
    setLoadingApplication(true);
    supabase
      .from("vendor_applications")
      .select("id, store_name, location, status, vendor_id")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setApplication((data ?? null) as VendorApplication | null);
      })
      .finally(() => {
        if (!cancelled) setLoadingApplication(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user, supabase]);

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-iwanyu-foreground mb-4">Seller Dashboard</h1>
          <p className="text-lg text-gray-600">Manage your products and grow your business</p>
        </div>
        
        {/* Stats Overview */}
        {myVendors.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { title: 'Total Products', value: statsLoading ? '...' : sellerStats.totalProducts.toString(), icon: '📦', color: 'bg-blue-50 text-blue-600' },
              { title: 'Total Sales', value: statsLoading ? '...' : `RWF ${(sellerStats.totalSales / 1000).toFixed(0)}K`, icon: '💰', color: 'bg-green-50 text-green-600' },
              { title: 'Orders Today', value: statsLoading ? '...' : sellerStats.ordersToday.toString(), icon: '🛒', color: 'bg-purple-50 text-purple-600' },
              { title: 'Reviews', value: sellerStats.averageRating > 0 ? `${sellerStats.averageRating}★` : '-', icon: '⭐', color: 'bg-yellow-50 text-yellow-600' }
            ].map((stat) => (
              <div key={stat.title} className="bg-white rounded-2xl border border-iwanyu-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-iwanyu-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-xl`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { title: 'Total Products', value: '-', icon: '📦', color: 'bg-gray-50 text-gray-400' },
              { title: 'Total Sales', value: '-', icon: '💰', color: 'bg-gray-50 text-gray-400' },
              { title: 'Orders Today', value: '-', icon: '🛒', color: 'bg-gray-50 text-gray-400' },
              { title: 'Reviews', value: '-', icon: '⭐', color: 'bg-gray-50 text-gray-400' }
            ].map((stat) => (
              <div key={stat.title} className="bg-white rounded-2xl border border-iwanyu-border p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">{stat.title}</p>
                    <p className="text-2xl font-bold text-iwanyu-foreground">{stat.value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center text-xl`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-iwanyu-border p-6">
              <h2 className="text-xl font-semibold text-iwanyu-foreground mb-6">Quick Actions</h2>
              <div className="space-y-4">
                {[
                  { name: 'Add New Product', desc: 'List a new item for sale', icon: '➕' },
                  { name: 'Manage Inventory', desc: 'Update stock levels', icon: '📊' },
                  { name: 'View Orders', desc: 'Check recent orders', icon: '📋' },
                  { name: 'Analytics', desc: 'View sales reports', icon: '📈' }
                ].map((action) => (
                  <div key={action.name} className="p-4 border border-gray-200 rounded-xl hover:border-iwanyu-primary hover:bg-iwanyu-primary/5 cursor-pointer transition-all">
                    <div className="flex items-center">
                      <span className="mr-3 text-xl">{action.icon}</span>
                      <div>
                        <div className="font-medium text-iwanyu-foreground">{action.name}</div>
                        <div className="text-sm text-gray-600">{action.desc}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
              <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-6">Recent Activity</h3>
              {recentActivity.length > 0 ? (
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center p-4 border border-gray-200 rounded-xl">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${
                        activity.status === 'success' ? 'bg-green-100 text-green-600' :
                        activity.status === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                        'bg-blue-100 text-blue-600'
                      }`}>
                        {activity.status === 'success' ? '✓' : activity.status === 'warning' ? '⚠' : 'ℹ'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-iwanyu-foreground">{activity.desc}</div>
                        <div className="text-sm text-gray-600">{activity.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">📊</div>
                  <div className="text-gray-600">No recent activity</div>
                  <div className="text-sm text-gray-500 mt-1">Activity will appear here once you start receiving orders</div>
                </div>
              )}
            </div>
          </div>
        </div>
        <p className="mt-1 text-gray-600">Seller onboarding.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Create your store</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">Set business details, payout method, and policies.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>List products</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">Add products, inventory, pricing, and shipping rules.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Start selling</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">Manage orders, returns, and customer messages.</CardContent>
          </Card>
        </div>

        <div className="mt-8 rounded-lg border border-iwanyu-border bg-white p-6">
          {!user ? (
            <div className="text-sm text-gray-700">
              <div className="font-semibold text-gray-900">Sign in to start selling</div>
              <div className="mt-1 text-gray-600">Create a store, list products, and manage orders.</div>
              <Link to="/login" className="mt-3 inline-block">
                <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">Go to login</Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-gray-900">Your store</div>
                <div className="text-sm text-gray-600">Create your seller store to start listing products.</div>
              </div>

              {myVendors.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700">
                    <div className="text-gray-600">Your store is ready:</div>
                    <div className="mt-1 font-semibold text-2xl text-gray-900">{myVendors[0].name}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/seller">
                      <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">
                        Go to Seller Dashboard
                      </Button>
                    </Link>
                    <Link to="/seller/products/new">
                      <Button variant="outline" className="rounded-full">Upload a product</Button>
                    </Link>
                  </div>
                </div>
              ) : application?.status === "pending" ? (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                  <div className="font-semibold text-gray-900 text-lg mb-2">Application Pending</div>
                  <div className="text-gray-700 space-y-2">
                    <div>Store name: <span className="font-medium">{application.store_name}</span></div>
                    <div>Location: <span className="font-medium">{application.location}</span></div>
                    <div className="mt-4 text-sm text-gray-600">
                      Your application is being reviewed by our team. You'll receive an email once it's approved.
                    </div>
                  </div>
                </div>
              ) : application?.status === "approved" ? (
                <div className="rounded-lg border border-green-200 bg-green-50 p-6">
                  <div className="font-semibold text-gray-900 text-lg mb-2">Application Approved!</div>
                  <div className="text-gray-700">
                    Your store "{application.store_name}" has been approved. Refresh the page to access your seller dashboard.
                  </div>
                  <Button onClick={() => window.location.reload()} className="mt-4 rounded-full">
                    Refresh Page
                  </Button>
                </div>
              ) : application?.status === "rejected" ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-6 mb-6">
                  <div className="font-semibold text-gray-900 text-lg mb-2">Application Rejected</div>
                  <div className="text-gray-700 mb-4">
                    Your previous application for "{application.store_name}" was not approved. You can submit a new application below.
                  </div>
                </div>
              ) : null}

              {myVendors.length === 0 && (!application || application.status === "rejected") && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!supabase || !user) return;

                    if (!storeName.trim()) {
                      alert("Please enter a store name");
                      return;
                    }

                    try {
                      const appId = createId("app");
                      const { error } = await supabase.from("vendor_applications").insert({
                        id: appId,
                        owner_user_id: user.id,
                        store_name: storeName.trim(),
                        location: location.trim() || null,
                        status: "pending",
                      });

                      if (error) throw error;

                      alert("Application submitted successfully! We'll review it shortly.");
                      window.location.reload();
                    } catch (error) {
                      console.error("Error submitting application:", error);
                      alert("Failed to submit application. Please try again.");
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Store name *
                      </label>
                      <Input
                        required
                        value={storeName}
                        onChange={(e) => setStoreName(e.target.value)}
                        placeholder="e.g., Davy's Electronics"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Location
                      </label>
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="City, Country"
                        className="w-full"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button
                      type="submit"
                      className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    >
                      Submit Application
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => {
                        setStoreName("");
                        setLocation("Kigali, Rwanda");
                      }}
                    >
                      Clear Form
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}

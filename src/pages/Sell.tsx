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
  const { createVendor, getVendorsForOwner, refresh } = useMarketplace();
  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [application, setApplication] = useState<VendorApplication | null>(null);
  const [loadingApplication, setLoadingApplication] = useState(false);

  const supabase = getSupabaseClient();

  const myVendors = useMemo(() => (user ? getVendorsForOwner(user.id) : []), [user, getVendorsForOwner]);

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
      <div className="container py-8">
        <h1 className="text-3xl font-bold text-iwanyu-foreground">Sell on iwanyu</h1>
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
                <div className="text-sm text-gray-700">
                  <div className="text-gray-600">Store ready:</div>
                  <div className="mt-1 font-semibold text-gray-900">{myVendors[0].name}</div>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Store name</label>
                    <Input className="mt-1" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Your store name" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Location</label>
                    <Input className="mt-1" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="City, Country" />
                  </div>
                </div>
              )}

              {myVendors.length === 0 && application ? (
                <div className="rounded-lg border border-iwanyu-border bg-white p-4 text-sm text-gray-700">
                  <div className="font-semibold text-gray-900">Vendor application</div>
                  <div className="mt-1 text-gray-600">
                    Status: <span className="font-medium text-gray-900">{application.status}</span>
                  </div>
                  <div className="mt-1 text-gray-600">
                    Store: <span className="font-medium text-gray-900">{application.store_name}</span>
                  </div>
                  {application.status === "pending" ? (
                    <div className="mt-2 text-gray-600">Your application is pending admin approval.</div>
                  ) : null}
                  {application.status === "approved" ? (
                    <div className="mt-2 text-gray-600">Approved. Your store will appear shortly.</div>
                  ) : null}
                  {application.status === "rejected" ? (
                    <div className="mt-2 text-gray-600">Rejected. You can submit a new application.</div>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <Link to={myVendors.length > 0 ? "/seller" : "/vendor-application"}>
                  <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">
                    {myVendors.length > 0 ? "Go to Seller Dashboard" : "Start Vendor Application"}
                  </Button>
                </Link>

                <Link to="/seller/products/new">
                  <Button variant="outline" className="rounded-full">Upload a product</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}

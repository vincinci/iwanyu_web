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

import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { getSupabaseClient } from "@/lib/supabaseClient";
import type { Vendor } from "@/types/vendor";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SellPage() {
  const navigate = useNavigate();
  const { user, setRole } = useAuth();
  const { toast } = useToast();
  const { createVendor, refresh } = useMarketplace();
  const [storeName, setStoreName] = useState("");
  const [location, setLocation] = useState("Kigali, Rwanda");
  const [submittingApplication, setSubmittingApplication] = useState(false);

  const supabase = getSupabaseClient();

  const [ownedVendors, setOwnedVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnedVendors() {
      if (!user || !supabase) {
        setOwnedVendors([]);
        return;
      }

      const { data, error } = await supabase
        .from("vendors")
        .select("id, name, location, verified, owner_user_id, status")
        .eq("owner_user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (error) {
        setOwnedVendors([]);
        return;
      }

      const rows = (data ?? []) as Array<{
        id: string;
        name: string;
        location: string | null;
        verified: boolean;
        owner_user_id: string | null;
        status: string | null;
      }>;

      const mapped: Vendor[] = rows
        .map((v) => ({
          id: v.id,
          name: v.name,
          location: v.location ?? undefined,
          verified: Boolean(v.verified),
          ownerUserId: v.owner_user_id ?? undefined,
          status: (v.status ?? "approved") as Vendor["status"],
        }))
        .filter((v) => v.status === "approved");

      setOwnedVendors(mapped);
    }

    void loadOwnedVendors();
    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  const myVendors = useMemo(() => ownedVendors, [ownedVendors]);

  // If an approved vendor exists for this user, ensure their role becomes seller.
  // This avoids waiting for a slow profile refresh after admin approval.
  useEffect(() => {
    if (!user) return;
    if (user.role !== "buyer") return;
    if (myVendors.length === 0) return;

    void (async () => {
      try {
        await setRole("seller");
      } catch {
        // ignore
      }
    })();
  }, [myVendors.length, setRole, user]);

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-iwanyu-foreground mb-4">Sell on Iwanyu</h1>
          <p className="text-lg text-gray-600">Open your store in a few minutes. Simple and fast.</p>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>1. Create account</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">Make an account to start selling.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>2. Create store</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">Add your store name and location.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>3. Add products</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-gray-600">List items and start receiving orders.</CardContent>
          </Card>
        </div>

        <div className="mt-8 rounded-lg border border-iwanyu-border bg-white p-6">
          {!user ? (
            <div className="text-sm text-gray-700">
              <div className="font-semibold text-gray-900">Create an account to sell</div>
              <div className="mt-1 text-gray-600">We will take you to seller setup after sign up.</div>
              <div className="mt-4 flex flex-wrap gap-3">
                <Link to="/signup?next=/sell">
                  <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">Create account</Button>
                </Link>
                <Link to="/login?next=/sell">
                  <Button variant="outline" className="rounded-full">I already have an account</Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <div className="font-semibold text-gray-900">Your store</div>
                <div className="text-sm text-gray-600">Create your store to start listing products.</div>
              </div>

              {myVendors.length > 0 ? (
                <div className="space-y-4">
                  <div className="text-sm text-gray-700">
                    <div className="text-gray-600">Store name</div>
                    <div className="mt-1 font-semibold text-2xl text-gray-900">{myVendors[0].name}</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to="/seller">
                      <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">
                        Open Seller Dashboard
                      </Button>
                    </Link>
                    <Link to="/seller/products/new">
                      <Button variant="outline" className="rounded-full">Add a product</Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!user) return;

                    if (!storeName.trim()) {
                      toast({
                        title: "Store name required",
                        description: "Please enter a store name.",
                        variant: "destructive",
                      });
                      return;
                    }

                    try {
                      setSubmittingApplication(true);
                      await setRole("seller");
                      await createVendor({
                        name: storeName.trim(),
                        location: location.trim() || undefined,
                        verified: false,
                        ownerUserId: user.id,
                        status: "approved",
                      });
                      await refresh();

                      toast({
                        title: "Store created",
                        description: "Welcome! Your dashboard is ready.",
                      });
                      navigate("/seller");
                    } catch (error) {
                      console.error("Error creating store:", error);
                      toast({
                        title: "Could not create store",
                        description: error instanceof Error ? error.message : "Please try again.",
                        variant: "destructive",
                      });
                    } finally {
                      setSubmittingApplication(false);
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
                        placeholder="Example: Davy Electronics"
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
                      disabled={submittingApplication}
                      className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    >
                      {submittingApplication ? "Creating..." : "Create store"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      disabled={submittingApplication}
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

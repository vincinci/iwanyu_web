import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/context/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

type ProfileFormState = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  country: string;
};

export default function AccountPage() {
  const { user, setRole, refreshUser } = useAuth();
  const supabase = getSupabaseClient();
  const { toast } = useToast();

  const [form, setForm] = useState<ProfileFormState>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    country: "Rwanda",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const addressCount = useMemo(() => (form.address.trim() ? 1 : 0), [form.address]);

  // Save draft to localStorage whenever form changes
  useEffect(() => {
    if (form.fullName || form.phone || form.address || form.city) {
      localStorage.setItem('account_form_draft', JSON.stringify(form));
    }
  }, [form]);

  const loadAccountData = useCallback(async () => {
    if (!user || !supabase) return;
    setLoading(true);

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, phone, address, city, country")
        .eq("id", user.id)
        .maybeSingle();

      // Check for draft first
      const saved = localStorage.getItem('account_form_draft');
      let draftData: any = null;
      if (saved) {
        try {
          draftData = JSON.parse(saved);
        } catch {
          // Invalid JSON, ignore
        }
      }

      setForm({
        fullName: draftData?.fullName || (profileData?.full_name ?? (user.name ?? "")),
        phone: draftData?.phone || (profileData?.phone ?? ""),
        address: draftData?.address || (profileData?.address ?? ""),
        city: draftData?.city || (profileData?.city ?? ""),
        country: draftData?.country || (profileData?.country ?? "Rwanda"),
      });

      const [{ count: ordersCnt }, { count: wishlistCnt }] = await Promise.all([
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("buyer_user_id", user.id),
        supabase.from("wishlist_items").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      setOrderCount(ordersCnt ?? 0);
      setWishlistCount(wishlistCnt ?? 0);
    } catch {
      setOrderCount(0);
      setWishlistCount(0);
    } finally {
      setLoading(false);
    }
  }, [supabase, user]);

  useEffect(() => {
    void loadAccountData();
  }, [loadAccountData, refreshNonce]);

  const refreshAccount = useCallback(async () => {
    if (!user) return;
    setRefreshing(true);
    try {
      // Force fresh role resolution
      try {
        localStorage.removeItem(`iwanyu:role:${user.id}`);
      } catch {
        // ignore
      }

      await refreshUser();
      setRefreshNonce((n) => n + 1);
      toast({ title: "Refreshed", description: "Account and role reloaded." });
    } catch (e) {
      toast({
        title: "Refresh failed",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, toast, user]);

  async function saveProfile() {
    if (!user || !supabase) return;
    setSaving(true);

    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: form.fullName.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        city: form.city.trim() || null,
        country: form.country.trim() || null,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      toast({
        title: "✓ Profile saved",
        description: "Your profile has been updated successfully.",
        variant: "success" as any,
      });

      // Clear draft from localStorage after successful save
      localStorage.removeItem('account_form_draft');
    } catch {
      toast({
        title: "⚠ Could not save profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-iwanyu-foreground mb-4">My Account</h1>
          <p className="text-lg text-gray-600">Manage your account settings and preferences</p>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-iwanyu-border bg-white p-8">
            <div className="text-lg font-semibold text-gray-900">Sign in to manage your account</div>
            <div className="mt-1 text-gray-600">Your profile, orders, and wishlist are tied to your account.</div>
            <Link to="/login" className="mt-4 inline-block">
              <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">Go to login</Button>
            </Link>
          </div>
        ) : !supabase ? (
          <div className="rounded-2xl border border-iwanyu-border bg-white p-8">
            <div className="text-lg font-semibold text-gray-900">Profile is unavailable</div>
            <div className="mt-1 text-gray-600">Database connection is not configured.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-iwanyu-border p-6">
                <h2 className="text-xl font-semibold text-iwanyu-foreground mb-6">Account Menu</h2>
                <nav className="space-y-2">
                  <Link to="/account" className="block rounded-xl p-3 hover:bg-iwanyu-primary/5">
                    <span className="font-medium text-iwanyu-foreground">Profile</span>
                  </Link>
                  <Link to="/orders" className="block rounded-xl p-3 hover:bg-iwanyu-primary/5">
                    <span className="font-medium text-iwanyu-foreground">Orders</span>
                  </Link>
                  <Link to="/wishlist" className="block rounded-xl p-3 hover:bg-iwanyu-primary/5">
                    <span className="font-medium text-iwanyu-foreground">Wishlist</span>
                  </Link>
                </nav>
              </div>

              {(user.role === 'seller' || user.role === 'admin') && (
                <div className="mt-6 grid gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Quick Links</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                      <Link to="/orders">
                        <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90">View orders</Button>
                      </Link>
                      <Link to="/seller">
                        <Button variant="outline" className="rounded-full">Seller dashboard</Button>
                      </Link>
                      <Link to="/admin">
                        <Button variant="outline" className="rounded-full">Admin dashboard</Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-8">
              {import.meta.env.DEV ? (
                <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
                  <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-3">Developer</h3>
                  <p className="text-sm text-gray-600 mb-4">Role switcher (dev only).</p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={user.role === "buyer" ? "default" : "outline"}
                      className={user.role === "buyer" ? "rounded-full" : "rounded-full"}
                      onClick={async () => {
                        try {
                          await setRole("buyer");
                          toast({ title: "Role updated", description: "You are now a buyer." });
                        } catch (e) {
                          toast({
                            title: "Role update failed",
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Buyer
                    </Button>

                    <Button
                      variant={user.role === "seller" ? "default" : "outline"}
                      className={user.role === "seller" ? "rounded-full" : "rounded-full"}
                      onClick={async () => {
                        try {
                          await setRole("seller");
                          toast({ title: "Role updated", description: "You are now a seller." });
                        } catch (e) {
                          toast({
                            title: "Role update failed",
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Seller
                    </Button>

                    <Button
                      variant={user.role === "admin" ? "default" : "outline"}
                      className={user.role === "admin" ? "rounded-full" : "rounded-full"}
                      onClick={async () => {
                        try {
                          await setRole("admin");
                          toast({ title: "Role updated", description: "You are now an admin." });
                        } catch (e) {
                          toast({
                            title: "Role update failed",
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Admin
                    </Button>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">Current: {user.role ?? "buyer"}</div>
                </div>
              ) : null}

              <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
                <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-6">Profile Information</h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                      <Input
                        value={form.fullName}
                        onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+250 xxx xxx xxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                    <Input value={user.email ?? ""} disabled className="bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="Kigali"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                      <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={saveProfile}
                      disabled={saving || loading}
                      className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    >
                      {saving ? "Saving..." : "Save profile"}
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={refreshAccount} disabled={loading || refreshing}>
                      {refreshing ? "Refreshing..." : "Refresh account"}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
                <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-6">Account Statistics</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-iwanyu-primary/5 rounded-xl">
                    <div className="text-3xl font-bold text-iwanyu-primary">{orderCount ?? "—"}</div>
                    <div className="text-sm text-gray-600 mt-1">Total Orders</div>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">{wishlistCount ?? "—"}</div>
                    <div className="text-sm text-gray-600 mt-1">Wishlist Items</div>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{addressCount}</div>
                    <div className="text-sm text-gray-600 mt-1">Saved Addresses</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

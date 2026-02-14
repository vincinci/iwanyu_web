import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
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
  const { t } = useLanguage();
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
      let draftData: Partial<ProfileFormState> | null = null;
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
      toast({ title: t("account.refreshed"), description: t("account.refreshedDesc") });
    } catch (e) {
      toast({
        title: t("account.refreshFailed"),
        description: e instanceof Error ? e.message : t("account.tryAgain"),
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, t, toast, user]);

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
        title: t("account.profileSaved"),
        description: t("account.profileSavedDesc"),
      });

      // Clear draft from localStorage after successful save
      localStorage.removeItem('account_form_draft');
    } catch {
      toast({
        title: t("account.profileSaveFailed"),
        description: t("account.tryAgain"),
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
          <h1 className="text-3xl font-semibold text-gray-900 mb-2">{t("account.title")}</h1>
          <p className="text-base text-gray-600">{t("account.subtitle")}</p>
        </div>

        {!user ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">{t("account.signInTitle")}</div>
            <div className="mt-1 text-gray-600">{t("account.signInDesc")}</div>
            <Link to="/login" className="mt-4 inline-block">
              <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800">{t("account.goToLogin")}</Button>
            </Link>
          </div>
        ) : !supabase ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="text-lg font-semibold text-gray-900">{t("account.unavailableTitle")}</div>
            <div className="mt-1 text-gray-600">{t("account.unavailableDesc")}</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("account.menu")}</h2>
                <nav className="space-y-2">
                  <Link to="/account" className="block rounded-xl p-3 hover:bg-gray-50">
                    <span className="font-medium text-gray-900">{t("account.profile")}</span>
                  </Link>
                  <Link to="/orders" className="block rounded-xl p-3 hover:bg-gray-50">
                    <span className="font-medium text-gray-900">{t("header.orders")}</span>
                  </Link>
                  <Link to="/wishlist" className="block rounded-xl p-3 hover:bg-gray-50">
                    <span className="font-medium text-gray-900">{t("header.wishlist")}</span>
                  </Link>
                </nav>
              </div>

              {(user.role === 'seller' || user.role === 'admin') && (
                <div className="mt-6 grid gap-4">
                  <Card className="border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle>{t("account.quickLinks")}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-wrap gap-3">
                      <Link to="/orders">
                        <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800">{t("account.viewOrders")}</Button>
                      </Link>
                      <Link to="/seller">
                        <Button variant="outline" className="rounded-full">{t("account.sellerDashboard")}</Button>
                      </Link>
                      <Link to="/admin">
                        <Button variant="outline" className="rounded-full">{t("account.adminDashboard")}</Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            <div className="lg:col-span-2 space-y-8">
              {import.meta.env.DEV ? (
                <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
                  <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-3">{t("account.developer")}</h3>
                  <p className="text-sm text-gray-600 mb-4">{t("account.roleSwitcher")}</p>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant={user.role === "buyer" ? "default" : "outline"}
                      className={user.role === "buyer" ? "rounded-full" : "rounded-full"}
                      onClick={async () => {
                        try {
                          await setRole("buyer");
                          toast({ title: t("account.roleUpdated"), description: t("account.roleBuyer") });
                        } catch (e) {
                          toast({
                            title: t("account.roleUpdateFailed"),
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {t("account.buyer")}
                    </Button>

                    <Button
                      variant={user.role === "seller" ? "default" : "outline"}
                      className={user.role === "seller" ? "rounded-full" : "rounded-full"}
                      onClick={async () => {
                        try {
                          await setRole("seller");
                          toast({ title: t("account.roleUpdated"), description: t("account.roleSeller") });
                        } catch (e) {
                          toast({
                            title: t("account.roleUpdateFailed"),
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {t("account.seller")}
                    </Button>

                    <Button
                      variant={user.role === "admin" ? "default" : "outline"}
                      className={user.role === "admin" ? "rounded-full" : "rounded-full"}
                      onClick={async () => {
                        try {
                          await setRole("admin");
                          toast({ title: t("account.roleUpdated"), description: t("account.roleAdmin") });
                        } catch (e) {
                          toast({
                            title: t("account.roleUpdateFailed"),
                            description: e instanceof Error ? e.message : "Unknown error",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      {t("account.admin")}
                    </Button>
                  </div>

                  <div className="mt-3 text-xs text-gray-500">{t("account.current")}: {user.role ?? "buyer"}</div>
                </div>
              ) : null}

              <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
                <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-6">{t("account.profileInfo")}</h3>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.fullName")}</label>
                      <Input
                        value={form.fullName}
                        onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.phoneNumber")}</label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="+250 xxx xxx xxx"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.emailAddress")}</label>
                    <Input value={user.email ?? ""} disabled className="bg-gray-50" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.address")}</label>
                    <Input
                      value={form.address}
                      onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                      placeholder="Street address"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.city")}</label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                        placeholder="Kigali"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t("account.country")}</label>
                      <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={saveProfile}
                      disabled={saving || loading}
                      className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90"
                    >
                      {saving ? t("account.saving") : t("account.saveProfile")}
                    </Button>
                    <Button variant="outline" className="rounded-full" onClick={refreshAccount} disabled={loading || refreshing}>
                      {refreshing ? t("account.refreshing") : t("account.refresh")}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-iwanyu-border p-8">
                <h3 className="text-2xl font-semibold text-iwanyu-foreground mb-6">{t("account.stats")}</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-6 bg-iwanyu-primary/5 rounded-xl">
                    <div className="text-3xl font-bold text-iwanyu-primary">{orderCount ?? "—"}</div>
                    <div className="text-sm text-gray-600 mt-1">{t("account.totalOrders")}</div>
                  </div>
                  <div className="text-center p-6 bg-green-50 rounded-xl">
                    <div className="text-3xl font-bold text-green-600">{wishlistCount ?? "—"}</div>
                    <div className="text-sm text-gray-600 mt-1">{t("account.wishlistItems")}</div>
                  </div>
                  <div className="text-center p-6 bg-blue-50 rounded-xl">
                    <div className="text-3xl font-bold text-blue-600">{addressCount}</div>
                    <div className="text-sm text-gray-600 mt-1">{t("account.savedAddresses")}</div>
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

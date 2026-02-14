import { ArrowRight, BadgeCheck, CheckCircle2, Boxes, ClipboardList, CreditCard, ShieldAlert, Users, X, Tag, Trash2, Eye, TrendingUp, DollarSign, ShoppingCart, Package, Star, AlertCircle, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import { getAllCategoryOptions, isRealCategoryName, normalizeCategoryName } from "@/lib/categories";

const nav = [
  { labelKey: "admin.overview", icon: ClipboardList, href: "/admin", active: true },
  { labelKey: "admin.vendors", icon: Users, href: "/admin/vendors" },
  { labelKey: "admin.products", icon: Boxes, href: "/admin/products" },
  { labelKey: "admin.discounts", icon: Percent, href: "/admin/discounts" },
  { labelKey: "admin.applications", icon: BadgeCheck, href: "/admin/applications" },
];

type VendorApplication = {
  id: string;
  owner_user_id: string;
  store_name: string;
  location: string | null;
  status: "pending" | "approved" | "rejected";
  vendor_id: string | null;
  created_at: string;
};

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { products, vendors, refresh } = useMarketplace();

  // All hooks must be called before any conditional returns
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [heroImageInput, setHeroImageInput] = useState("");
  const [heroImageLoading, setHeroImageLoading] = useState(false);
  const [heroImageSaving, setHeroImageSaving] = useState(false);
  const categoryOptions = useMemo(() => getAllCategoryOptions(), []);
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});
  const getSoldCount = (product: unknown) => Number((product as { soldCount?: number } | null)?.soldCount ?? 0);
  
  const productToDelete = useMemo(
    () => (deleteProductId ? products.find((p) => p.id === deleteProductId) : undefined),
    [deleteProductId, products]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      setLoadingApps(true);
      const { data, error } = await supabase
        .from("vendor_applications")
        .select("id, owner_user_id, store_name, location, status, vendor_id, created_at")
        .eq("status", "pending")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (error) {
        setApplications([]);
      } else {
        setApplications((data ?? []) as VendorApplication[]);
      }
      setLoadingApps(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function loadHeroSetting() {
      if (!supabase) return;
      setHeroImageLoading(true);
      const { data } = await supabase
        .from("site_settings")
        .select("value_text")
        .eq("key", "hero_image_url")
        .maybeSingle();

      if (!cancelled) {
        setHeroImageInput(data?.value_text ?? "");
        setHeroImageLoading(false);
      }
    }

    void loadHeroSetting();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">{t("admin.signInRequired")}</h2>
          <p className="text-gray-500 mb-6">{t("admin.authRequired")}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/login">
              <Button className="rounded-full bg-black text-white hover:bg-gray-800">{t("auth.login")}</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-full">{t("admin.home")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-between p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-gray-500 mb-6">{t("admin.privilegesRequired")}</p>
          <div className="flex gap-3 justify-center">
            <Link to="/account">
              <Button className="rounded-full bg-black text-white hover:bg-gray-800">{t("admin.account")}</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-full">{t("admin.home")}</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function updateProductCategory(productId: string, category: string) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const next = category.trim();
    if (!next) throw new Error(t("admin.missingCategory"));
    const { error } = await supabase.from("products").update({ category: next }).eq("id", productId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function approveVendor(vendorId: string) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase
      .from("vendors")
      .update({ status: "approved" })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function rejectVendor(vendorId: string) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase
      .from("vendors")
      .update({ status: "rejected" })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function approveApplication(app: VendorApplication) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const vendorId = createId("v");
    const { error: vendorErr } = await supabase.from("vendors").insert({
      id: vendorId,
      name: app.store_name,
      location: app.location,
      verified: false,
      owner_user_id: app.owner_user_id,
      status: "approved",
    });
    if (vendorErr) throw new Error(vendorErr.message);

    const { error: profileErr } = await supabase
      .from("profiles")
      .update({ role: "seller", updated_at: new Date().toISOString() })
      .eq("id", app.owner_user_id);
    if (profileErr) throw new Error(profileErr.message);

    const { error: appErr } = await supabase
      .from("vendor_applications")
      .update({ status: "approved", vendor_id: vendorId, updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (appErr) throw new Error(appErr.message);

    setApplications((prev) => prev.filter((x) => x.id !== app.id));
    await refresh();
  }

  async function rejectApplication(app: VendorApplication) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase
      .from("vendor_applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) throw new Error(error.message);

    setApplications((prev) => prev.filter((x) => x.id !== app.id));
  }

  async function toggleVendorRevoke(vendorId: string, currentRevoked: boolean) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase
      .from("vendors")
      .update({ revoked: !currentRevoked })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function deleteProductWithReason() {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    if (!user) throw new Error(t("admin.notSignedIn"));
    if (!productToDelete) throw new Error(t("admin.missingProduct"));

    const vendorId = productToDelete.vendorId;
    const reason = deleteReason.trim();
    if (reason.length < 5) throw new Error(t("admin.reasonMin"));

    const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? t("admin.vendor");
    const title = `Product removed: ${productToDelete.title}`;
    const message = `Your product was removed by admin (${vendorName}). Reason: ${reason}`;

    const { error: notifyErr } = await supabase.from("vendor_notifications").insert({
      vendor_id: vendorId,
      product_id: productToDelete.id,
      type: "product_removed",
      title,
      message,
      created_by: user.id,
    });
    if (notifyErr) throw new Error(notifyErr.message);

    const { error: deleteErr } = await supabase
      .from("products")
      .update({ deleted_at: new Date().toISOString(), in_stock: false })
      .eq("id", productToDelete.id);
    if (deleteErr) throw new Error(deleteErr.message);

    setDeleteOpen(false);
    setDeleteProductId(null);
    setDeleteReason("");
    await refresh();
  }

  async function saveHeroImageSetting() {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    if (!user) throw new Error(t("admin.notSignedIn"));

    const next = heroImageInput.trim();
    if (!next) throw new Error(t("admin.heroImageRequired"));

    setHeroImageSaving(true);
    try {
      const { error } = await supabase
        .from("site_settings")
        .upsert(
          {
            key: "hero_image_url",
            value_text: next,
            updated_by: user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "key" }
        );
      if (error) throw new Error(error.message);
      toast({ title: t("admin.saved"), description: t("admin.heroImageSaved") });
    } finally {
      setHeroImageSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200/70">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-14 w-auto" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-semibold text-sm">{t("admin.panel")}</span>
              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">← {t("admin.storefront")}</Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">
                {user.name?.charAt(0) || "A"}
              </div>
              <span className="text-gray-700 text-sm hidden sm:block">{user.name || t("admin.admin")}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <nav className="flex flex-col gap-1 rounded-2xl border border-gray-200 bg-white p-2">
              {nav.map((item) => (
                <Link
                  key={item.labelKey}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    item.active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={18} />
                  {t(item.labelKey)}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-10">
            {/* Stats Grid */}
            <div>
              <h1 className="text-2xl font-bold mb-6">{t("admin.dashboardOverview")}</h1>
              
              {/* Primary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Users size={18} className="text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{t("admin.vendors")}</span>
                  </div>
                  <p className="text-3xl font-bold">{vendors.length}</p>
                  <p className="text-xs text-green-600 mt-1">+{vendors.filter(v => v.status === 'approved').length} {t("admin.approved")}</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Boxes size={18} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{t("admin.products")}</span>
                  </div>
                  <p className="text-3xl font-bold">{products.length}</p>
                  <p className="text-xs text-gray-500 mt-1">{products.filter(p => p.inStock).length} {t("admin.inStock")}</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <DollarSign size={18} className="text-green-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{t("admin.revenue")}</span>
                  </div>
                  <p className="text-3xl font-bold">{formatMoney(products.reduce((sum, p) => sum + (p.price * getSoldCount(p)), 0))}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={10} /> {t("admin.totalSales")}</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <ShoppingCart size={18} className="text-amber-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{t("admin.totalSold")}</span>
                  </div>
                  <p className="text-3xl font-bold">{products.reduce((sum, p) => sum + getSoldCount(p), 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">{t("admin.unitsSold")}</p>
                </div>
              </div>
              
              {/* Secondary Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-4 border border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-600 font-medium">{t("admin.pendingApps")}</span>
                    {applications.length > 0 && <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>}
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-1">{loadingApps ? t("admin.loadingShort") : applications.length}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">{t("admin.outOfStock")}</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{products.filter(p => !p.inStock).length}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">{t("admin.avgRating")}</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    {(products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length || 0).toFixed(1)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">{t("admin.avgPrice")}</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(products.reduce((sum, p) => sum + p.price, 0) / products.length || 0)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">{t("admin.categories")}</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(products.map(p => normalizeCategoryName(p.category))).size}</p>
                </div>
              </div>

              <div className="mt-6 bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">{t("admin.heroImageTitle")}</h3>
                <p className="mt-1 text-xs text-gray-500">{t("admin.heroImageDesc")}</p>
                <div className="mt-3 flex flex-col gap-3 md:flex-row">
                  <Input
                    value={heroImageInput}
                    onChange={(e) => setHeroImageInput(e.target.value)}
                    placeholder={t("admin.imageUrlPlaceholder")}
                    disabled={heroImageLoading || heroImageSaving}
                  />
                  <Button
                    className="rounded-full bg-gray-900 text-white hover:bg-gray-800 md:px-6"
                    disabled={heroImageLoading || heroImageSaving}
                    onClick={async () => {
                      try {
                        await saveHeroImageSetting();
                      } catch (e) {
                        toast({
                          title: t("admin.failed"),
                          description: e instanceof Error ? e.message : t("admin.unknownError"),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    {heroImageSaving ? t("admin.saving") : t("admin.saveImage")}
                  </Button>
                </div>
                {heroImageInput ? (
                  <div className="mt-3 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                    <img src={heroImageInput} alt={t("admin.heroPreview")} className="h-36 w-full object-cover" />
                  </div>
                ) : null}
              </div>
            </div>

            {/* Applications Section */}
            <div id="applications">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t("admin.vendorApplications")}</h3>
                {applications.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                    {applications.length} {t("admin.pending")}
                  </span>
                )}
              </div>
              
              {loadingApps ? (
                <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                  <p className="text-gray-500 text-sm">{t("admin.loading")}</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center">
                  <CheckCircle2 size={20} className="mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">{t("admin.noPendingApplications")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applications.map((app) => (
                    <div key={app.id} className="bg-white rounded-xl p-5 border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold">{app.store_name}</h4>
                          <p className="text-xs text-gray-500">{app.location || t("admin.noLocation")}</p>
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t("admin.review")}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-full bg-green-600 hover:bg-green-700 text-white flex-1"
                          onClick={async () => {
                            try {
                              await approveApplication(app);
                              toast({ title: t("admin.approved"), description: `${app.store_name} ${t("admin.canNowSell")}` });
                            } catch (e) {
                              toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                            }
                          }}
                        >
                          <CheckCircle2 size={14} className="mr-1" /> {t("admin.approve")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full flex-1 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          onClick={async () => {
                            try {
                              await rejectApplication(app);
                              toast({ title: t("admin.rejected") });
                            } catch (e) {
                              toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                            }
                          }}
                        >
                          <X size={14} className="mr-1" /> {t("admin.reject")}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Top Products */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t("admin.topSellingProducts")}</h3>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">{t("admin.product")}</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">{t("admin.vendor")}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">{t("admin.price")}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">{t("admin.soldTitle")}</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">{t("admin.revenue")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...products].sort((a, b) => getSoldCount(b) - getSoldCount(a)).slice(0, 10).map((product) => {
                      const vendor = vendors.find(v => v.id === product.vendorId);
                      return (
                        <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {product.image ? (
                                <img src={product.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                              ) : (
                                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                                  <Package size={14} className="text-gray-400" />
                                </div>
                              )}
                              <span className="font-medium line-clamp-1">{product.title}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{vendor?.name || t("admin.none")}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatMoney(product.price)}</td>
                          <td className="px-4 py-3 text-right">{getSoldCount(product)}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{formatMoney(product.price * getSoldCount(product))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Vendors Section */}
            <div id="vendors">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">{t("admin.vendors")}</h3>
                <span className="text-xs text-gray-500">{vendors.length} {t("admin.total")}</span>
              </div>
              
              {vendors.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                  <Users size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">{t("admin.noVendorsFound")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map((vendor) => {
                    const vendorProducts = products.filter(p => p.vendorId === vendor.id);
                    const vendorRevenue = vendorProducts.reduce((sum, p) => sum + (p.price * getSoldCount(p)), 0);
                    const vendorSales = vendorProducts.reduce((sum, p) => sum + getSoldCount(p), 0);
                    
                    return (
                      <div key={vendor.id} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{vendor.name}</h4>
                              {vendor.verified && <BadgeCheck size={14} className="text-blue-600" />}
                            </div>
                            <p className="text-xs text-gray-500">{vendor.location || t("admin.noLocation")}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {vendor.status === "approved" ? (
                              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t("admin.approved")}</span>
                            ) : vendor.status === "rejected" ? (
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">{t("admin.rejected")}</span>
                            ) : (
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">{t("admin.pending")}</span>
                            )}
                            {vendor.revoked && (
                              <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{t("admin.revoked")}</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Vendor Stats */}
                        <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                          <div className="text-center">
                            <p className="text-lg font-bold">{vendorProducts.length}</p>
                            <p className="text-[10px] text-gray-500">{t("admin.products")}</p>
                          </div>
                          <div className="text-center border-x border-gray-200">
                            <p className="text-lg font-bold">{vendorSales}</p>
                            <p className="text-[10px] text-gray-500">{t("admin.sales")}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{formatMoney(vendorRevenue)}</p>
                            <p className="text-[10px] text-gray-500">{t("admin.revenue")}</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          {(!vendor.status || vendor.status !== "approved") && (
                            <Button
                              size="sm"
                              className="rounded-full bg-black text-white hover:bg-gray-800 flex-1"
                              onClick={async () => {
                                try {
                                  await approveVendor(vendor.id);
                                  toast({ title: t("admin.approved"), description: `${vendor.name} ${t("admin.isNowApproved")}` });
                                } catch (e) {
                                  toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                                }
                              }}
                            >
                              {t("admin.approve")}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={vendor.revoked ? "outline" : "destructive"}
                            className="rounded-full flex-1"
                            onClick={async () => {
                              try {
                                await toggleVendorRevoke(vendor.id, vendor.revoked ?? false);
                                toast({
                                  title: vendor.revoked ? t("admin.restored") : t("admin.revoked"),
                                  description: vendor.revoked ? t("admin.vendorCanSellAgain") : t("admin.vendorCannotSell"),
                                });
                              } catch (e) {
                                toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                              }
                            }}
                          >
                            {vendor.revoked ? t("admin.restore") : t("admin.revoke")}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Products Section */}
            <div id="products">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{t("admin.productManagement")}</h3>
                <span className="text-sm text-gray-500">{products.length} {t("admin.total")}</span>
              </div>
              
              {products.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                  <Boxes size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">{t("admin.noProductsFound")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {products.map((product) => {
                    const vendor = vendors.find((v) => v.id === product.vendorId);
                    const current = normalizeCategoryName(product.category);
                    const selected = categoryEdits[product.id] ?? (isRealCategoryName(current) ? current : "");
                    
                    return (
                      <div key={product.id} className="bg-white rounded-xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all overflow-hidden group">
                        {/* Product Image */}
                        <div className="relative aspect-square bg-gray-50">
                          {product.image ? (
                            <img 
                              src={product.image} 
                              alt={product.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Boxes size={24} className="text-gray-300" />
                            </div>
                          )}
                          {/* Stock Badge */}
                          {!product.inStock && (
                            <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {t("admin.outOfStock")}
                            </span>
                          )}
                          {/* Quick Actions */}
                          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link to={`/product/${product.id}`}>
                              <button className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-gray-50">
                                <Eye size={12} />
                              </button>
                            </Link>
                            <button 
                              className="w-7 h-7 bg-white rounded-full shadow flex items-center justify-center hover:bg-red-50"
                              onClick={() => {
                                setDeleteProductId(product.id);
                                setDeleteReason("");
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 size={12} className="text-red-500" />
                            </button>
                          </div>
                        </div>
                        
                        {/* Product Info */}
                        <div className="p-3">
                          <h4 className="font-medium text-sm line-clamp-1 mb-1">{product.title}</h4>
                          <p className="text-xs text-gray-500 mb-2">{vendor?.name || t("admin.unknown")}</p>
                          
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">{formatMoney(product.price)}</span>
                            <span className="text-[10px] text-gray-400">{getSoldCount(product)} {t("admin.sold")}</span>
                          </div>
                          
                          {/* Category Select */}
                          <Select
                            value={selected}
                            onValueChange={async (v) => {
                              setCategoryEdits((prev) => ({ ...prev, [product.id]: v }));
                              try {
                                await updateProductCategory(product.id, v);
                                toast({ title: t("admin.updated"), description: t("admin.categorySaved") });
                              } catch (e) {
                                toast({
                                  title: t("admin.failed"),
                                  description: e instanceof Error ? e.message : t("admin.unknownError"),
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue placeholder={t("admin.category")} />
                            </SelectTrigger>
                            <SelectContent>
                              {categoryOptions.map((c) => (
                                <SelectItem key={c} value={c} className="text-xs">
                                  {c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          
                          {/* Rating */}
                          <div className="mt-2 flex items-center gap-1 text-[10px] text-gray-400">
                            <span>★ {product.rating?.toFixed(1) || t("admin.notAvailable")}</span>
                            <span>•</span>
                            <span className={product.inStock ? "text-green-600" : "text-red-500"}>
                              {product.inStock ? t("admin.inStock") : t("admin.outOfStock")}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* Delete Product Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteProduct")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteProductWithReasonDesc")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t("admin.reasonForRemoval")}</label>
            <Textarea 
              value={deleteReason} 
              onChange={(e) => setDeleteReason(e.target.value)} 
              placeholder={t("admin.explainPolicy")}
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">{t("admin.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await deleteProductWithReason();
                  toast({ title: t("admin.deleted"), description: t("admin.productRemovedAndNotified") });
                } catch (err) {
                  toast({
                    title: t("admin.failed"),
                    description: err instanceof Error ? err.message : t("admin.unknownError"),
                    variant: "destructive",
                  });
                }
              }}
            >
              {t("admin.deleteProduct")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

import { BadgeCheck, Users, ClipboardList, Boxes, ShieldAlert, Search, Trash2, Percent } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { formatMoney } from "@/lib/money";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin/vendors", active: true },
  { label: "Products", icon: Boxes, href: "/admin/products" },
  { label: "Discounts", icon: Percent, href: "/admin/discounts" },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications" },
];

export default function AdminVendorsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { products, vendors, refresh } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteVendorId, setDeleteVendorId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const getSoldCount = (product: unknown) => Number((product as { soldCount?: number } | null)?.soldCount ?? 0);

  const vendorToDelete = useMemo(
    () => (deleteVendorId ? vendors.find((v) => v.id === deleteVendorId) : undefined),
    [deleteVendorId, vendors]
  );

  async function approveVendor(vendorId: string) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase.from("vendors").update({ status: "approved" }).eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function toggleVendorRevoke(vendorId: string, currentRevoked: boolean) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase.from("vendors").update({ revoked: !currentRevoked }).eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function deleteVendorWithReason() {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    if (!user) throw new Error(t("admin.notSignedIn"));
    if (!vendorToDelete) throw new Error(t("admin.missingVendor"));

    const reason = deleteReason.trim();
    if (reason.length < 5) throw new Error(t("admin.reasonMin"));

    const now = new Date().toISOString();

    // Notify vendor
    await supabase.from("vendor_notifications").insert({
      vendor_id: vendorToDelete.id,
      type: "vendor_removed",
      title: `Vendor account removed: ${vendorToDelete.name}`,
      message: `Your vendor account was removed by admin. Reason: ${reason}`,
      created_by: user.id,
    });

    // Soft-delete vendor and revoke access
    const { error: vendorErr } = await supabase
      .from("vendors")
      .update({ deleted_at: now, revoked: true, verified: false, status: "deleted" })
      .eq("id", vendorToDelete.id);
    if (vendorErr) throw new Error(vendorErr.message);

    // Soft-delete all vendor products (keeps order history intact)
    const { error: productsErr } = await supabase
      .from("products")
      .update({ deleted_at: now, in_stock: false })
      .eq("vendor_id", vendorToDelete.id);
    if (productsErr) throw new Error(productsErr.message);

    // Optionally downgrade the owner's role so they no longer get seller UI.
    if (vendorToDelete.ownerUserId) {
      await supabase.from("profiles").update({ role: "buyer" }).eq("id", vendorToDelete.ownerUserId);
    }

    setDeleteOpen(false);
    setDeleteVendorId(null);
    setDeleteReason("");
    await refresh();
  }

  const filteredVendors = useMemo(() => {
    if (!searchQuery.trim()) return vendors;
    const q = searchQuery.toLowerCase();
    return vendors.filter(v => v.name.toLowerCase().includes(q) || v.location?.toLowerCase().includes(q));
  }, [vendors, searchQuery]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">{t("admin.signInRequired")}</h2>
          <p className="text-gray-500 mb-6">{t("admin.authRequired")}</p>
          <Link to="/login"><Button className="rounded-full">{t("auth.login")}</Button></Link>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">{t("admin.accessDenied")}</h2>
          <p className="text-gray-500 mb-6">{t("admin.privilegesRequired")}</p>
          <Link to="/"><Button variant="outline" className="rounded-full">{t("admin.home")}</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-14 w-auto" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">Admin</Link>
              <span className="text-gray-300">/</span>
              <span className="text-gray-900 font-semibold text-sm">{t("admin.vendors")}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">← {t("admin.storefront")}</Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-56 shrink-0">
            <nav className="dashboard-sidebar flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    item.active ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">{t("admin.vendors")}</h1>
                <p className="text-sm text-gray-500">{vendors.length} {t("admin.totalVendors")}</p>
              </div>
              <div className="relative w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder={t("admin.searchVendors")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.totalVendors")}</p>
                <p className="text-2xl font-bold">{vendors.length}</p>
              </div>
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.approved")}</p>
                <p className="text-2xl font-bold text-green-600">{vendors.filter(v => v.status === 'approved').length}</p>
              </div>
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.pending")}</p>
                <p className="text-2xl font-bold text-amber-600">{vendors.filter(v => !v.status || v.status === 'pending').length}</p>
              </div>
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.revoked")}</p>
                <p className="text-2xl font-bold text-red-600">{vendors.filter(v => v.revoked).length}</p>
              </div>
            </div>

            {/* Vendors Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredVendors.map((vendor) => {
                const vendorProducts = products.filter(p => p.vendorId === vendor.id);
                const vendorRevenue = vendorProducts.reduce((sum, p) => sum + (p.price * getSoldCount(p)), 0);
                const vendorSales = vendorProducts.reduce((sum, p) => sum + getSoldCount(p), 0);

                return (
                  <div key={vendor.id} className="dashboard-card p-5 transition-all hover:shadow-md">
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
                          <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full">APPROVED</span>
                        ) : vendor.status === "rejected" ? (
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full">REJECTED</span>
                        ) : (
                          <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-full">PENDING</span>
                        )}
                        {vendor.revoked && (
                          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">REVOKED</span>
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
                            toast({ title: vendor.revoked ? t("admin.restored") : t("admin.revoked"), description: vendor.revoked ? t("admin.vendorCanSellAgain") : t("admin.vendorCannotSell") });
                          } catch (e) {
                            toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                          }
                        }}
                      >
                        {vendor.revoked ? t("admin.restore") : t("admin.revoke")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="rounded-full"
                        onClick={() => {
                          setDeleteVendorId(vendor.id);
                          setDeleteReason("");
                          setDeleteOpen(true);
                        }}
                        title={t("admin.removeVendor")}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredVendors.length === 0 && (
              <div className="bg-white rounded-xl p-12 border border-dashed border-gray-200 text-center">
                <Users size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">{t("admin.noVendorsFound")}</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete Vendor Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteVendor")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteVendorDesc")}
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
                  await deleteVendorWithReason();
                  toast({ title: t("admin.deleted"), description: t("admin.vendorRemoved") });
                } catch (err) {
                  toast({
                    title: t("admin.failed"),
                    description: err instanceof Error ? err.message : t("admin.unknownError"),
                    variant: "destructive",
                  });
                }
              }}
            >
              {t("admin.deleteVendor")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

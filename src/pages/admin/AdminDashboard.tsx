import { ArrowRight, BadgeCheck, CheckCircle2, Boxes, ClipboardList, CreditCard, ShieldAlert, Users, X, Tag, Trash2, Eye, TrendingUp, DollarSign, ShoppingCart, Package, Star, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { formatMoney } from "@/lib/money";
import { getAllCategoryOptions, isRealCategoryName, normalizeCategoryName } from "@/lib/categories";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin", active: true },
  { label: "Vendors", icon: Users, href: "/admin/vendors" },
  { label: "Products", icon: Boxes, href: "/admin/products" },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications" },
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
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { products, vendors, refresh } = useMarketplace();

  // All hooks must be called before any conditional returns
  const [applications, setApplications] = useState<VendorApplication[]>([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const categoryOptions = useMemo(() => getAllCategoryOptions(), []);
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});
  
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
          <p className="text-gray-500 mb-6">Admin authentication needed</p>
          <div className="flex gap-3 justify-center">
            <Link to="/login">
              <Button className="rounded-full bg-black text-white hover:bg-gray-800">Login</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-full">Home</Button>
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
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">Admin privileges required</p>
          <div className="flex gap-3 justify-center">
            <Link to="/account">
              <Button className="rounded-full bg-black text-white hover:bg-gray-800">Account</Button>
            </Link>
            <Link to="/">
              <Button variant="outline" className="rounded-full">Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function updateProductCategory(productId: string, category: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const next = category.trim();
    if (!next) throw new Error("Missing category");
    const { error } = await supabase.from("products").update({ category: next }).eq("id", productId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function approveVendor(vendorId: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase
      .from("vendors")
      .update({ status: "approved" })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function rejectVendor(vendorId: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase
      .from("vendors")
      .update({ status: "rejected" })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function approveApplication(app: VendorApplication) {
    if (!supabase) throw new Error("Supabase is not configured");
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
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase
      .from("vendor_applications")
      .update({ status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", app.id);
    if (error) throw new Error(error.message);

    setApplications((prev) => prev.filter((x) => x.id !== app.id));
  }

  async function toggleVendorRevoke(vendorId: string, currentRevoked: boolean) {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase
      .from("vendors")
      .update({ revoked: !currentRevoked })
      .eq("id", vendorId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function deleteProductWithReason() {
    if (!supabase) throw new Error("Supabase is not configured");
    if (!user) throw new Error("Not signed in");
    if (!productToDelete) throw new Error("Missing product");

    const vendorId = productToDelete.vendorId;
    const reason = deleteReason.trim();
    if (reason.length < 5) throw new Error("Please provide a short reason (min 5 chars)");

    const vendorName = vendors.find((v) => v.id === vendorId)?.name ?? "Vendor";
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

    const { error: deleteErr } = await supabase.from("products").delete().eq("id", productToDelete.id);
    if (deleteErr) throw new Error(deleteErr.message);

    setDeleteOpen(false);
    setDeleteProductId(null);
    setDeleteReason("");
    await refresh();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-20 w-auto" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <span className="text-gray-900 font-semibold text-sm">Admin Panel</span>
              <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">Pro</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-500 hover:text-gray-900 text-sm font-medium transition-colors">← Store front</Link>
            <div className="h-5 w-px bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow">
                {user.name?.charAt(0) || "A"}
              </div>
              <span className="text-gray-700 text-sm hidden sm:block">{user.name || "Admin"}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="w-full lg:w-48 shrink-0">
            <nav className="flex flex-col gap-1">
              {nav.map((item) => (
                <Link
                  key={item.label}
                  to={item.href}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    item.active ? "bg-black text-white" : "text-gray-500 hover:bg-gray-100 hover:text-black"
                  }`}
                >
                  <item.icon size={18} />
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-10">
            {/* Stats Grid */}
            <div>
              <h1 className="text-2xl font-bold mb-6">Dashboard Overview</h1>
              
              {/* Primary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
                      <Users size={18} className="text-purple-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Vendors</span>
                  </div>
                  <p className="text-3xl font-bold">{vendors.length}</p>
                  <p className="text-xs text-green-600 mt-1">+{vendors.filter(v => v.status === 'approved').length} approved</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                      <Boxes size={18} className="text-blue-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Products</span>
                  </div>
                  <p className="text-3xl font-bold">{products.length}</p>
                  <p className="text-xs text-gray-500 mt-1">{products.filter(p => p.inStock).length} in stock</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                      <DollarSign size={18} className="text-green-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Revenue</span>
                  </div>
                  <p className="text-3xl font-bold">{formatMoney(products.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0))}</p>
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><TrendingUp size={10} /> Total sales</p>
                </div>
                
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                      <ShoppingCart size={18} className="text-amber-600" />
                    </div>
                    <span className="text-xs text-gray-500 font-medium">Total Sold</span>
                  </div>
                  <p className="text-3xl font-bold">{products.reduce((sum, p) => sum + (p.soldCount || 0), 0).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 mt-1">Units sold</p>
                </div>
              </div>
              
              {/* Secondary Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-gradient-to-br from-red-50 to-white rounded-xl p-4 border border-red-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-red-600 font-medium">Pending Apps</span>
                    {applications.length > 0 && <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>}
                  </div>
                  <p className="text-2xl font-bold text-red-600 mt-1">{loadingApps ? "..." : applications.length}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Out of Stock</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{products.filter(p => !p.inStock).length}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Avg Rating</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-1">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    {(products.reduce((sum, p) => sum + (p.rating || 0), 0) / products.length || 0).toFixed(1)}
                  </p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Avg Price</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{formatMoney(products.reduce((sum, p) => sum + p.price, 0) / products.length || 0)}</p>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <span className="text-xs text-gray-500 font-medium">Categories</span>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{new Set(products.map(p => normalizeCategoryName(p.category))).size}</p>
                </div>
              </div>
            </div>

            {/* Applications Section */}
            <div id="applications">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Vendor Applications</h3>
                {applications.length > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                    {applications.length} Pending
                  </span>
                )}
              </div>
              
              {loadingApps ? (
                <div className="bg-white rounded-xl p-6 border border-gray-100 text-center">
                  <p className="text-gray-500 text-sm">Loading...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="bg-white rounded-xl p-6 border border-dashed border-gray-200 text-center">
                  <CheckCircle2 size={20} className="mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-gray-500">All caught up! No pending applications.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {applications.map((app) => (
                    <div key={app.id} className="bg-white rounded-xl p-5 border border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold">{app.store_name}</h4>
                          <p className="text-xs text-gray-500">{app.location || "No location"}</p>
                        </div>
                        <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full">REVIEW</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="rounded-full bg-green-600 hover:bg-green-700 text-white flex-1"
                          onClick={async () => {
                            try {
                              await approveApplication(app);
                              toast({ title: "Approved", description: `${app.store_name} can now sell` });
                            } catch (e) {
                              toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
                            }
                          }}
                        >
                          <CheckCircle2 size={14} className="mr-1" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full flex-1 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                          onClick={async () => {
                            try {
                              await rejectApplication(app);
                              toast({ title: "Rejected" });
                            } catch (e) {
                              toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
                            }
                          }}
                        >
                          <X size={14} className="mr-1" /> Reject
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
                <h3 className="text-lg font-bold">Top Selling Products</h3>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Product</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Vendor</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Price</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Sold</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...products].sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0)).slice(0, 10).map((product) => {
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
                          <td className="px-4 py-3 text-gray-500">{vendor?.name || "—"}</td>
                          <td className="px-4 py-3 text-right font-medium">{formatMoney(product.price)}</td>
                          <td className="px-4 py-3 text-right">{product.soldCount || 0}</td>
                          <td className="px-4 py-3 text-right font-medium text-green-600">{formatMoney(product.price * (product.soldCount || 0))}</td>
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
                <h3 className="text-lg font-bold">Vendors</h3>
                <span className="text-xs text-gray-500">{vendors.length} total</span>
              </div>
              
              {vendors.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                  <Users size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No vendors yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendors.map((vendor) => {
                    const vendorProducts = products.filter(p => p.vendorId === vendor.id);
                    const vendorRevenue = vendorProducts.reduce((sum, p) => sum + (p.price * (p.soldCount || 0)), 0);
                    const vendorSales = vendorProducts.reduce((sum, p) => sum + (p.soldCount || 0), 0);
                    
                    return (
                      <div key={vendor.id} className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-md transition-all">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold">{vendor.name}</h4>
                              {vendor.verified && <BadgeCheck size={14} className="text-blue-600" />}
                            </div>
                            <p className="text-xs text-gray-500">{vendor.location || "No location"}</p>
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
                            <p className="text-[10px] text-gray-500">Products</p>
                          </div>
                          <div className="text-center border-x border-gray-200">
                            <p className="text-lg font-bold">{vendorSales}</p>
                            <p className="text-[10px] text-gray-500">Sales</p>
                          </div>
                          <div className="text-center">
                            <p className="text-lg font-bold text-green-600">{formatMoney(vendorRevenue)}</p>
                            <p className="text-[10px] text-gray-500">Revenue</p>
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
                                  toast({ title: "Approved", description: `${vendor.name} is now approved` });
                                } catch (e) {
                                  toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
                                }
                              }}
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant={vendor.revoked ? "outline" : "destructive"}
                            className="rounded-full flex-1"
                            onClick={async () => {
                              try {
                                await toggleVendorRevoke(vendor.id, vendor.revoked ?? false);
                                toast({ title: vendor.revoked ? "Restored" : "Revoked", description: vendor.revoked ? "Vendor can sell again" : "Vendor cannot sell" });
                              } catch (e) {
                                toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
                              }
                            }}
                          >
                            {vendor.revoked ? "Restore" : "Revoke"}
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
                <h3 className="text-xl font-bold">Product Management</h3>
                <span className="text-sm text-gray-500">{products.length} total</span>
              </div>
              
              {products.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                  <Boxes size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No products yet</p>
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
                              OUT OF STOCK
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
                          <p className="text-xs text-gray-500 mb-2">{vendor?.name || "Unknown"}</p>
                          
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-sm">{formatMoney(product.price)}</span>
                            <span className="text-[10px] text-gray-400">{product.soldCount || 0} sold</span>
                          </div>
                          
                          {/* Category Select */}
                          <Select
                            value={selected}
                            onValueChange={async (v) => {
                              setCategoryEdits((prev) => ({ ...prev, [product.id]: v }));
                              try {
                                await updateProductCategory(product.id, v);
                                toast({ title: "Updated", description: "Category saved" });
                              } catch (e) {
                                toast({
                                  title: "Failed",
                                  description: e instanceof Error ? e.message : "Unknown error",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <SelectTrigger className="h-7 text-[11px]">
                              <SelectValue placeholder="Category" />
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
                            <span>★ {product.rating?.toFixed(1) || "N/A"}</span>
                            <span>•</span>
                            <span className={product.inStock ? "text-green-600" : "text-red-500"}>
                              {product.inStock ? "In Stock" : "Out of Stock"}
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
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product and notify the vendor with your reason.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium">Reason for removal</label>
            <Textarea 
              value={deleteReason} 
              onChange={(e) => setDeleteReason(e.target.value)} 
              placeholder="Explain policy violation..." 
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-red-600 hover:bg-red-700"
              onClick={async (e) => {
                e.preventDefault();
                try {
                  await deleteProductWithReason();
                  toast({ title: "Deleted", description: "Product removed and vendor notified" });
                } catch (err) {
                  toast({
                    title: "Failed",
                    description: err instanceof Error ? err.message : "Unknown error",
                    variant: "destructive",
                  });
                }
              }}
            >
              Delete Product
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

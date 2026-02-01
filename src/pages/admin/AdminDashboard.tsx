import { ArrowRight, BadgeCheck, CheckCircle2, Boxes, ClipboardList, CreditCard, ShieldAlert, Users, X, Tag, Trash2, Eye } from "lucide-react";
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
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin#vendors" },
  { label: "Products", icon: Boxes, href: "/admin#products" },
  { label: "Applications", icon: BadgeCheck, href: "/admin#applications" },
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
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg tracking-tight">Admin Control</span>
            <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Admin</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" className="text-sm font-medium hover:bg-transparent hover:text-black">Storefront</Button>
            </Link>
            <div className="h-8 w-8 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold">
              {user.name?.charAt(0) || "A"}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-12">
          {/* Interactive Sidebar */}
          <aside className="w-full lg:w-48 shrink-0">
            <nav className="flex flex-col gap-1">
              {nav.map((item, idx) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-500 hover:text-black hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-300 hover:scale-105 hover:shadow-sm animate-in slide-in-from-left-4 fade-in"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <item.icon size={18} className="group-hover:scale-110 group-hover:rotate-3 transition-transform" />
                  <span className="group-hover:translate-x-1 transition-transform">{item.label}</span>
                </a>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="flex-1 space-y-12">
            {/* Stats */}
            <div>
              <h1 className="text-3xl font-bold mb-8 animate-in fade-in slide-in-from-top-4 duration-700">Overview</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="group bg-gradient-to-br from-purple-50 to-white rounded-xl p-6 border border-purple-100 hover:border-purple-300 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-left-4 duration-500">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-purple-600 text-xs font-bold uppercase tracking-wider">Total Vendors</p>
                    <Users size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-400 bg-clip-text text-transparent">{vendors.length}</h2>
                  <p className="text-xs text-purple-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Active on platform</p>
                </div>
                <div className="group bg-gradient-to-br from-blue-50 to-white rounded-xl p-6 border border-blue-100 hover:border-blue-300 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-blue-600 text-xs font-bold uppercase tracking-wider">Total Products</p>
                    <Boxes size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">{products.length}</h2>
                  <p className="text-xs text-blue-600 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Listed items</p>
                </div>
                <div className="group bg-gradient-to-br from-red-50 to-white rounded-xl p-6 border border-red-100 hover:border-red-300 transition-all duration-300 hover:shadow-lg hover:scale-105 cursor-pointer animate-in fade-in slide-in-from-right-4 duration-500 delay-200">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-red-600 text-xs font-bold uppercase tracking-wider">Pending Applications</p>
                    <BadgeCheck size={20} className="text-red-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h2 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-red-600 to-red-400 bg-clip-text text-transparent">{loadingApps ? "..." : applications.length}</h2>
                  {applications.length > 0 && (
                    <p className="text-xs text-red-600 mt-2 flex items-center gap-1 animate-pulse">
                      <span className="h-2 w-2 bg-red-600 rounded-full"></span>
                      Needs review
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Applications Section */}
            <div id="applications">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Vendor Applications</h3>
                {applications.length > 0 && (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-3 py-1 rounded-full">
                    {applications.length} Pending
                  </span>
                )}
              </div>
              
              {loadingApps ? (
                <div className="bg-white rounded-xl p-8 border border-gray-100 text-center">
                  <p className="text-gray-500">Loading applications...</p>
                </div>
              ) : applications.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                  <BadgeCheck size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No pending applications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {applications.map((app, idx) => (
                    <div 
                      key={app.id} 
                      className="group bg-white rounded-xl p-6 border border-gray-100 hover:border-purple-200 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom-4 fade-in"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h4 className="font-bold text-lg mb-1">{app.store_name}</h4>
                          <p className="text-xs text-gray-500">{app.location || "No location"}</p>
                          <p className="text-xs text-gray-400 mt-1">User ID: {app.owner_user_id.slice(0, 8)}...</p>
                        </div>
                        <span className="bg-yellow-50 text-yellow-700 text-xs font-bold px-3 py-1 rounded-full">
                          Pending Review
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          className="rounded-full bg-gradient-to-r from-green-600 to-green-500 text-white hover:from-green-700 hover:to-green-600 flex-1 hover:scale-105 hover:shadow-lg transition-all duration-300"
                          onClick={async () => {
                            try {
                              await approveApplication(app);
                              toast({ title: "Approved", description: `${app.store_name} can now sell on the marketplace` });
                            } catch (e) {
                              toast({
                                title: "Failed",
                                description: e instanceof Error ? e.message : "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <CheckCircle2 size={14} className="mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          className="rounded-full flex-1 hover:bg-red-50 hover:border-red-300 hover:text-red-700 hover:scale-105 transition-all duration-300"
                          onClick={async () => {
                            try {
                              await rejectApplication(app);
                              toast({ title: "Rejected", description: "Application rejected" });
                            } catch (e) {
                              toast({
                                title: "Failed",
                                description: e instanceof Error ? e.message : "Unknown error",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          <X size={14} className="mr-1" />
                          Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vendors Section */}
            <div id="vendors">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">All Vendors</h3>
                <span className="text-xs text-gray-500">{vendors.length} total</span>
              </div>
              
              {vendors.length === 0 ? (
                <div className="bg-white rounded-xl p-8 border border-dashed border-gray-200 text-center">
                  <Users size={24} className="mx-auto text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">No vendors yet</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {vendors.map((vendor) => (
                    <div key={vendor.id} className="bg-white rounded-xl p-6 border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold">{vendor.name}</h4>
                            {vendor.verified && (
                              <BadgeCheck size={14} className="text-blue-600" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{vendor.location || "No location"}</p>
                          <div className="flex gap-2 mt-2">
                            {vendor.status === "approved" ? (
                              <span className="bg-green-50 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Approved
                              </span>
                            ) : vendor.status === "rejected" ? (
                              <span className="bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Rejected
                              </span>
                            ) : (
                              <span className="bg-gray-100 text-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Pending
                              </span>
                            )}
                            {vendor.revoked && (
                              <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                Revoked
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {!vendor.status || vendor.status !== "approved" ? (
                            <Button
                              size="sm"
                              className="rounded-full bg-black text-white hover:bg-gray-800"
                              onClick={async () => {
                                try {
                                  await approveVendor(vendor.id);
                                  toast({ title: "Approved", description: `${vendor.name} is now approved` });
                                } catch (e) {
                                  toast({
                                    title: "Failed",
                                    description: e instanceof Error ? e.message : "Unknown error",
                                    variant: "destructive",
                                  });
                                }
                              }}
                            >
                              Approve
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant={vendor.revoked ? "outline" : "destructive"}
                            className="rounded-full"
                            onClick={async () => {
                              try {
                                await toggleVendorRevoke(vendor.id, vendor.revoked ?? false);
                                toast({
                                  title: vendor.revoked ? "Restored" : "Revoked",
                                  description: vendor.revoked ? "Vendor can sell again" : "Vendor cannot sell",
                                });
                              } catch (e) {
                                toast({
                                  title: "Failed",
                                  description: e instanceof Error ? e.message : "Unknown error",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            {vendor.revoked ? "Restore" : "Revoke"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
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

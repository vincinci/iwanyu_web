import { BadgeCheck, Users, ClipboardList, Boxes, ShieldAlert, Search, Trash2, Eye, Tag, Package, Percent, Filter } from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
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
import { formatMoney } from "@/lib/money";
import { getAllCategoryOptions, isRealCategoryName, normalizeCategoryName } from "@/lib/categories";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin/vendors" },
  { label: "Products", icon: Boxes, href: "/admin/products", active: true },
  { label: "Discounts", icon: Percent, href: "/admin/discounts" },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications" },
];

export default function AdminProductsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const supabase = getSupabaseClient();
  const { products, vendors, refresh } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const categoryOptions = useMemo(() => getAllCategoryOptions(), []);
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({});
  const getSoldCount = (product: unknown) => Number((product as { soldCount?: number } | null)?.soldCount ?? 0);

  const productToDelete = useMemo(
    () => (deleteProductId ? products.find((p) => p.id === deleteProductId) : undefined),
    [deleteProductId, products]
  );

  async function updateProductCategory(productId: string, category: string) {
    if (!supabase) throw new Error(t("admin.supabaseMissing"));
    const { error } = await supabase.from("products").update({ category: category.trim() }).eq("id", productId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function deleteProductWithReason() {
    if (!supabase || !user || !productToDelete) throw new Error(t("admin.missingData"));
    const reason = deleteReason.trim();
    if (reason.length < 5) throw new Error(t("admin.reasonMin"));

    const { error: notifyErr } = await supabase.from("vendor_notifications").insert({
      vendor_id: productToDelete.vendorId,
      product_id: productToDelete.id,
      type: "product_removed",
      title: `Product removed: ${productToDelete.title}`,
      message: `Your product was removed by admin. Reason: ${reason}`,
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

  const filteredProducts = useMemo(() => {
    let result = products;
    
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.title.toLowerCase().includes(q));
    }
    
    if (categoryFilter !== "all") {
      result = result.filter(p => normalizeCategoryName(p.category) === categoryFilter);
    }
    
    if (stockFilter === "in-stock") {
      result = result.filter(p => p.inStock);
    } else if (stockFilter === "out-of-stock") {
      result = result.filter(p => !p.inStock);
    }
    
    return result;
  }, [products, searchQuery, categoryFilter, stockFilter]);

  if (!user || user.role !== "admin") {
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
              <span className="text-gray-900 font-semibold text-sm">{t("admin.products")}</span>
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">{t("admin.products")}</h1>
                <p className="text-sm text-gray-500">{products.length} {t("admin.totalProducts")}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder={t("admin.search")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder={t("admin.category")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allCategories")}</SelectItem>
                    {categoryOptions.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder={t("admin.stock")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("admin.allStock")}</SelectItem>
                    <SelectItem value="in-stock">{t("admin.inStock")}</SelectItem>
                    <SelectItem value="out-of-stock">{t("admin.outOfStock")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.totalProducts")}</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.inStock")}</p>
                <p className="text-2xl font-bold text-green-600">{products.filter(p => p.inStock).length}</p>
              </div>
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.outOfStock")}</p>
                <p className="text-2xl font-bold text-red-600">{products.filter(p => !p.inStock).length}</p>
              </div>
              <div className="dashboard-stat-card">
                <p className="text-xs text-gray-500 mb-1">{t("admin.totalValue")}</p>
                <p className="text-2xl font-bold">{formatMoney(products.reduce((sum, p) => sum + p.price, 0))}</p>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {filteredProducts.map((product) => {
                const vendor = vendors.find((v) => v.id === product.vendorId);
                const current = normalizeCategoryName(product.category);
                const selected = categoryEdits[product.id] ?? (isRealCategoryName(current) ? current : "");

                return (
                  <div key={product.id} className="dashboard-card overflow-hidden transition-all group hover:shadow-md">
                    {/* Product Image */}
                    <div className="relative aspect-square bg-gray-50">
                      {product.image ? (
                        <img src={product.image} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package size={24} className="text-gray-300" />
                        </div>
                      )}
                      {!product.inStock && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">OUT</span>
                      )}
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
                        <span className="text-[10px] text-gray-400">{getSoldCount(product)} {t("admin.sold")}</span>
                      </div>

                      <Select
                        value={selected}
                        onValueChange={async (v) => {
                          setCategoryEdits((prev) => ({ ...prev, [product.id]: v }));
                          try {
                            await updateProductCategory(product.id, v);
                            toast({ title: t("admin.updated") });
                          } catch (e) {
                            toast({ title: t("admin.failed"), description: e instanceof Error ? e.message : t("admin.unknownError"), variant: "destructive" });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue placeholder={t("admin.category")} />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((c) => (
                            <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>

            {filteredProducts.length === 0 && (
              <div className="bg-white rounded-xl p-12 border border-dashed border-gray-200 text-center">
                <Boxes size={32} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">{t("admin.noProductsFound")}</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete Product Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("admin.deleteProduct")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("admin.deleteProductDesc")}
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
                  toast({ title: t("admin.deleted"), description: t("admin.productRemoved") });
                } catch (err) {
                  toast({ title: t("admin.failed"), description: err instanceof Error ? err.message : t("admin.unknownError"), variant: "destructive" });
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

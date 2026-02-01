import { BadgeCheck, Users, ClipboardList, Boxes, ShieldAlert, Search, Trash2, Eye, Tag, Package, Filter } from "lucide-react";
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
import { getSupabaseClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";
import { getAllCategoryOptions, isRealCategoryName, normalizeCategoryName } from "@/lib/categories";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin/vendors" },
  { label: "Products", icon: Boxes, href: "/admin/products", active: true },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications" },
];

export default function AdminProductsPage() {
  const { user } = useAuth();
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

  const productToDelete = useMemo(
    () => (deleteProductId ? products.find((p) => p.id === deleteProductId) : undefined),
    [deleteProductId, products]
  );

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <ShieldAlert size={48} className="mx-auto mb-6 text-gray-300" strokeWidth={1} />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-gray-500 mb-6">Admin privileges required</p>
          <Link to="/"><Button variant="outline" className="rounded-full">Home</Button></Link>
        </div>
      </div>
    );
  }

  async function updateProductCategory(productId: string, category: string) {
    if (!supabase) throw new Error("Supabase is not configured");
    const { error } = await supabase.from("products").update({ category: category.trim() }).eq("id", productId);
    if (error) throw new Error(error.message);
    await refresh();
  }

  async function deleteProductWithReason() {
    if (!supabase || !user || !productToDelete) throw new Error("Missing data");
    const reason = deleteReason.trim();
    if (reason.length < 5) throw new Error("Please provide a reason (min 5 chars)");

    const { error: notifyErr } = await supabase.from("vendor_notifications").insert({
      vendor_id: productToDelete.vendorId,
      product_id: productToDelete.id,
      type: "product_removed",
      title: `Product removed: ${productToDelete.title}`,
      message: `Your product was removed by admin. Reason: ${reason}`,
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 shadow-lg">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-8 w-auto brightness-0 invert" />
            </Link>
            <div className="h-5 w-px bg-gray-600" />
            <div className="flex items-center gap-2">
              <Link to="/admin" className="text-gray-400 hover:text-white text-sm font-medium transition-colors">Admin</Link>
              <span className="text-gray-500">/</span>
              <span className="text-white font-semibold text-sm">Products</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-gray-300 hover:text-white text-sm font-medium transition-colors">← Storefront</Link>
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
          <main className="flex-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold">Products</h1>
                <p className="text-sm text-gray-500">{products.length} total products</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="relative w-48">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-36 h-9">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categoryOptions.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={stockFilter} onValueChange={setStockFilter}>
                  <SelectTrigger className="w-32 h-9">
                    <SelectValue placeholder="Stock" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Stock</SelectItem>
                    <SelectItem value="in-stock">In Stock</SelectItem>
                    <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Products</p>
                <p className="text-2xl font-bold">{products.length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">In Stock</p>
                <p className="text-2xl font-bold text-green-600">{products.filter(p => p.inStock).length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Out of Stock</p>
                <p className="text-2xl font-bold text-red-600">{products.filter(p => !p.inStock).length}</p>
              </div>
              <div className="bg-white rounded-xl p-4 border border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Total Value</p>
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
                  <div key={product.id} className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all overflow-hidden group">
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
                        <span className="text-[10px] text-gray-400">{product.soldCount || 0} sold</span>
                      </div>

                      <Select
                        value={selected}
                        onValueChange={async (v) => {
                          setCategoryEdits((prev) => ({ ...prev, [product.id]: v }));
                          try {
                            await updateProductCategory(product.id, v);
                            toast({ title: "Updated" });
                          } catch (e) {
                            toast({ title: "Failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-[11px]">
                          <SelectValue placeholder="Category" />
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
                <p className="text-gray-500">No products found</p>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Delete Product Dialog */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the product and notify the vendor.
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
                  toast({ title: "Deleted", description: "Product removed" });
                } catch (err) {
                  toast({ title: "Failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
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

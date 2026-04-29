import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, Trash2, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { E2E_SELLER_ID, isE2EMode } from "@/lib/e2e";
import { getOptimizedCloudinaryUrl } from "@/lib/cloudinary";
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

export default function SellerProductsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, vendors, deleteProduct, getVendorsForOwner } = useMarketplace();
  const supabase = getSupabaseClient();

  const isLocalE2E = isE2EMode() || import.meta.env.DEV;
  const effectiveUserId = user?.id ?? (isLocalE2E ? E2E_SELLER_ID : undefined);
  const isAdmin = user?.role === "admin";
  const [ownedVendorIdList, setOwnedVendorIdList] = useState<string[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnedVendorIds() {
      if (!effectiveUserId || isAdmin) {
        setOwnedVendorIdList([]);
        return;
      }

      if (!supabase) {
        setOwnedVendorIdList(getVendorsForOwner(effectiveUserId).map((v) => v.id));
        return;
      }

      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("owner_user_id", effectiveUserId)
        .eq("status", "approved")
        .limit(200);

      if (cancelled) return;
      if (error) {
        // Fallback to marketplace-derived list if available
        setOwnedVendorIdList(getVendorsForOwner(effectiveUserId).map((v) => v.id));
        return;
      }

      setOwnedVendorIdList(((data ?? []) as Array<{ id: string }>).map((v) => v.id));
    }

    void loadOwnedVendorIds();
    return () => {
      cancelled = true;
    };
  }, [supabase, effectiveUserId, isAdmin, getVendorsForOwner]);

  const ownedVendorIds = new Set(effectiveUserId && !isAdmin ? ownedVendorIdList : []);

  const visibleProducts = isAdmin ? products : products.filter((p) => ownedVendorIds.has(p.vendorId));

  return (
    <div className="dashboard-shell">
      <div className="dashboard-topbar">
        <div className="container">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">{t("seller.productsTitle")}</h1>
            <p className="text-sm text-gray-600">{t("seller.productsSubtitle")}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link to="/seller">
              <Button size="sm" variant="outline" className="rounded-full">{t("seller.dashboard")}</Button>
            </Link>
            <Link to="/seller/products/new">
              <Button size="sm" className="rounded-full bg-gray-900 text-white hover:bg-gray-800">
                <Plus size={16} className="mr-2" />
                {t("seller.newProduct")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {visibleProducts.map((p) => {
            const vendor = vendors.find((v) => v.id === p.vendorId);
            const canDelete = isAdmin || ownedVendorIds.has(p.vendorId);
            return (
              <Card key={p.id} className="dashboard-card overflow-hidden">
                <CardContent className="p-0 flex flex-col">
                  <div className="w-full aspect-[4/3] bg-gray-100 overflow-hidden">
                    {p.image ? (
                      <img
                        src={getOptimizedCloudinaryUrl(p.image, { kind: "image", width: 200 })}
                        alt={p.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300 text-2xl">📦</div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col justify-between p-4 min-w-0">
                    <div>
                      <div className="font-semibold text-gray-900 truncate">{p.title}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        {vendor?.name ?? t("seller.unknown")}
                      </div>
                      <div className="text-sm mt-1">
                        <span className="font-medium text-gray-700">{formatMoney(p.price)}</span>
                        <span className="mx-1.5 text-gray-300">|</span>
                        <span className={p.inStock ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                          {p.inStock ? t("seller.inStock") : t("seller.out")}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Link to={`/product/${p.id}`}>
                        <Button size="sm" variant="outline" className="rounded-full h-8 px-3 text-xs gap-1">
                          <Eye size={13} /> {t("seller.view")}
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-full h-8 px-3 text-xs gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        disabled={!canDelete}
                        onClick={() => setConfirmDeleteId(p.id)}
                      >
                        <Trash2 size={13} /> {t("seller.delete")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {visibleProducts.length === 0 && (
            <div className="text-center py-16 text-gray-400 text-sm">No products yet. Create your first one!</div>
          )}
        </div>
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => { if (!open) setConfirmDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete product?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{visibleProducts.find(p => p.id === confirmDeleteId)?.title}</strong> will be permanently removed from your store. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={async () => {
                if (!confirmDeleteId) return;
                setDeleting(true);
                try {
                  await deleteProduct(confirmDeleteId);
                  toast({ title: t("seller.deleted"), description: t("seller.productRemoved") });
                  setConfirmDeleteId(null);
                } catch (e) {
                  toast({ title: t("seller.deleteFailed"), description: e instanceof Error ? e.message : t("seller.unknownError"), variant: "destructive" });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

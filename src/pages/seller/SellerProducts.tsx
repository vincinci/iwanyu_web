import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { useMarketplace } from "@/context/marketplace";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { useToast } from "@/hooks/use-toast";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function SellerProductsPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { products, vendors, deleteProduct, getVendorsForOwner } = useMarketplace();
  const supabase = getSupabaseClient();

  const isAdmin = user?.role === "admin";
  const [ownedVendorIdList, setOwnedVendorIdList] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnedVendorIds() {
      if (!supabase || !user || isAdmin) {
        setOwnedVendorIdList([]);
        return;
      }

      const { data, error } = await supabase
        .from("vendors")
        .select("id")
        .eq("owner_user_id", user.id)
        .eq("status", "approved")
        .limit(200);

      if (cancelled) return;
      if (error) {
        // Fallback to marketplace-derived list if available
        setOwnedVendorIdList(getVendorsForOwner(user.id).map((v) => v.id));
        return;
      }

      setOwnedVendorIdList(((data ?? []) as Array<{ id: string }>).map((v) => v.id));
    }

    void loadOwnedVendorIds();
    return () => {
      cancelled = true;
    };
  }, [supabase, user, isAdmin, getVendorsForOwner]);

  const ownedVendorIds = new Set(user && !isAdmin ? ownedVendorIdList : []);

  const visibleProducts = isAdmin ? products : products.filter((p) => ownedVendorIds.has(p.vendorId));

  return (
    <div className="dashboard-shell">
      <div className="dashboard-topbar">
        <div className="container py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{t("seller.productsTitle")}</h1>
            <p className="text-sm text-gray-600">{t("seller.productsSubtitle")}</p>
          </div>
          <div className="flex gap-2">
            <Link to="/seller">
              <Button variant="outline" className="rounded-full">{t("seller.dashboard")}</Button>
            </Link>
            <Link to="/seller/products/new">
              <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800">
                <Plus size={16} className="mr-2" />
                {t("seller.newProduct")}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container py-6">
        <div className="grid gap-4">
          {visibleProducts.map((p) => {
            const vendor = vendors.find((v) => v.id === p.vendorId);
            return (
              <Card key={p.id} className="dashboard-card">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="text-gray-600">
                    {t("seller.vendor")}: <span className="font-medium text-gray-900">{vendor?.name ?? t("seller.unknown")}</span>
                    <span className="mx-2">•</span>
                    {t("seller.price")}: <span className="font-medium text-gray-900">{formatMoney(p.price)}</span>
                    <span className="mx-2">•</span>
                    {t("seller.stock")}: <span className="font-medium text-gray-900">{p.inStock ? t("seller.inStock") : t("seller.out")}</span>
                  </div>
                  <div className="flex gap-2">
                    <Link to={`/product/${p.id}`}>
                      <Button variant="outline" className="rounded-full">{t("seller.view")}</Button>
                    </Link>
                    <Button
                      variant="outline"
                      className="rounded-full"
                      onClick={async () => {
                        if (!isAdmin && !ownedVendorIds.has(p.vendorId)) return;
                        try {
                          await deleteProduct(p.id);
                          toast({ title: t("seller.deleted"), description: t("seller.productRemoved") });
                        } catch (e) {
                          toast({
                            title: t("seller.deleteFailed"),
                            description: e instanceof Error ? e.message : t("seller.unknownError"),
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={!isAdmin && !ownedVendorIds.has(p.vendorId)}
                    >
                      <Trash2 size={16} className="mr-2" />
                      {t("seller.delete")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}

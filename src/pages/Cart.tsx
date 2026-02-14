import { Link, useNavigate } from "react-router-dom";
import { useMemo } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { useCart } from "@/context/cart";
import { formatMoney } from "@/lib/money";
import { calculateServiceFee, GUEST_SERVICE_FEE_RATE } from "@/lib/fees";
import { useMarketplace } from "@/context/marketplace";
import { useLanguage } from "@/context/languageContext";
import { ProductCard } from "@/components/ProductCard";

export default function CartPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { items, itemCount, subtotal, removeItem, setQuantity, clear } = useCart();
  const { products } = useMarketplace();

  const recommended = useMemo(() => {
    if (items.length === 0) return [];

    const inCart = new Set(items.map((i) => i.productId));
    const categoryCounts = new Map<string, number>();

    for (const item of items) {
      const product = products.find((p) => p.id === item.productId);
      const category = product?.category;
      if (!category) continue;
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1);
    }

    return products
      .filter((p) => !inCart.has(p.id))
      .slice()
      .sort((a, b) => {
        const aCat = categoryCounts.get(a.category ?? "") ?? 0;
        const bCat = categoryCounts.get(b.category ?? "") ?? 0;
        if (bCat !== aCat) return bCat - aCat;
        const byRating = (b.rating ?? 0) - (a.rating ?? 0);
        if (byRating !== 0) return byRating;
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      })
      .slice(0, 12);
  }, [items, products]);

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 mb-3">{t("cart.title")}</h1>
          <div className="flex items-center justify-between">
            <p className="text-base text-gray-600">
              {itemCount} {itemCount === 1 ? t("cart.items") : t("cart.itemsPlural")}
            </p>
            <Link to="/" className="group text-sm font-semibold text-gray-700 hover:text-black transition-colors flex items-center gap-2">
              {t("cart.continue")} 
              <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
            </Link>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">{t("cart.empty")}</p>
            <Link to="/">
              <Button className="mt-4 rounded-md">
                {t("cart.shopProducts")}
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-lg border border-border bg-card">
              <div className="divide-y">
                {items.map((item) => (
                  <div key={item.productId} className="flex gap-4 p-4">
                    <div className="h-20 w-20 shrink-0 rounded-md bg-muted p-2">
                      {item.image ? (
                        <img src={item.image} alt={item.title} className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{t("cart.noImage")}</div>
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-foreground">{item.title}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{formatMoney(item.price)}</div>
                        </div>

                        <button
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => removeItem(item.productId)}
                          aria-label={t("cart.remove")}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="inline-flex items-center rounded-md border border-border bg-background">
                          <button
                            className="px-3 py-2 text-foreground hover:bg-muted rounded-l-md"
                            onClick={() => setQuantity(item.productId, Math.max(1, item.quantity - 1))}
                            aria-label={t("cart.decrease")}
                          >
                            <Minus size={16} />
                          </button>
                          <div className="min-w-10 text-center text-sm font-medium text-foreground">{item.quantity}</div>
                          <button
                            className="px-3 py-2 text-foreground hover:bg-muted rounded-r-md"
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                            aria-label={t("cart.increase")}
                          >
                            <Plus size={16} />
                          </button>
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {t("cart.total")} <span className="font-medium text-foreground">{formatMoney(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between gap-3 p-4">
                <Button variant="outline" className="rounded-md" onClick={clear}>
                  {t("cart.clear")}
                </Button>
                <Button
                  className="rounded-md"
                  onClick={() => navigate("/checkout")}
                >
                  {t("cart.checkout")}
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 h-fit">
              <h2 className="text-sm font-medium text-foreground">{t("cart.orderSummary")}</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("cart.subtotal")}</span>
                  <span className="font-medium text-foreground">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("cart.serviceFee")} ({GUEST_SERVICE_FEE_RATE * 100}%)</span>
                  <span className="font-medium text-foreground">{formatMoney(calculateServiceFee(subtotal))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t("cart.shipping")}</span>
                  <span className="font-medium text-foreground">{t("cart.calculated")}</span>
                </div>
                <div className="border-t pt-3 flex items-center justify-between">
                  <span className="text-foreground font-medium">{t("cart.total")}</span>
                  <span className="text-foreground font-semibold">{formatMoney(subtotal + calculateServiceFee(subtotal))}</span>
                </div>
              </div>
              <Button
                className="mt-5 w-full rounded-md"
                onClick={() => navigate("/checkout")}
              >
                {t("cart.proceed")}
              </Button>
            </div>
          </div>
        )}

        {items.length > 0 ? (
          <div className="mt-16">
            <h2 className="text-xl font-semibold text-foreground mb-6">{t("cart.recommended")}</h2>
            {recommended.length === 0 ? (
              <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
                {t("cart.noRecommendations")}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {recommended.slice(0, 8).map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </StorefrontPage>
  );
}

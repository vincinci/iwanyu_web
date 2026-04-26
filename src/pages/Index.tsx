import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { Footer } from "@/components/Footer";
import { HomeSEO } from "@/components/SEO";
import { useMarketplace } from "@/context/marketplace";
import { useRecentlyViewed } from "@/context/recentlyViewed";
import { CATEGORIES, normalizeCategoryName } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";
import { useLanguage } from "@/context/languageContext";
import { ArrowLeftRight } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchActiveLiveSessions, summarizeLiveForHome, type LiveSession } from "@/lib/liveSessions";
import { formatMoney } from "@/lib/money";

const Index = () => {
  const { products, loading, error } = useMarketplace();
  const { vendors } = useMarketplace();
  const { productIds: recentlyViewedIds, clear: clearRecentlyViewed } = useRecentlyViewed();
  const { t } = useLanguage();
  const [activeLiveSessions, setActiveLiveSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const sessions = await fetchActiveLiveSessions();
      if (!cancelled) setActiveLiveSessions(sessions);
    };

    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const liveSummary = summarizeLiveForHome(vendors, products, activeLiveSessions);

  // Get recently viewed products
  const recentlyViewedProducts = recentlyViewedIds
    .map(id => products.find(p => p.id === id))
    .filter((p): p is Product => Boolean(p))
    .slice(0, 8);

  // Group products by category
  const productsByCategory = CATEGORIES.map(category => {
    const categoryProducts = products.filter(product => {
      const normalizedProductCategory = normalizeCategoryName(product.category);
      return normalizedProductCategory === category.name;
    });
    return {
      ...category,
      products: categoryProducts,
      count: categoryProducts.length
    };
  }).filter(cat => cat.count > 0);

  return (
    <>
      <HomeSEO />
      <div className="flex min-h-screen flex-col bg-gray-50">
        <Header />
        
        <main className="flex-1">
          <HeroSection />
          
          <CategoryNav />
        
        {/* Recently Viewed Products */}
        {recentlyViewedProducts.length > 0 && !loading && (
          <section className="container py-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t("home.recentlyViewed")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("home.pickup")}</p>
                <div className="mt-1 inline-flex items-center gap-1 text-xs text-gray-500 sm:hidden">
                  <ArrowLeftRight size={12} />
                  <span>Swipe</span>
                </div>
              </div>
              <Button 
                variant="ghost" 
                className="h-9 px-3 text-xs font-semibold rounded-full" 
                onClick={clearRecentlyViewed}
              >
                {t("home.clear")}
              </Button>
            </div>

            <div className="mt-6 -mx-4 overflow-x-auto px-4 scroll-hide sm:mx-0 sm:overflow-visible sm:px-0">
              <div className="flex min-w-max gap-3 sm:min-w-0 sm:grid sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
                {recentlyViewedProducts.map((product, idx) => (
                  <div
                    key={product!.id}
                    style={{ animationDelay: `${idx * 50}ms` }}
                    className="w-[44vw] min-w-[160px] max-w-[210px] shrink-0 sm:w-auto sm:min-w-0 sm:max-w-none"
                  >
                    <ProductCard product={product!} />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Featured categories */}
        <div className="container py-12">
          <section className="mb-12 rounded-3xl border border-red-100 bg-red-50/60 p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Live On Home</h2>
                <p className="mt-1 text-sm text-gray-600">
                  Join active live sellers and auctions right from the home page.
                </p>
              </div>
              <Link to="/live">
                <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800">Open Live</Button>
              </Link>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-gray-900">People live now</div>
                {liveSummary.liveSellers.length === 0 ? (
                  <p className="text-sm text-gray-500">No sellers are live now. Check back soon.</p>
                ) : (
                  <div className="space-y-2">
                    {liveSummary.liveSellers.slice(0, 4).map((seller) => (
                      <div key={seller.vendorId} className="flex items-center justify-between rounded-xl border border-gray-100 p-3">
                        <div>
                          <div className="font-medium text-gray-900">{seller.vendorName}</div>
                          <div className="text-xs text-gray-500">{seller.watchers} viewers</div>
                        </div>
                        <Link to="/live">
                          <Button size="sm" variant="outline" className="rounded-full">Watch</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 text-sm font-semibold text-gray-900">Live auctions available</div>
                {liveSummary.liveAuctions.length === 0 ? (
                  <p className="text-sm text-gray-500">No live auctions are running now.</p>
                ) : (
                  <div className="space-y-2">
                    {liveSummary.liveAuctions.slice(0, 4).map((auction) => (
                      <div key={auction.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-3">
                        <img src={auction.productImage} alt={auction.productTitle} className="h-12 w-12 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-gray-900">{auction.productTitle}</div>
                          <div className="text-xs text-gray-500">Bid now: {formatMoney(auction.currentBidRwf)}</div>
                        </div>
                        <Link to={`/product/${auction.productId}`}>
                          <Button size="sm" className="rounded-full">Bid</Button>
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {activeLiveSessions.length > 0 ? (
              <p className="mt-3 text-xs text-gray-500">{activeLiveSessions.length} total live sessions are active.</p>
            ) : null}
          </section>

          {loading ? (
            <div className="space-y-12">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="h-8 bg-gray-200 rounded-xl w-48 mb-6 animate-pulse"></div>
                  <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                    {[...Array(8)].map((_, j) => (
                      <div key={j} className="animate-pulse">
                        <div className="bg-gray-200 aspect-[3/4] rounded-2xl mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded-lg mb-1"></div>
                        <div className="h-3 bg-gray-200 rounded-lg w-3/4 mb-1"></div>
                        <div className="h-4 bg-gray-200 rounded-lg w-2/3"></div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("home.noProducts")}</h3>
              <p className="text-gray-600 mb-2">{t("home.noProductsDesc")}</p>
              <p className="text-sm text-gray-500 mb-6">{t("home.tryAgain")}</p>
              <Button variant="outline" onClick={() => window.location.reload()}>{t("home.reload")}</Button>
            </div>
          ) : (
            <div className="space-y-12">
              {productsByCategory.slice(0, 5).map((category) => (
                <CategorySection
                  key={category.id}
                  category={category.name}
                  products={category.products}
                  categoryId={category.id}
                />
              ))}
            </div>
          )}
        </div>

        {/* Promo Banner */}
        <section className="container py-10">
          <div className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-8 shadow-sm">
            <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">{t("home.freeShipTitle")}</h2>
                <p className="mt-1 text-base text-gray-700">{t("home.freeShipDesc")}</p>
              </div>
              <Link to="/account">
                <Button className="rounded-full bg-gray-900 text-white hover:bg-gray-800 font-semibold px-7 py-6 text-base shadow-sm flex items-center gap-2">
                  {t("home.createAccount")}
                  <ArrowRight size={18} />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
    </>
  );
};

// Category Section Component with Horizontal Scrolling
interface CategorySectionProps {
  category: string;
  products: Product[];
  categoryId: string;
}

const CategorySection = ({ category, products, categoryId }: CategorySectionProps) => {
  const { t } = useLanguage();
  if (products.length === 0) return null;

  return (
    <div className="relative">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-2xl font-semibold text-gray-900">{category}</h2>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1 text-xs text-gray-500 sm:hidden">
            <ArrowLeftRight size={12} />
            <span>Swipe</span>
          </div>
          <Link 
            to={`/category/${categoryId}`}
            className="group/link text-sm font-semibold text-gray-600 hover:text-black transition-colors flex items-center gap-1"
          >
            {t("category.viewAll")} 
            <ArrowRight size={16} className="transition-transform duration-300 group-hover/link:translate-x-1" />
          </Link>
        </div>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 scroll-hide sm:mx-0 sm:overflow-visible sm:px-0">
        <div className="flex min-w-max gap-4 sm:min-w-0 sm:grid sm:grid-cols-3 lg:grid-cols-5">
          {products.slice(0, 10).map((product) => (
            <div
              key={product.id}
              className="w-[44vw] min-w-[160px] max-w-[220px] shrink-0 sm:w-auto sm:min-w-0 sm:max-w-none"
            >
              <ProductCard product={product} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Index;

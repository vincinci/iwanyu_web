import { useRef } from "react";
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
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/types/product";

const Index = () => {
  const { products, loading, error } = useMarketplace();
  const { productIds: recentlyViewedIds, clear: clearRecentlyViewed } = useRecentlyViewed();

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
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        
        <main className="flex-1">
          <HeroSection />
          
          <CategoryNav />
        
        {/* Recently Viewed Products */}
        {recentlyViewedProducts.length > 0 && !loading && (
          <section className="container py-10">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">Recently viewed</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pick up where you left off.</p>
              </div>
              <Button variant="ghost" className="h-8 px-2 text-xs" onClick={clearRecentlyViewed}>
                Clear
              </Button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
              {recentlyViewedProducts.map((product) => (
                <ProductCard key={product!.id} product={product!} />
              ))}
            </div>
          </section>
        )}

        {/* Category Sections with Horizontal Scrolling */}
        <div className="container py-12">
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products available</h3>
              <p className="text-gray-600 mb-2">No products to show yet.</p>
              <p className="text-sm text-gray-500 mb-6">Try again in a moment.</p>
              <Button variant="outline" onClick={() => window.location.reload()}>Reload</Button>
            </div>
          ) : (
            <div className="space-y-12">
              {productsByCategory.map((category) => (
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
          <div className="rounded-lg border bg-card p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Free shipping on your first order</h2>
                <p className="mt-1 text-sm text-muted-foreground">Create an account to unlock perks and faster checkout.</p>
              </div>
              <Link to="/account">
                <Button className="rounded-md">Create account</Button>
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
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      const currentScroll = scrollContainerRef.current.scrollLeft;
      const newScroll = direction === 'left' 
        ? currentScroll - scrollAmount 
        : currentScroll + scrollAmount;
      
      scrollContainerRef.current.scrollTo({
        left: newScroll,
        behavior: 'smooth'
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <div className="relative group/section">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-4 mb-5">
        <h2 className="text-lg font-semibold text-foreground">{category}</h2>
        <Link 
          to={`/category/${categoryId}`}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          View all <ArrowRight size={14} />
        </Link>
      </div>

      {/* Scroll Controls */}
      <div className="relative">
        {products.length > 5 && (
          <>
            <button
              onClick={() => scroll('left')}
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 hidden lg:flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-sm opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-muted"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 hidden lg:flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-sm opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-muted"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Horizontal Scrolling Product Grid */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 snap-x"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {products.slice(0, 15).map((product) => (
            <div
              key={product.id}
              className="flex-none w-[180px] sm:w-[200px] md:w-[220px] lg:w-[240px] snap-start"
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

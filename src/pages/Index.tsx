import { useRef } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { Footer } from "@/components/Footer";
import { useMarketplace } from "@/context/marketplace";
import { useRecentlyViewed } from "@/context/recentlyViewed";
import { CATEGORIES, normalizeCategoryName } from "@/lib/categories";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, X, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  const { products, loading, error } = useMarketplace();
  const { productIds: recentlyViewedIds, clear: clearRecentlyViewed } = useRecentlyViewed();

  // Get recently viewed products
  const recentlyViewedProducts = recentlyViewedIds
    .map(id => products.find(p => p.id === id))
    .filter(Boolean)
    .slice(0, 8);

  // Enhanced debug logging
  console.log('=== MARKETPLACE DEBUG ===');
  console.log('Products loaded:', products.length);
  console.log('Loading state:', loading);
  console.log('Marketplace error:', error);
  console.log('Sample products:', products.slice(0, 3));
  console.log('Supabase URL configured:', !!import.meta.env.VITE_SUPABASE_URL);
  console.log('========================');

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
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        
        <CategoryNav />
        
        {/* Recently Viewed Products */}
        {recentlyViewedProducts.length > 0 && !loading && (
          <div className="container py-8">
            <div className="border-t border-b border-gray-100 bg-white py-8">
              <div className="flex items-center justify-between mb-6 px-4">
                <div>
                  <h2 className="text-2xl font-black uppercase text-black tracking-tighter">Recently Viewed</h2>
                </div>
                <button
                  onClick={clearRecentlyViewed}
                  className="text-xs font-bold uppercase text-gray-500 hover:text-black transition-colors"
                >
                  Clear History
                </button>
              </div>
              <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 border-l border-r border-gray-100">
                {recentlyViewedProducts.map((product) => (
                  <ProductCard key={product!.id} product={product!} />
                ))}
              </div>
            </div>
          </div>
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
              <p className="text-gray-600 mb-2">Database connection issue detected</p>
              <p className="text-sm text-gray-500 mb-6">
                Please check the browser console for error details or contact support.
              </p>
              <Button onClick={() => window.location.reload()}>Reload Page</Button>
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
        <div className="container py-8">
          <div className="border-t border-b border-black bg-iwanyu-primary p-8">
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 items-center">
              <div>
                <span className="inline-block bg-black px-3 py-1 text-xs font-bold text-white uppercase tracking-wider mb-2">
                  Limited Offer
                </span>
                <h2 className="text-3xl font-black uppercase text-black leading-none">
                  Free Shipping <br/>First Order
                </h2>
                <p className="mt-2 text-black font-medium">
                  Join the club. Get the perks. No minimum.
                </p>
              </div>
              <div className="flex items-center justify-center md:justify-end">
                <a 
                  href="/account" 
                  className="bg-black px-8 py-3 text-center text-sm font-bold uppercase tracking-widest text-white hover:bg-gray-900 transition-colors"
                >
                  Sign Up Now
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

// Category Section Component with Horizontal Scrolling
interface CategorySectionProps {
  category: string;
  products: Array<any>;
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
      <div className="flex items-center justify-between mb-6 border-b border-black pb-2">
        <h2 className="text-2xl font-black uppercase text-black tracking-tighter">{category}</h2>
        <Link 
          to={`/category/${categoryId}`}
          className="text-xs font-bold uppercase text-black hover:text-iwanyu-primary transition-colors flex items-center gap-1"
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
              className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-black p-3 opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-black hover:text-white hidden highlight-hover-target lg:block"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => scroll('right')}
              className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white border border-black p-3 opacity-0 group-hover/section:opacity-100 transition-opacity hover:bg-black hover:text-white hidden highlight-hover-target lg:block"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* Horizontal Scrolling Product Grid */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x"
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

import { useState } from "react";
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryNav } from "@/components/CategoryNav";
import { ProductCard } from "@/components/ProductCard";
import { Footer } from "@/components/Footer";
import { useMarketplace } from "@/context/marketplace";
import { CATEGORIES, normalizeCategoryName } from "@/lib/categories";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { products, loading } = useMarketplace();
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Enhanced debug logging
  console.log('=== MARKETPLACE DEBUG ===');
  console.log('Products loaded:', products.length);
  console.log('Loading state:', loading);
  console.log('Sample products:', products.slice(0, 3));
  console.log('Supabase URL configured:', !!import.meta.env.VITE_SUPABASE_URL);
  console.log('========================');

  // Filter products by selected category
  const filteredProducts = selectedCategory === "all" 
    ? products
    : products.filter(product => {
        const normalizedCategory = normalizeCategoryName(product.category);
        return normalizedCategory === selectedCategory;
      });

  // Get category counts
  const categoryCounts = CATEGORIES.map(category => {
    const count = products.filter(product => {
      const normalizedProductCategory = normalizeCategoryName(product.category);
      return normalizedProductCategory === category.name;
    }).length;
    return { ...category, count };
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        
        <CategoryNav />
        
        {/* Products Section */}
        <div className="container py-8">
          {/* Category Tabs */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Shop All Products</h2>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                className="rounded-full whitespace-nowrap"
                onClick={() => setSelectedCategory("all")}
              >
                All Products ({products.length})
              </Button>
              {categoryCounts.filter(cat => cat.count > 0).map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.name ? "default" : "outline"}
                  className="rounded-full whitespace-nowrap"
                  onClick={() => setSelectedCategory(category.name)}
                >
                  {category.name} ({category.count})
                </Button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="bg-gray-200 aspect-square rounded-lg mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {filteredProducts.map(product => (
                <ProductCard key={product.id} product={product} />
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
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No products found</h3>
              <p className="text-gray-600 mb-6">Try selecting a different category</p>
              <Button onClick={() => setSelectedCategory("all")}>View All Products</Button>
            </div>
          )}
        </div>

        {/* Promo Banner */}
        <div className="container py-4">
          <div className="rounded-lg border border-iwanyu-border bg-gradient-to-r from-yellow-50 to-amber-50 p-6 shadow-subtle">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <span className="inline-block rounded bg-iwanyu-primary/10 px-2.5 py-1 text-xs font-medium text-iwanyu-primary">
                  Limited Offer
                </span>
                <h2 className="mt-2 text-2xl font-bold text-iwanyu-foreground">
                  Get free shipping on your first order
                </h2>
                <p className="mt-1 text-gray-600">
                  Sign up for an iwanyu account and get free shipping on your first order.
                </p>
              </div>
              <div className="flex items-center justify-center md:justify-end">
                <a 
                  href="/account" 
                  className="rounded-full bg-iwanyu-primary px-6 py-2.5 text-center text-sm font-medium text-white shadow-md transition-colors hover:bg-iwanyu-primary/90"
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

export default Index;

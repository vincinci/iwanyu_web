import { useMemo, useState } from "react";
import { useMarketplace } from "@/context/marketplace";
import StorefrontPage from "@/components/StorefrontPage";
import { ProductCard } from "@/components/ProductCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Flame, Clock, Percent, Tag, TrendingDown, Sparkles } from "lucide-react";

export default function Deals() {
  const { products, loading } = useMarketplace();
  const [sortBy, setSortBy] = useState<"discount" | "price-low" | "price-high">("discount");

  // Filter products with discounts
  const dealProducts = useMemo(() => {
    const withDiscounts = products.filter(
      (p) => typeof p.discountPercentage === "number" && p.discountPercentage > 0
    );

    return withDiscounts.sort((a, b) => {
      switch (sortBy) {
        case "discount":
          return (b.discountPercentage ?? 0) - (a.discountPercentage ?? 0);
        case "price-low":
          return a.price - b.price;
        case "price-high":
          return b.price - a.price;
        default:
          return 0;
      }
    });
  }, [products, sortBy]);

  // Group by discount tiers
  const flashDeals = dealProducts.filter((p) => (p.discountPercentage ?? 0) >= 30);
  const hotDeals = dealProducts.filter(
    (p) => (p.discountPercentage ?? 0) >= 15 && (p.discountPercentage ?? 0) < 30
  );
  const regularDeals = dealProducts.filter((p) => (p.discountPercentage ?? 0) < 15);

  // Calculate total savings
  const totalSavings = dealProducts.reduce((sum, p) => {
    const originalPrice = p.price * (1 + (p.discountPercentage ?? 0) / 100);
    return sum + (originalPrice - p.price);
  }, 0);

  return (
    <StorefrontPage>
      <div className="min-h-screen">
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-red-600 via-orange-500 to-amber-500 py-12 md:py-16">
          <div className="container">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-3">
                  <Flame className="h-8 w-8 text-white animate-pulse" />
                  <Badge className="bg-white/20 text-white border-white/30 text-sm px-3 py-1">
                    Limited Time
                  </Badge>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-3">
                  Hot Deals & Offers
                </h1>
                <p className="text-white/90 text-lg max-w-md">
                  Discover amazing discounts up to <span className="font-bold">50% off</span> on your favorite products!
                </p>
              </div>
              
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 text-center border border-white/20">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Clock className="h-5 w-5 text-white" />
                  <span className="text-white/80 text-sm font-medium">Deals refresh daily</span>
                </div>
                <div className="text-white">
                  <span className="text-4xl font-bold">{dealProducts.length}</span>
                  <span className="text-white/80 ml-2">active deals</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="bg-gray-900 py-4">
          <div className="container">
            <div className="flex flex-wrap items-center justify-center gap-6 md:gap-12 text-center">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-green-400" />
                <span className="text-white font-medium">Up to 50% Off</span>
              </div>
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-yellow-400" />
                <span className="text-white font-medium">{dealProducts.length} Active Deals</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-blue-400" />
                <span className="text-white font-medium">
                  Save up to RWF {Math.round(totalSavings).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-12">
          {loading ? (
            <div className="space-y-12">
              <div className="h-8 bg-gray-200 rounded-xl w-48 animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {[...Array(10)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="bg-gray-200 aspect-[4/5] rounded-2xl mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded-lg mb-1"></div>
                    <div className="h-4 bg-gray-200 rounded-lg w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          ) : dealProducts.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-orange-100 mb-6">
                <Sparkles className="w-10 h-10 text-orange-500" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No Active Deals Right Now
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Check back soon! Our sellers are constantly adding new discounts and special offers.
              </p>
              <Button
                onClick={() => window.location.href = "/"}
                className="rounded-full bg-iwanyu-primary hover:bg-iwanyu-primary/90"
              >
                Browse All Products
              </Button>
          </div>
        ) : (
            <div className="space-y-12">
              {/* Sort Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">All Deals</h2>
                  <p className="text-gray-600">
                    {dealProducts.length} products with special discounts
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant={sortBy === "discount" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("discount")}
                    className="rounded-full"
                  >
                    <Percent className="h-4 w-4 mr-1" />
                    Biggest Savings
                  </Button>
                  <Button
                    variant={sortBy === "price-low" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("price-low")}
                    className="rounded-full"
                  >
                    Price: Low to High
                  </Button>
                  <Button
                    variant={sortBy === "price-high" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSortBy("price-high")}
                    className="rounded-full"
                  >
                    Price: High to Low
                  </Button>
                </div>
              </div>

              {/* Flash Deals Section (30%+ off) */}
              {flashDeals.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100">
                      <Flame className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Flash Deals</h3>
                      <p className="text-sm text-red-600 font-medium">30% off or more!</p>
                    </div>
                    <Badge className="ml-auto bg-red-100 text-red-700 border-red-200">
                      {flashDeals.length} deals
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {flashDeals.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Hot Deals Section (15-29% off) */}
              {hotDeals.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-100">
                      <Tag className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Hot Deals</h3>
                      <p className="text-sm text-orange-600 font-medium">15-29% off</p>
                    </div>
                    <Badge className="ml-auto bg-orange-100 text-orange-700 border-orange-200">
                      {hotDeals.length} deals
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {hotDeals.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </section>
              )}

              {/* Regular Deals Section (under 15% off) */}
              {regularDeals.length > 0 && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                      <Percent className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">More Savings</h3>
                      <p className="text-sm text-blue-600 font-medium">Up to 15% off</p>
                    </div>
                    <Badge className="ml-auto bg-blue-100 text-blue-700 border-blue-200">
                      {regularDeals.length} deals
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                    {regularDeals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
                  </div>
                </section>
              )}
          </div>
        )}
        </div>
      </div>
    </StorefrontPage>
  );
}

import { Link } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/context/wishlist";
import { useMarketplace } from "@/context/marketplace";
import { ProductCard } from "@/components/ProductCard";
import { Heart, ShoppingBag, Sparkles } from "lucide-react";

export default function WishlistPage() {
  const { productIds, clear } = useWishlist();
  const { products } = useMarketplace();

  const wishlistProducts = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean);

  // Get recommended products (not in wishlist, sorted by rating)
  const recommended = products
    .filter((p) => !productIds.includes(p.id))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, 6);

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-iwanyu-foreground flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" fill="currentColor" />
              Your Wishlist
            </h1>
            <p className="mt-1 text-gray-600">
              {wishlistProducts.length} saved item{wishlistProducts.length !== 1 ? 's' : ''}
            </p>
          </div>
          {wishlistProducts.length > 0 && (
            <Button
              variant="outline"
              onClick={clear}
              className="rounded-full"
            >
              Clear all
            </Button>
          )}
        </div>

        {wishlistProducts.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-50 mb-6">
              <Heart className="w-12 h-12 text-red-400" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              Your wishlist is empty
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Save items you love by clicking the heart icon on any product. Your favorites will appear here!
            </p>
            <Link to="/">
              <Button className="rounded-full bg-iwanyu-primary text-white hover:bg-iwanyu-primary/90 px-8">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Start Shopping
              </Button>
            </Link>

            {/* Suggestions */}
            {recommended.length > 0 && (
              <div className="mt-16 text-left">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-iwanyu-primary" />
                  <h3 className="text-xl font-bold text-gray-900">You might like</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {recommended.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {wishlistProducts.map((p) => (
                <ProductCard key={p!.id} product={p!} />
              ))}
            </div>

            {/* Recommendations */}
            {recommended.length > 0 && (
              <div className="mt-16">
                <div className="flex items-center gap-2 mb-6">
                  <Sparkles className="h-5 w-5 text-iwanyu-primary" />
                  <h2 className="text-xl font-bold text-gray-900">You might also like</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {recommended.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StorefrontPage>
  );
}

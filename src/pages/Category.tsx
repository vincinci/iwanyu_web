import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { ProductCard } from "@/components/ProductCard";
import { useMarketplace } from "@/context/marketplace";
import { getCategoryById, slugifyCategory } from "@/lib/categories";

function titleFromSlug(slug: string) {
  if (slug === "all") return "All";
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function CategoryPage() {
  const { categoryId: rawCategoryId } = useParams();
  const categoryId = rawCategoryId ?? "all";
  const { products } = useMarketplace();

  const title = (() => {
    if (categoryId === "all") return "All";
    const def = getCategoryById(categoryId);
    return def?.name ?? titleFromSlug(categoryId);
  })();

  const filtered = useMemo(() => {
    if (categoryId === "all") return products;
    return products.filter((p) => slugifyCategory(p.category) === categoryId);
  }, [categoryId, products]);

  const recommended = useMemo(() => {
    // For a category page, recommend products from other categories.
    if (categoryId === "all") return [];
    return products
      .filter((p) => slugifyCategory(p.category) !== categoryId)
      .slice()
      .sort((a, b) => {
        const byRating = (b.rating ?? 0) - (a.rating ?? 0);
        if (byRating !== 0) return byRating;
        return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
      })
      .slice(0, 12);
  }, [categoryId, products]);

  return (
    <StorefrontPage>
      <div className="container py-12 animate-in fade-in slide-in-from-bottom duration-500">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div className="animate-in slide-in-from-left duration-700">
            <h1 className="text-5xl font-black bg-gradient-to-r from-black via-gray-700 to-gray-500 bg-clip-text text-transparent">{title}</h1>
            <p className="mt-3 text-lg text-gray-600 font-medium">Browse products in this category.</p>
          </div>
          <Link to="/" className="group text-sm font-bold text-white bg-gradient-to-r from-black to-gray-700 hover:from-gray-800 hover:to-black px-6 py-3 rounded-full transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-95 flex items-center gap-2 animate-in slide-in-from-right duration-700">
            <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Back to home
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-3xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-12 text-center shadow-xl animate-in fade-in slide-in-from-bottom duration-500 delay-200">
            <div className="text-gray-400 mb-4 animate-pulse">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 text-base font-medium">Try browsing other categories or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 animate-in fade-in slide-in-from-bottom duration-500 delay-200">
            {filtered.map((product, idx) => (
              <div key={product.id} style={{ animationDelay: `${idx * 30}ms` }}>
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}

        {categoryId !== "all" ? (
          <div className="mt-16 animate-in fade-in slide-in-from-bottom duration-700 delay-500">
            <h2 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-8">Recommended Products</h2>
            {recommended.length === 0 ? (
              <div className="rounded-3xl border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white p-8 text-gray-600 font-medium shadow-lg">
                No recommendations available right now.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {recommended.map((product, idx) => (
                  <div key={product.id} style={{ animationDelay: `${idx * 40}ms` }} className="animate-in fade-in slide-in-from-bottom duration-500">
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </StorefrontPage>
  );
}

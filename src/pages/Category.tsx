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
      <div className="container py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-semibold text-gray-900">{title}</h1>
            <p className="mt-2 text-base text-gray-600">Browse products in this category.</p>
          </div>
          <Link to="/" className="group text-sm font-semibold text-gray-700 hover:text-black transition-colors flex items-center gap-2">
            <span className="transition-transform duration-300 group-hover:-translate-x-1">←</span> Back to home
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-12 text-center">
            <div className="text-gray-400 mb-4 animate-pulse">
              <svg className="mx-auto h-16 w-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600 text-base">Try browsing other categories or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {categoryId !== "all" ? (
          <div className="mt-16">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Recommended products</h2>
            {recommended.length === 0 ? (
              <div className="rounded-2xl border border-gray-200 bg-white p-8 text-gray-600">
                No recommendations available right now.
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {recommended.map((product) => (
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

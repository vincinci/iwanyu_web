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

  const filtered = (() => {
    if (categoryId === "all") return products;
    return products.filter((p) => slugifyCategory(p.category) === categoryId);
  })();

  return (
    <StorefrontPage>
      <div className="container py-12">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-bold text-iwanyu-foreground">{title}</h1>
            <p className="mt-2 text-lg text-gray-600">Browse products in this category.</p>
          </div>
          <Link to="/" className="text-sm font-medium text-iwanyu-primary hover:underline px-4 py-2 rounded-full bg-iwanyu-primary/10 transition-colors">
            ← Back to home
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-iwanyu-border bg-white p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-600">Try browsing other categories or check back later.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

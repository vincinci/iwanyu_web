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
      <div className="container py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-iwanyu-foreground">{title}</h1>
            <p className="mt-1 text-gray-600">Browse products in this category.</p>
          </div>
          <Link to="/" className="text-sm font-medium text-iwanyu-primary hover:underline">
            Back to home
          </Link>
        </div>

        {filtered.length === 0 ? (
          <div className="mt-8 rounded-lg border border-iwanyu-border bg-white p-6 text-gray-600">
            No products found.
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:gap-6">
            {filtered.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

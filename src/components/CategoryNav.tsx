
import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useMarketplace } from '@/context/marketplace';
import { getNavCategoriesWithCounts } from '@/lib/categories';

function titleFromSlug(slug: string) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1))
    .join(' ');
}

export const CategoryNav = () => {
  const { products } = useMarketplace();

  const categories = useMemo(() => {
    return getNavCategoriesWithCounts(products).slice(0, 4);
  }, [products]);

  return (
    <section className="py-8 sm:py-12">
      <div className="container">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-iwanyu-foreground mb-2">Browse Categories</h2>
          <p className="text-gray-600">Discover products in popular categories</p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {categories.map((category) => (
            <Link 
              key={category.id}
              to={`/category/${category.id}`}
              className="group overflow-hidden rounded-2xl border border-iwanyu-border/60 bg-white p-6 text-center shadow-lg transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 hover:border-iwanyu-primary/20"
            >
              <div className="mb-4 flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-iwanyu-primary/10 to-iwanyu-primary/5">
                <div className="text-4xl font-bold text-iwanyu-primary">{titleFromSlug(category.id).slice(0, 1)}</div>
              </div>
              <h3 className="text-lg font-semibold text-iwanyu-foreground group-hover:text-iwanyu-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{category.count} items</p>
            </Link>
          ))}

          {categories.length === 0 ? (
            <div className="col-span-2 sm:col-span-4 rounded-2xl border border-iwanyu-border bg-white p-8 text-center">
              <div className="text-gray-400 mb-4">
                <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No categories available</h3>
              <p className="text-sm text-gray-600">Categories will appear here once products are added.</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

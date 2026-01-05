
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
    <section className="py-6 sm:py-8">
      <div className="container">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((category) => (
            <Link 
              key={category.id}
              to={`/category/${category.id}`}
              className="group overflow-hidden rounded-lg border border-iwanyu-border bg-white p-4 text-center shadow-subtle transition-all duration-300 hover:shadow-hover hover:-translate-y-1"
            >
              <div className="mb-3 flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-iwanyu-muted">
                <div className="text-3xl font-bold text-iwanyu-foreground">{titleFromSlug(category.id).slice(0, 1)}</div>
              </div>
              <h3 className="text-md font-medium text-iwanyu-foreground group-hover:text-iwanyu-primary">
                {category.name}
              </h3>
            </Link>
          ))}

          {categories.length === 0 ? (
            <div className="col-span-2 sm:col-span-4 rounded-lg border border-iwanyu-border bg-white p-4 text-center text-sm text-gray-600">
              No categories yet.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

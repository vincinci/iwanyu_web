import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useMarketplace } from '@/context/marketplace';
import { getNavCategoriesWithCounts } from '@/lib/categories';
import { ArrowRight } from 'lucide-react';

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
    <section className="border-b border-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="mb-6 flex justify-between items-end">
          <div>
              <h2 className="text-3xl font-black uppercase tracking-tighter text-black mb-1">Categories</h2>
              <p className="text-gray-500 font-bold uppercase text-xs tracking-wider">Explore our collection</p>
          </div>
          <Link to="/category/all" className="text-xs font-bold uppercase tracking-wider text-black hover:underline flex items-center gap-2">View All Categories <ArrowRight size={14} /></Link>
        </div>
        
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((category) => (
            <Link 
              key={category.id}
              to={`/category/${category.id}`}
              className="group relative border border-gray-200 bg-white p-6 text-center hover:border-iwanyu-primary hover:shadow-lg transition-all duration-300 rounded-xl"
            >
              <div className="mb-4 flex aspect-square mx-auto w-16 items-center justify-center bg-gray-50 group-hover:bg-iwanyu-primary/10 transition-colors rounded-full">
                 {/* Placeholder Icon */}
                 <span className="text-2xl font-black text-gray-900 group-hover:text-iwanyu-primary uppercase">
                     {category.name.charAt(0)}
                 </span>
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wide text-gray-900 group-hover:text-iwanyu-primary transition-colors">
                {category.name}
              </h3>
              <p className="text-xs text-gray-500 group-hover:text-gray-600 mt-1 transition-colors">{category.count} Products</p>
            </Link>
          ))}

          {categories.length === 0 ? (
            <div className="col-span-2 sm:col-span-4 border border-gray-200 p-8 text-center bg-gray-50 rounded-xl">
              <p className="text-sm font-bold uppercase text-gray-400">No categories found</p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
};

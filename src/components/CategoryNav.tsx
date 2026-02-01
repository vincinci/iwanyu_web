import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useMarketplace } from '@/context/marketplace';
import { getNavCategoriesWithCounts } from '@/lib/categories';
import { ArrowRight, Smartphone, Laptop, Shirt, Home, ShoppingBag, Sparkles, Dumbbell, Gamepad2, Watch, Heart } from 'lucide-react';

// Map category IDs to icons
const categoryIcons: Record<string, React.ReactNode> = {
  electronics: <Smartphone size={24} strokeWidth={1.5} />,
  phones: <Smartphone size={24} strokeWidth={1.5} />,
  computers: <Laptop size={24} strokeWidth={1.5} />,
  laptops: <Laptop size={24} strokeWidth={1.5} />,
  fashion: <Shirt size={24} strokeWidth={1.5} />,
  shoes: <ShoppingBag size={24} strokeWidth={1.5} />,
  bags: <ShoppingBag size={24} strokeWidth={1.5} />,
  home: <Home size={24} strokeWidth={1.5} />,
  kitchen: <Home size={24} strokeWidth={1.5} />,
  beauty: <Sparkles size={24} strokeWidth={1.5} />,
  health: <Heart size={24} strokeWidth={1.5} />,
  sports: <Dumbbell size={24} strokeWidth={1.5} />,
  gaming: <Gamepad2 size={24} strokeWidth={1.5} />,
  jewelry: <Watch size={24} strokeWidth={1.5} />,
};

export const CategoryNav = () => {
  const { products } = useMarketplace();

  const categories = useMemo(() => {
    return getNavCategoriesWithCounts(products).slice(0, 6);
  }, [products]);

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Shop by Category</h2>
          <Link 
            to="/category/all" 
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            View all
            <ArrowRight size={16} />
          </Link>
        </div>
        
        {/* Category Grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-4">
          {categories.map((category) => (
            <Link 
              key={category.id}
              to={`/category/${category.id}`}
              className="group flex flex-col items-center gap-3 rounded-2xl bg-gray-50 p-5 transition-all duration-200 hover:bg-gray-100"
            >
              {/* Icon */}
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm transition-all duration-200 group-hover:scale-110 group-hover:shadow-md">
                {categoryIcons[category.id] || <ShoppingBag size={24} strokeWidth={1.5} />}
              </div>
              
              {/* Label */}
              <span className="text-center text-sm font-medium text-gray-900">
                {category.name}
              </span>
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="rounded-2xl bg-gray-50 py-12 text-center">
            <p className="text-sm text-gray-500">No categories available</p>
          </div>
        )}
      </div>
    </section>
  );
};

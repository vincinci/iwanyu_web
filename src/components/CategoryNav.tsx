import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useMarketplace } from '@/context/marketplace';
import { useLanguage } from '@/context/languageContext';
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
  const { t } = useLanguage();

  const categories = useMemo(() => {
    return getNavCategoriesWithCounts(products).slice(0, 6);
  }, [products]);

  return (
    <section className="py-10">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">{t("category.shopBy")}</h2>
          <Link 
            to="/category/all" 
            className="flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-black transition-colors"
          >
            {t("category.viewAll")}
            <ArrowRight size={16} />
          </Link>
        </div>
        
        {/* Category Row */}
        <div className="flex gap-3 overflow-x-auto scroll-hide pb-2">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/category/${category.id}`}
              className="group inline-flex flex-none items-center gap-3 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm transition-all hover:shadow-md"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-gray-700">
                {categoryIcons[category.id] || <ShoppingBag size={16} strokeWidth={1.5} />}
              </span>
              {category.name}
            </Link>
          ))}
        </div>

        {categories.length === 0 && (
          <div className="rounded-2xl bg-gray-50 py-12 text-center">
            <p className="text-sm text-gray-500">{t("category.none")}</p>
          </div>
        )}
      </div>
    </section>
  );
};

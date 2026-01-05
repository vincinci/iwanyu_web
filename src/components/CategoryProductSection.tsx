import { Link } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { ProductCard } from '@/components/ProductCard';
import { Product } from '@/types/product';
import { useRef } from 'react';

interface CategoryProductSectionProps {
  categoryName: string;
  products: Product[];
  viewAllLink?: string;
}

export const CategoryProductSection = ({
  categoryName,
  products,
  viewAllLink,
}: CategoryProductSectionProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 300;
      const newScrollLeft = scrollContainerRef.current.scrollLeft + (direction === 'right' ? scrollAmount : -scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  if (products.length === 0) return null;

  return (
    <section className="py-6 sm:py-8">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-iwanyu-foreground sm:text-2xl">{categoryName}</h2>
          <div className="flex items-center gap-2">
            {viewAllLink && (
              <Link
                to={viewAllLink}
                className="flex items-center text-sm font-medium text-iwanyu-primary hover:underline"
              >
                View all
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
        </div>

        <div className="relative group">
          {/* Left scroll button */}
          <button
            onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
            aria-label="Scroll left"
          >
            <ChevronLeft size={24} className="text-iwanyu-foreground" />
          </button>

          {/* Product grid with horizontal scroll - 5 columns */}
          <div
            ref={scrollContainerRef}
            className="overflow-x-auto scrollbar-hide scroll-smooth pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="inline-flex gap-4">
              {products.map((product) => (
                <div key={product.id} className="w-[calc(20%-12.8px)] min-w-[180px] sm:min-w-[200px] lg:min-w-[220px] flex-shrink-0">
                  <ProductCard product={product} />
                </div>
              ))}
            </div>
          </div>

          {/* Right scroll button */}
          <button
            onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 bg-white/90 p-2 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white disabled:opacity-0"
            aria-label="Scroll right"
          >
            <ChevronRight size={24} className="text-iwanyu-foreground" />
          </button>
        </div>
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
};

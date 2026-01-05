
import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { CategoryNav } from "@/components/CategoryNav";
import { CategoryProductSection } from "@/components/CategoryProductSection";
import { Footer } from "@/components/Footer";
import { useMarketplace } from "@/context/marketplace";
import { CATEGORIES } from "@/lib/categories";
import { slugifyCategory } from "@/lib/categories";

const Index = () => {
  const { products } = useMarketplace();

  // Group products by category
  const productsByCategory = CATEGORIES.map(category => {
    const categoryProducts = products.filter(
      product => product.category.toLowerCase() === category.name.toLowerCase()
    );
    return {
      category,
      products: categoryProducts
    };
  }).filter(group => group.products.length > 0); // Only show categories that have products

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      <main className="flex-1">
        <HeroSection />
        
        <CategoryNav />
        
        <div className="container py-4">
          <div className="rounded-lg border border-iwanyu-border bg-gradient-to-r from-yellow-50 to-amber-50 p-6 shadow-subtle">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <span className="inline-block rounded bg-iwanyu-primary/10 px-2.5 py-1 text-xs font-medium text-iwanyu-primary">
                  Limited Offer
                </span>
                <h2 className="mt-2 text-2xl font-bold text-iwanyu-foreground">
                  Get free shipping on your first order
                </h2>
                <p className="mt-1 text-gray-600">
                  Sign up for an iwanyu account and get free shipping on your first order.
                </p>
              </div>
              <div className="flex items-center justify-center md:justify-end">
                <a 
                  href="/account" 
                  className="rounded-full bg-iwanyu-primary px-6 py-2.5 text-center text-sm font-medium text-white shadow-md transition-colors hover:bg-iwanyu-primary/90"
                >
                  Sign Up Now
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Display all products grouped by category with horizontal scroll */}
        {productsByCategory.map(({ category, products: categoryProducts }) => (
          <CategoryProductSection
            key={category.id}
            categoryName={category.name}
            products={categoryProducts}
            viewAllLink={`/category/${slugifyCategory(category.name)}`}
          />
        ))}

        {/* Show message if no products */}
        {products.length === 0 && (
          <div className="container py-12 text-center">
            <p className="text-gray-500">No products available at the moment.</p>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
};

export default Index;

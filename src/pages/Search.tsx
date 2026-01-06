import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { useMarketplace } from "@/context/marketplace";
import { Button } from "@/components/ui/button";
import { Search as SearchIcon } from "lucide-react";

const Search = () => {
  const [searchParams] = useSearchParams();
  const { products } = useMarketplace();
  const [query, setQuery] = useState(searchParams.get("q") || "");

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  const searchResults = products.filter(product => {
    const searchTerm = query.toLowerCase();
    return (
      product.title.toLowerCase().includes(searchTerm) ||
      product.description?.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm)
    );
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      <main className="flex-1">
        <div className="container py-12">
          {/* Search Header */}
          <div className="mb-10">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Search Results</h1>
            {query && (
              <p className="text-lg text-gray-600">
                Showing {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for <span className="font-semibold text-iwanyu-primary">"{query}"</span>
              </p>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
              {searchResults.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                <SearchIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {query ? `No results found for "${query}"` : "Enter a search term"}
              </h3>
              <p className="text-gray-600 mb-6">
                {query 
                  ? "Try different keywords or browse our categories"
                  : "Use the search bar above to find products"
                }
              </p>
              <Button onClick={() => window.location.href = "/"}>Browse All Products</Button>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Search;

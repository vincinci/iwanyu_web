import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ProductCard } from "@/components/ProductCard";
import { useMarketplace } from "@/context/marketplace";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Search as SearchIcon, Filter, SortAsc, X, Check } from "lucide-react";
import { formatMoney } from "@/lib/money";

const Search = () => {
  const [searchParams] = useSearchParams();
  const { products } = useMarketplace();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [sortBy, setSortBy] = useState("relevance");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterInStock, setFilterInStock] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Price range state
  const priceRange = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 100000 };
    const prices = products.map(p => p.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices)
    };
  }, [products]);

  const [priceFilter, setPriceFilter] = useState<[number, number]>([priceRange.min, priceRange.max]);

  useEffect(() => {
    setPriceFilter([priceRange.min, priceRange.max]);
  }, [priceRange]);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Get unique categories for filtering
  const categories = [...new Set(products.map(p => p.category).filter(Boolean))];

  const searchResults = products.filter(product => {
    // Search filter
    let matchesSearch = true;
    if (query.trim()) {
      const searchTerm = query.toLowerCase().trim();
      const searchWords = searchTerm.split(/\s+/);
      
      // Check if any search word matches any product field
      matchesSearch = searchWords.some(word => 
        product.title.toLowerCase().includes(word) ||
        product.description?.toLowerCase().includes(word) ||
        product.category?.toLowerCase().includes(word) ||
        product.badges?.some(badge => badge.toLowerCase().includes(word))
      );
    }
    
    // Category filter
    const matchesCategory = filterCategory === "all" || product.category === filterCategory;
    
    // Price range filter
    const matchesPrice = product.price >= priceFilter[0] && product.price <= priceFilter[1];
    
    // In stock filter
    const matchesStock = !filterInStock || product.inStock;
    
    return matchesSearch && matchesCategory && matchesPrice && matchesStock;
  });

  // Count active filters
  const activeFiltersCount = [
    filterCategory !== "all",
    filterInStock,
    priceFilter[0] > priceRange.min || priceFilter[1] < priceRange.max
  ].filter(Boolean).length;

  // Sort results
  const sortedResults = [...searchResults].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "name":
        return a.title.localeCompare(b.title);
      default: { // relevance
        if (!query.trim()) return 0;
        const aScore = a.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 1;
        const bScore = b.title.toLowerCase().includes(query.toLowerCase()) ? 2 : 1;
        return bScore - aScore;
      }
    }
  });

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Header />
      
      <main className="flex-1">
        <div className="container py-12">
          {/* Search Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-3">Search Results</h1>
            {query && (
              <p className="text-lg text-gray-600">
                Showing {sortedResults.length} result{sortedResults.length !== 1 ? 's' : ''} for <span className="font-semibold text-iwanyu-primary">"{query}"</span>
              </p>
            )}
          </div>

          {/* Filters and Sorting */}
          {(query || products.length > 0) && (
            <div className="mb-8 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant={showFilters ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="rounded-full"
                  >
                    <Filter size={16} className="mr-2" />
                    Filters
                    {activeFiltersCount > 0 && (
                      <span className="ml-2 px-2 py-0.5 bg-iwanyu-primary text-white text-xs rounded-full">
                        {activeFiltersCount}
                      </span>
                    )}
                  </Button>
                  
                  <Select value={filterCategory} onValueChange={setFilterCategory}>
                    <SelectTrigger className="w-40 rounded-full">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map(category => (
                        <SelectItem key={category} value={category!}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {activeFiltersCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterCategory("all");
                        setFilterInStock(false);
                        setPriceFilter([priceRange.min, priceRange.max]);
                      }}
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X size={14} className="mr-1" />
                      Clear filters
                    </Button>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <SortAsc size={16} className="text-gray-500" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44 rounded-full">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="name">Name A-Z</SelectItem>
                      <SelectItem value="price-low">Price: Low to High</SelectItem>
                      <SelectItem value="price-high">Price: High to Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Expanded Filters Panel */}
              {showFilters && (
                <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Price Range */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Price Range</h4>
                      <div className="space-y-4">
                        <Slider
                          value={priceFilter}
                          onValueChange={(value) => setPriceFilter(value as [number, number])}
                          min={priceRange.min}
                          max={priceRange.max}
                          step={1000}
                          className="w-full"
                        />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">{formatMoney(priceFilter[0])}</span>
                          <span className="text-gray-400">—</span>
                          <span className="text-gray-600">{formatMoney(priceFilter[1])}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stock Status */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Availability</h4>
                      <button
                        onClick={() => setFilterInStock(!filterInStock)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                          filterInStock
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {filterInStock && <Check size={16} />}
                        In Stock Only
                      </button>
                    </div>

                    {/* Quick Stats */}
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-3">Results</h4>
                      <p className="text-gray-600">
                        Showing <span className="font-semibold text-gray-900">{sortedResults.length}</span> of{" "}
                        <span className="font-semibold text-gray-900">{products.length}</span> products
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Search Results */}
          {query ? (
            sortedResults.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                  {sortedResults.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                  <SearchIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  No results found for "{query}"
                </h3>
                <p className="text-gray-600 mb-8 max-w-md mx-auto">
                  We couldn't find any products matching your search. Try different keywords or browse our popular categories below.
                </p>
                
                {/* Suggested searches */}
                <div className="mb-8">
                  <h4 className="text-sm font-medium text-gray-500 mb-3">Try searching for:</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {['shirts', 'shoes', 'accessories', 'electronics', 'books', 'beauty'].map(suggestion => (
                      <Button
                        key={suggestion}
                        variant="outline"
                        size="sm"
                        onClick={() => window.location.href = `/search?q=${suggestion}`}
                        className="capitalize hover:bg-iwanyu-primary hover:text-white"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <Button onClick={() => window.location.href = "/"}>Browse All Products</Button>
              </div>
            )
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-iwanyu-primary/10 mb-4">
                <SearchIcon className="w-8 h-8 text-iwanyu-primary" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Find your perfect product
              </h3>
              <p className="text-gray-600 mb-8 max-w-md mx-auto">
                Use the search bar above to find products by name, category, or brand.
              </p>
              
              {/* Show all products when no search query */}
              <div className="text-left">
                <h4 className="text-lg font-semibold text-gray-900 mb-6">All Products</h4>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8">
                  {products.slice(0, 24).map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {products.length > 24 && (
                  <div className="text-center mt-8">
                    <Button onClick={() => window.location.href = "/"}>View All {products.length} Products</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Search;

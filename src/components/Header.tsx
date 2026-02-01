import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingBag, UserCircle2, X, Heart, Truck, Sparkles, XCircle, Settings, LogOut, ChevronDown, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/cart';
import { useAuth } from '@/context/auth';
import { useMarketplace } from '@/context/marketplace';
import { useWishlist } from '@/context/wishlist';
import { getNavCategoriesWithCounts } from '@/lib/categories';

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();
  const { products } = useMarketplace();
  const { count: wishlistCount } = useWishlist();
  const navigate = useNavigate();

  const categories = useMemo(() => {
    return getNavCategoriesWithCounts(products).map(({ id, name }) => ({ id, name }));
  }, [products]);

  // Get search suggestions based on current query
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    const suggestions = new Set<string>();
    
    // Add matching product titles
    products.forEach(product => {
      if (product.title.toLowerCase().includes(query) && suggestions.size < 5) {
        suggestions.add(product.title);
      }
    });
    
    // Add matching categories
    categories.forEach(category => {
      if (category.name.toLowerCase().includes(query) && suggestions.size < 8) {
        suggestions.add(category.name);
      }
    });
    
    return Array.from(suggestions).slice(0, 6);
  }, [searchQuery, products, categories]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSearchSuggestions(e.target.value.length > 1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSearchSuggestions(false);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    navigate('/search');
    setShowSearchSuggestions(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    setShowSearchSuggestions(false);
    navigate(`/search?q=${encodeURIComponent(suggestion)}`);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-100">
      {/* Top utility bar - minimal */}
      <div className="hidden md:block border-b border-gray-50">
        <div className="container mx-auto px-4 py-1.5">
          <div className="flex items-center justify-between text-[11px] text-gray-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-green-500"></span>
                Free shipping over $50
              </span>
              <span className="text-gray-300">·</span>
              <span>30-day returns</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/help" className="hover:text-gray-900 transition-colors">Help</Link>
              <Link to="/track-order" className="hover:text-gray-900 transition-colors">Track Order</Link>
              <Link to="/sell" className="text-amber-600 hover:text-amber-700 font-medium transition-colors">Sell on iwanyu</Link>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-background">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <img
                src="/logo.png"
                alt="iwanyu"
                className="h-14 w-auto object-contain"
                loading="eager"
              />
              <span className="sr-only">iwanyu</span>
            </Link>
            
            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-xl mx-auto relative">
              <form onSubmit={handleSearchSubmit} className="w-full relative flex">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search products, brands, categories..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.length > 1 && setShowSearchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                    className="h-11 w-full rounded-l-full border-2 border-gray-200 bg-gray-50 pl-10 pr-10 text-sm placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
                <Button
                    type="submit"
                    className="h-11 px-6 rounded-r-full bg-amber-400 hover:bg-amber-500 text-black font-medium"
                  >
                    Search
                  </Button>
              </form>
              
              {/* Search Suggestions */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-background border border-border shadow-md z-50 rounded-md overflow-hidden">
                  <div className="p-0">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-3 py-2.5 text-sm text-foreground hover:bg-muted border-b border-border last:border-0 flex items-center gap-2"
                      >
                        <Search size={14} className="text-muted-foreground" />
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-6 ml-auto">
              
              <Link
                to="/orders"
                className="flex flex-col items-center justify-center group"
              >
                <Truck size={22} className="text-foreground/80 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                <span className="text-[11px] text-muted-foreground mt-1">Orders</span>
              </Link>

              <Link
                to="/wishlist"
                className="relative flex flex-col items-center justify-center group"
              >
                <div className="relative">
                  <Heart size={22} className="text-foreground/80 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">Wishlist</span>
              </Link>

              {user ? (
                <div className="relative group/profile">
                  <button className="flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-foreground font-medium text-sm">
                      {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-xs text-muted-foreground">Account</span>
                      <span className="text-sm font-medium text-foreground leading-none">{user.name?.split(' ')[0] ?? "User"}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400 hidden lg:block" />
                  </button>
                  
                  {/* Profile Dropdown */}
                  <div className="absolute right-0 top-full pt-2 w-64 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all z-50">
                    <div className="bg-background border border-border shadow-md rounded-lg overflow-hidden">
                      <div className="p-4 border-b border-border">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted text-foreground font-medium">
                            {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-foreground truncate">{user.name ?? "User"}</div>
                            <div className="text-xs text-muted-foreground truncate">{user.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        {(user.role === 'seller' || user.role === 'admin') && (
                          <Link to="/seller" className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm font-medium border-b border-border mb-2">
                            <Sparkles size={16} className="text-iwanyu-primary" />
                            <span>Seller Dashboard</span>
                          </Link>
                        )}
                        {user.role === 'admin' && (
                          <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm font-medium border-b border-border mb-2">
                            <Shield size={16} className="text-iwanyu-primary" />
                            <span>Admin Dashboard</span>
                          </Link>
                        )}
                        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm font-medium">
                          <Settings size={16} className="text-muted-foreground" />
                          <span>Account Settings</span>
                        </Link>
                        <Link to="/orders" className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm font-medium">
                          <Truck size={16} className="text-muted-foreground" />
                          <span>My Orders</span>
                        </Link>
                        <Link to="/wishlist" className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted rounded-md transition-colors text-sm font-medium">
                          <Heart size={16} className="text-muted-foreground" />
                          <span>My Wishlist</span>
                        </Link>
                        <hr className="my-2 border-border" />
                        <button 
                          onClick={async () => {
                            await signOut();
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-md transition-colors text-red-600 text-sm font-medium"
                        >
                          <LogOut size={16} />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex flex-col items-center justify-center group"
                >
                  <UserCircle2 size={22} className="text-foreground/80 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                  <span className="text-[11px] text-muted-foreground mt-1">Log in</span>
                </Link>
              )}

              <Link
                to="/cart"
                className="relative flex flex-col items-center justify-center group ml-2"
              >
                <div className="relative">
                  <ShoppingBag size={22} className="text-foreground/80 group-hover:text-foreground transition-colors" strokeWidth={1.5} />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-muted-foreground mt-1">Cart</span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-4 md:hidden ml-auto">
              <Link to="/cart" className="relative text-black">
                <ShoppingBag size={24} strokeWidth={1.5} />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-black">
                    {itemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={toggleMobileMenu}
                className="text-black"
                aria-label="Toggle menu"
              >
                <Menu size={24} strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Search Bar - Mobile Only */}
          <div className="mt-4 md:hidden">
            <form onSubmit={handleSearchSubmit} className="flex">
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-10 w-full rounded-l-md border border-border bg-background px-3 text-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <Button type="submit" className="h-10 rounded-r-md w-12 px-0 flex items-center justify-center">
                <Search size={18} />
              </Button>
            </form>
          </div>
        </div>

        {/* Categories Nav */}
        <div className="hidden md:block border-t border-gray-100">
          <div className="container mx-auto px-4">
            <nav className="flex items-center justify-center gap-1 py-1">
              <Link to="/deals" className="px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-full transition-colors flex items-center gap-1.5">
                <Sparkles size={14} /> Hot Deals
              </Link>
              <Link to="/category/new-arrivals" className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-full transition-colors">New In</Link>
              {categories.slice(0, 5).map(cat => (
                <Link key={cat.id} to={`/category/${cat.id}`} className="px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 rounded-full transition-colors">
                  {cat.name}
                </Link>
              ))}
              <Link to="/category/all" className="px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700 rounded-full transition-colors">All Categories</Link>
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={toggleMobileMenu}>
          <div className="absolute right-0 top-0 h-full w-[85%] max-w-[320px] bg-background shadow-xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-border">
              <span className="font-medium text-foreground">Menu</span>
              <button onClick={toggleMobileMenu} className="p-2 text-muted-foreground">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
                {user ? (
                    <div className="rounded-md border border-border bg-muted/40 p-4 mb-4">
                        <div className="font-medium text-foreground">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button variant="outline" asChild className="w-full rounded-md">
                            <Link to="/login">Log In</Link>
                        </Button>
                        <Button asChild className="w-full rounded-md">
                            <Link to="/signup">Sign Up</Link>
                        </Button>
                    </div>
                )}

                <div className="space-y-1">
                  <div className="text-xs font-medium text-muted-foreground mb-2">Shop</div>
                  <Link to="/deals" onClick={toggleMobileMenu} className="block py-2 text-sm text-foreground">Deals</Link>
                    {categories.map(cat => (
                    <Link key={cat.id} to={`/category/${cat.id}`} onClick={toggleMobileMenu} className="block py-2 text-sm text-foreground">
                            {cat.name}
                        </Link>
                    ))}
                </div>

                <div className="border-t border-border pt-4 space-y-1">
                    <div className="text-xs font-medium text-muted-foreground mb-2">Account</div>
                    <Link to="/orders" onClick={toggleMobileMenu} className="block py-2 text-sm text-foreground">Orders</Link>
                    <Link to="/wishlist" onClick={toggleMobileMenu} className="block py-2 text-sm text-foreground">Wishlist</Link>
                    <Link to="/account" onClick={toggleMobileMenu} className="block py-2 text-sm text-foreground">Profile</Link>
                    {user && (
                         <button 
                           onClick={async () => { 
                             await signOut(); 
                             toggleMobileMenu(); 
                             window.location.href = '/';
                           }} 
                           className="block w-full text-left py-2 text-sm text-red-600 mt-2"
                         >
                           Sign Out
                         </button>
                    )}
                </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

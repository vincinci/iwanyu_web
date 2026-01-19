import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, X, Heart, Package, Sparkles, XCircle, Settings, LogOut, ChevronDown } from 'lucide-react';
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
    <header className="sticky top-0 z-50 w-full shadow-sm">
      {/* Top Banner - Light Style */}
      <div className="bg-gray-100 border-b border-gray-200 py-2.5">
        <div className="w-full px-4 container mx-auto">
          <div className="flex items-center justify-between text-gray-900 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-4">
               <span>Free Delivery on all orders over $50</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/help" className="hover:text-iwanyu-primary transition-colors">Help</Link>
              <Link to="/track-order" className="hover:text-iwanyu-primary transition-colors">Order Tracker</Link>
              <Link to="/sell" className="hover:text-iwanyu-primary transition-colors">Become a Seller</Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              {/* Adidas-style bold text logo */}
              <h1 className="text-3xl font-black tracking-tighter uppercase italic">IWANYU</h1>
            </Link>
            
            {/* Search Bar - AliExpress Style (Wide, detailed) */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-auto relative">
              <form onSubmit={handleSearchSubmit} className="w-full relative group flex gap-2">
                <div className="relative flex-1 flex">
                  <Input
                    type="text"
                    placeholder="I'm shopping for..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    onFocus={() => searchQuery.length > 1 && setShowSearchSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSearchSuggestions(false), 200)}
                    className="h-10 w-full rounded-lg border-2 border-gray-200 bg-white px-4 text-sm text-black placeholder:text-gray-400 focus-visible:ring-0 focus-visible:border-iwanyu-primary transition-all"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={handleClearSearch}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <XCircle size={16} />
                    </button>
                  )}
                </div>
                <Button
                    type="submit"
                    className="h-10 px-8 rounded-lg bg-iwanyu-primary text-black font-bold hover:bg-iwanyu-primary/90 transition-all uppercase tracking-wide"
                  >
                    Search
                  </Button>
              </form>
              
              {/* Search Suggestions */}
              {showSearchSuggestions && searchSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 shadow-xl z-50 rounded-lg overflow-hidden">
                  <div className="p-0">
                    {searchSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="w-full text-left px-4 py-3 text-sm font-medium text-gray-900 hover:bg-gray-100 border-b border-gray-100 last:border-0 flex items-center gap-2"
                      >
                        <Search size={14} className="text-gray-400" />
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
                <Package size={20} className="text-black group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                <span className="text-[10px] uppercase font-bold text-black mt-1">Orders</span>
              </Link>

              <Link
                to="/wishlist"
                className="relative flex flex-col items-center justify-center group"
              >
                <div className="relative">
                  <Heart size={20} className="text-black group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  {wishlistCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-sm bg-iwanyu-primary text-[10px] font-bold text-black">
                      {wishlistCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase font-bold text-black mt-1">Wishlist</span>
              </Link>

              {user ? (
                <div className="relative group/profile">
                  <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-iwanyu-primary text-black font-bold text-sm">
                      {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U'}
                    </div>
                    <div className="hidden lg:flex flex-col items-start">
                      <span className="text-xs text-gray-500">Hello,</span>
                      <span className="text-sm font-bold text-black leading-none">{user.name?.split(' ')[0] ?? "User"}</span>
                    </div>
                    <ChevronDown size={16} className="text-gray-400 hidden lg:block" />
                  </button>
                  
                  {/* Profile Dropdown */}
                  <div className="absolute right-0 top-full pt-2 w-64 opacity-0 invisible group-hover/profile:opacity-100 group-hover/profile:visible transition-all z-50">
                    <div className="bg-white border border-gray-200 shadow-xl rounded-xl overflow-hidden">
                      <div className="p-4 border-b border-gray-100 bg-gradient-to-br from-iwanyu-primary/10 to-iwanyu-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-iwanyu-primary text-black font-bold text-lg">
                            {user.name?.charAt(0).toUpperCase() ?? user.email?.charAt(0).toUpperCase() ?? 'U'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-900 truncate">{user.name ?? "User"}</div>
                            <div className="text-xs text-gray-500 truncate">{user.email}</div>
                          </div>
                        </div>
                      </div>
                      <div className="p-2">
                        {user.role === 'seller' && (
                          <Link to="/seller" className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium border-b border-gray-100 mb-2">
                            <Sparkles size={16} className="text-iwanyu-primary" />
                            <span>Seller Dashboard</span>
                          </Link>
                        )}
                        <Link to="/account" className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium">
                          <Settings size={16} className="text-gray-400" />
                          <span>Account Settings</span>
                        </Link>
                        <Link to="/orders" className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium">
                          <Package size={16} className="text-gray-400" />
                          <span>My Orders</span>
                        </Link>
                        <Link to="/wishlist" className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 rounded-lg transition-colors text-sm font-medium">
                          <Heart size={16} className="text-gray-400" />
                          <span>My Wishlist</span>
                        </Link>
                        <hr className="my-2 border-gray-100" />
                        <button 
                          onClick={async () => {
                            await signOut();
                            window.location.href = '/';
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-50 rounded-lg transition-colors text-red-600 text-sm font-medium"
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
                  <User size={20} className="text-black group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  <span className="text-[10px] uppercase font-bold text-black mt-1">Log in</span>
                </Link>
              )}

              <Link
                to="/cart"
                className="relative flex flex-col items-center justify-center group ml-2"
              >
                <div className="relative">
                  <ShoppingCart size={20} className="text-black group-hover:scale-110 transition-transform" strokeWidth={1.5} />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-sm bg-iwanyu-primary text-[10px] font-bold text-black">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] uppercase font-bold text-black mt-1">Cart</span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-4 md:hidden ml-auto">
              <Link to="/cart" className="relative text-black">
                <ShoppingCart size={24} strokeWidth={1.5} />
                {itemCount > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-sm bg-iwanyu-primary text-[10px] font-bold text-black">
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
                className="h-10 w-full rounded-l-lg border border-black bg-white px-3 text-sm focus-visible:ring-0"
              />
              <Button type="submit" className="h-10 rounded-r-lg bg-black text-white w-12 px-0 flex items-center justify-center">
                <Search size={18} />
              </Button>
            </form>
          </div>
        </div>

        {/* Categories Bar - Adidas Style (Clean Links) */}
        <div className="border-t border-gray-100 bg-white hidden md:block">
            <div className="container mx-auto px-4">
                <div className="flex items-center justify-center gap-8 py-3">
                    <Link to="/category/new-arrivals" className="text-xs font-bold uppercase tracking-wider hover:underline underline-offset-4">New Arrivals</Link>
                    <Link to="/deals" className="text-xs font-bold uppercase tracking-wider text-iwanyu-primary hover:brightness-110 flex items-center gap-1">
                        <Sparkles size={12} className="fill-current" /> Deals
                    </Link>
                    {categories.slice(0, 8).map(cat => (
                        <Link key={cat.id} to={`/category/${cat.id}`} className="text-xs font-bold uppercase tracking-wider hover:underline underline-offset-4">
                            {cat.name}
                        </Link>
                    ))}
                     <Link to="/category/all" className="text-xs font-bold uppercase tracking-wider hover:underline underline-offset-4">See All</Link>
                </div>
            </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={toggleMobileMenu}>
          <div className="absolute right-0 top-0 h-full w-[80%] max-w-[300px] bg-white shadow-2xl overflow-y-auto rounded-l-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 flex items-center justify-between border-b border-gray-100">
              <span className="font-bold text-lg uppercase">Menu</span>
              <button onClick={toggleMobileMenu} className="p-2 text-gray-500">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
                {user ? (
                    <div className="bg-gray-50 p-4 mb-4">
                        <div className="font-bold">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <Button variant="outline" asChild className="w-full rounded-lg border-black font-bold text-xs uppercase">
                            <Link to="/login">Log In</Link>
                        </Button>
                        <Button asChild className="w-full rounded-lg bg-black text-white font-bold text-xs uppercase">
                            <Link to="/signup">Sign Up</Link>
                        </Button>
                    </div>
                )}

                <div className="space-y-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Shop</div>
                    <Link to="/deals" onClick={toggleMobileMenu} className="block py-2 text-sm font-bold text-iwanyu-primary uppercase">Flash Deals</Link>
                    {categories.map(cat => (
                        <Link key={cat.id} to={`/category/${cat.id}`} onClick={toggleMobileMenu} className="block py-2 text-sm font-bold text-black uppercase">
                            {cat.name}
                        </Link>
                    ))}
                </div>

                <div className="border-t border-gray-100 pt-4 space-y-1">
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">My Account</div>
                    <Link to="/orders" onClick={toggleMobileMenu} className="block py-2 text-sm text-gray-700">Orders</Link>
                    <Link to="/wishlist" onClick={toggleMobileMenu} className="block py-2 text-sm text-gray-700">Wishlist</Link>
                    <Link to="/account" onClick={toggleMobileMenu} className="block py-2 text-sm text-gray-700">Profile</Link>
                    {user && (
                         <button 
                           onClick={async () => { 
                             await signOut(); 
                             toggleMobileMenu(); 
                             window.location.href = '/';
                           }} 
                           className="block w-full text-left py-2 text-sm text-iwanyu-primary mt-2"
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

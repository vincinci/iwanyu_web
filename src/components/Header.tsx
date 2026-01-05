import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, X, ChevronDown, Heart, Package, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCart } from '@/context/cart';
import { useAuth } from '@/context/auth';
import { useMarketplace } from '@/context/marketplace';
import { getNavCategoriesWithCounts } from '@/lib/categories';

export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { itemCount } = useCart();
  const { user, signOut } = useAuth();
  const { products } = useMarketplace();

  const categories = useMemo(() => {
    return getNavCategoriesWithCounts(products).map(({ id, name }) => ({ id, name }));
  }, [products]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search for:', searchQuery);
  };

  return (
    <header className="sticky top-0 z-50 w-full shadow-lg">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-iwanyu-primary via-iwanyu-primary-glow to-iwanyu-primary py-2">
        <div className="w-full px-4">
          <div className="flex items-center justify-center gap-2 text-iwanyu-dark">
            <Sparkles size={14} className="animate-pulse" />
            <p className="text-sm font-semibold tracking-tight">
              Secure checkout with Flutterwave
            </p>
            <Sparkles size={14} className="animate-pulse" />
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="w-full px-4 py-4">
          <div className="flex items-center gap-6 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 shrink-0 group">
              <img
                src="/logo.png"
                alt="iwanyu"
                className="h-20 w-auto md:h-24"
                loading="eager"
              />
            </Link>
            
            {/* Search Bar */}
            <div className="hidden md:flex flex-1">
              <form onSubmit={handleSearchSubmit} className="w-full relative group">
                <div className="relative">
                  <Search 
                    size={20} 
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-iwanyu-primary transition-colors" 
                  />
                  <Input
                    type="text"
                    placeholder="Search for products, brands and categories..."
                    value={searchQuery}
                    onChange={handleSearchChange}
                    className="h-12 w-full rounded-full border-2 border-gray-200 bg-gray-50 pl-12 pr-32 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-iwanyu-primary focus-visible:bg-white focus-visible:ring-0 focus-visible:ring-offset-0 transition-all"
                  />
                  <Button
                    type="submit"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-10 px-6 rounded-full bg-gradient-to-r from-iwanyu-primary to-orange-500 text-white font-semibold hover:brightness-110 transition-all shadow-md hover:shadow-lg"
                  >
                    Search
                  </Button>
                </div>
              </form>
            </div>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              {user ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 transition-all">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name ?? "User"} className="h-7 w-7 rounded-full" />
                  ) : (
                    <User size={22} className="text-gray-600" />
                  )}
                  <div className="hidden lg:block">
                    <div className="text-xs text-gray-500 leading-tight">Signed in</div>
                    <div className="text-sm font-semibold text-gray-900 leading-tight line-clamp-1">{user.name ?? user.email ?? "Account"}</div>
                  </div>
                  <Button
                    variant="outline"
                    className="rounded-full ml-2"
                    onClick={() => void signOut()}
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <Link
                  to="/login"
                  className="flex flex-col items-center justify-center px-3 py-2 rounded-lg hover:bg-gray-50 transition-all group"
                >
                  <User size={24} className="text-gray-600 group-hover:text-iwanyu-primary transition-colors" />
                  <span className="text-xs font-medium text-gray-700 mt-0.5">Sign in</span>
                </Link>
              )}

              {user ? (
                <Link
                  to="/account"
                  className="flex flex-col items-center justify-center px-3 py-2 rounded-lg hover:bg-gray-50 transition-all group"
                >
                  <User size={24} className="text-gray-600 group-hover:text-iwanyu-primary transition-colors" />
                  <span className="text-xs font-medium text-gray-700 mt-0.5">Account</span>
                </Link>
              ) : null}

              <Link
                to="/orders"
                className="flex flex-col items-center justify-center px-3 py-2 rounded-lg hover:bg-gray-50 transition-all group"
              >
                <Package size={24} className="text-gray-600 group-hover:text-iwanyu-primary transition-colors" />
                <span className="text-xs font-medium text-gray-700 mt-0.5">Orders</span>
              </Link>

              <Link
                to="/wishlist"
                className="relative flex flex-col items-center justify-center px-3 py-2 rounded-lg hover:bg-gray-50 transition-all group"
              >
                <Heart size={24} className="text-gray-600 group-hover:text-red-500 transition-colors" />
                <span className="text-xs font-medium text-gray-700 mt-0.5">Wishlist</span>
              </Link>

              <Link
                to="/cart"
                className="relative flex flex-col items-center justify-center px-4 py-2 rounded-lg bg-iwanyu-primary/5 hover:bg-iwanyu-primary/10 transition-all group ml-2"
              >
                <div className="relative">
                  <ShoppingCart size={24} className="text-iwanyu-primary" />
                  {itemCount > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                      {itemCount}
                    </span>
                  )}
                </div>
                <span className="text-xs font-semibold text-iwanyu-primary mt-0.5">Cart</span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-3 md:hidden ml-auto">
              <button className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <Search size={22} className="text-gray-600" />
              </button>
              <Link to="/cart" className="relative p-2 rounded-lg hover:bg-gray-50 transition-colors">
                <ShoppingCart size={22} className="text-gray-600" />
                {itemCount > 0 && (
                  <span className="absolute right-0 top-0 flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-md">
                    {itemCount}
                  </span>
                )}
              </Link>
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                aria-label="Toggle menu"
              >
                <Menu size={24} />
              </button>
            </div>
          </div>

          {/* Search Bar - Mobile Only */}
          <div className="mt-4 md:hidden">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search 
                size={18} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" 
              />
              <Input
                type="text"
                placeholder="Search iwanyu marketplace"
                value={searchQuery}
                onChange={handleSearchChange}
                className="h-11 w-full rounded-full border-2 border-gray-200 bg-gray-50 pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus-visible:border-iwanyu-primary focus-visible:bg-white focus-visible:ring-0"
              />
            </form>
          </div>
        </div>
      </div>

      {/* Secondary Nav */}
      <nav className="bg-gray-50 border-b border-gray-200">
        <div className="w-full hidden px-4 md:block">
          <ul className="flex items-center gap-1 text-sm py-2 overflow-x-auto">
            <li>
              <button className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-700 hover:text-gray-900 hover:bg-white transition-all font-medium shadow-sm hover:shadow">
                <Menu size={16} />
                <span>Categories</span>
                <ChevronDown size={14} />
              </button>
            </li>
            {categories.slice(0, 6).map((category) => (
              <li key={category.id}>
                <Link
                  to={`/category/${category.id}`}
                  className="block px-4 py-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-white transition-all font-medium"
                >
                  {category.name}
                </Link>
              </li>
            ))}
            <li className="ml-auto">
              <Link
                to="/deals"
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-600 hover:to-orange-600 transition-all font-semibold shadow-md hover:shadow-lg"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Hot Deals
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex animate-fade-in md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={toggleMobileMenu}
          ></div>
          <div className="relative h-full w-4/5 max-w-sm animate-slide-in-right bg-white shadow-2xl">
            {/* Mobile Menu Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-iwanyu-primary to-orange-500 p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur">
                  {user?.picture ? (
                    <img src={user.picture} alt={user.name ?? "User"} className="h-10 w-10 rounded-full" />
                  ) : (
                    <User size={24} className="text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">{user ? (user.name ?? "Welcome!") : "Welcome!"}</h2>
                  <p className="text-sm text-white/80">{user ? (user.email ?? "Signed in") : "Sign in to continue"}</p>
                </div>
              </div>
              <button
                onClick={toggleMobileMenu}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close menu"
              >
                <X size={24} />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <nav className="h-[calc(100%-96px)] overflow-y-auto">
              <div className="p-6">
                <div className="mb-6 flex gap-3">
                  {user ? (
                    <Button
                      variant="outline"
                      className="w-full rounded-full"
                      onClick={() => {
                        signOut();
                        toggleMobileMenu();
                      }}
                    >
                      Sign out
                    </Button>
                  ) : (
                    <Link
                      to="/login"
                      className="w-full"
                      onClick={toggleMobileMenu}
                    >
                      <Button className="w-full rounded-full bg-white text-iwanyu-primary hover:bg-white/90">
                        Sign in
                      </Button>
                    </Link>
                  )}
                </div>

                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
                  Categories
                </h3>
                <ul className="space-y-2">
                  {categories.map((category) => (
                    <li key={category.id}>
                      <Link
                        to={`/category/${category.id}`}
                        className="flex items-center justify-between py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-iwanyu-primary transition-all font-medium"
                        onClick={toggleMobileMenu}
                      >
                        <span>{category.name}</span>
                        <ChevronDown size={16} className="-rotate-90 text-gray-400" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border-t border-gray-200 mx-6" />

              <div className="p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">
                  Your Account
                </h3>
                <ul className="space-y-2">
                  {user ? (
                    <li>
                      <Link
                        to="/account"
                        className="flex items-center gap-3 py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-iwanyu-primary transition-all font-medium"
                        onClick={toggleMobileMenu}
                      >
                        <User size={20} className="text-gray-500" />
                        <span>Your Account</span>
                      </Link>
                    </li>
                  ) : null}
                  <li>
                    <Link
                      to="/orders"
                      className="flex items-center gap-3 py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-iwanyu-primary transition-all font-medium"
                      onClick={toggleMobileMenu}
                    >
                      <Package size={20} className="text-gray-500" />
                      <span>Your Orders</span>
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/wishlist"
                      className="flex items-center gap-3 py-3 px-4 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-iwanyu-primary transition-all font-medium"
                      onClick={toggleMobileMenu}
                    >
                      <Heart size={20} className="text-gray-500" />
                      <span>Your Wishlist</span>
                    </Link>
                  </li>
                </ul>
              </div>

              <div className="p-6">
                <Link
                  to="/deals"
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-lg bg-gradient-to-r from-red-500 to-orange-500 text-white font-semibold shadow-lg hover:shadow-xl transition-all"
                  onClick={toggleMobileMenu}
                >
                  <Sparkles size={18} />
                  <span>View Hot Deals</span>
                </Link>
              </div>
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};
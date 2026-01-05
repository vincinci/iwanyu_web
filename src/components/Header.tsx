import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Search, ShoppingCart, User, X, MapPin, ChevronDown, Heart } from 'lucide-react';
import { categories } from '@/data/products';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
export const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
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
  return <header className="sticky top-0 z-50 w-full">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-iwanyu-dark via-iwanyu-light to-iwanyu-dark py-1.5">
        <div className="container mx-auto px-4">
          <p className="text-center text-xs font-medium text-white/90 tracking-wide">
            Free shipping on orders over $50 · <span className="text-iwanyu-primary">Shop Now</span>
          </p>
        </div>
      </div>

      {/* Main Header */}
      <div className="bg-iwanyu-dark opacity-90 border-white">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center gap-4 lg:gap-8">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-1 shrink-0 group">
              <div className="relative">
                <span className="text-2xl font-black tracking-tight">
                  <span className="bg-gradient-to-r from-iwanyu-primary to-iwanyu-primary-glow bg-clip-text text-transparent">
                    iwanyu
                  </span>
                </span>
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-iwanyu-primary transition-all duration-300 group-hover:w-full" />
              </div>
              <span className="text-white/80 text-sm font-light">store</span>
            </Link>

            {/* Deliver To */}
            <button className="hidden lg:flex items-center gap-1 text-white/70 hover:text-white transition-colors group py-2 px-2 rounded-md hover:bg-white/5">
              <MapPin size={18} className="text-white/60 group-hover:text-iwanyu-primary transition-colors" />
              <div className="flex flex-col items-start text-xs">
                <span className="text-white/50">Deliver to</span>
                <span className="font-semibold text-white">New York 10001</span>
              </div>
            </button>

            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-3xl">
              <form onSubmit={handleSearchSubmit} className="w-full flex group">
                <div className="relative flex-1">
                  <Input type="text" placeholder="Search for products, brands and more..." value={searchQuery} onChange={handleSearchChange} className="h-11 w-full rounded-l-lg rounded-r-none border-0 bg-white pl-4 pr-4 text-sm text-iwanyu-foreground placeholder:text-gray-400 focus-visible:ring-2 focus-visible:ring-iwanyu-primary focus-visible:ring-offset-0" />
                </div>
                <Button type="submit" className="h-11 px-5 rounded-l-none rounded-r-lg bg-gradient-to-r from-iwanyu-primary to-iwanyu-primary-glow text-iwanyu-dark font-semibold hover:brightness-110 transition-all shadow-[0_0_20px_rgba(255,153,0,0.3)] hover:shadow-[0_0_25px_rgba(255,153,0,0.5)]">
                  <Search size={20} strokeWidth={2.5} />
                </Button>
              </form>
            </div>

            {/* Desktop Nav Items */}
            <div className="hidden md:flex items-center gap-1">
              <Link to="/account" className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all group">
                <User size={22} className="text-white/60 group-hover:text-iwanyu-primary transition-colors" />
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-white/50">Hello, Sign in</span>
                  <span className="text-xs font-semibold flex items-center gap-0.5">
                    Account <ChevronDown size={12} />
                  </span>
                </div>
              </Link>

              <Link to="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all group">
                <div className="flex flex-col items-start">
                  <span className="text-[10px] text-white/50">Returns</span>
                  <span className="text-xs font-semibold">& Orders</span>
                </div>
              </Link>

              <Link to="/wishlist" className="relative p-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all group">
                <Heart size={22} className="group-hover:text-red-400 transition-colors" />
              </Link>

              <Link to="/cart" className="relative flex items-center gap-1 px-3 py-2 rounded-lg text-white/80 hover:text-white hover:bg-white/5 transition-all group">
                <div className="relative">
                  <ShoppingCart size={26} className="group-hover:text-iwanyu-primary transition-colors" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-iwanyu-primary to-iwanyu-primary-glow text-[10px] font-bold text-iwanyu-dark shadow-lg">
                    0
                  </span>
                </div>
                <span className="text-xs font-semibold hidden lg:block">Cart</span>
              </Link>
            </div>

            {/* Mobile Menu Toggle */}
            <div className="flex items-center gap-3 md:hidden ml-auto">
              <Link to="/cart" className="relative p-2">
                <ShoppingCart size={24} className="text-white" />
                <span className="absolute right-0 top-0 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-iwanyu-primary to-iwanyu-primary-glow text-[10px] font-bold text-iwanyu-dark">
                  0
                </span>
              </Link>
              <button onClick={toggleMobileMenu} className="p-2 text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Toggle menu">
                <Menu size={24} />
              </button>
            </div>
          </div>

          {/* Search Bar - Mobile Only */}
          <div className="mt-3 md:hidden">
            <form onSubmit={handleSearchSubmit} className="flex">
              <Input type="text" placeholder="Search iwanyu store" value={searchQuery} onChange={handleSearchChange} className="h-10 flex-1 rounded-l-lg rounded-r-none border-0 bg-white text-iwanyu-foreground placeholder:text-gray-400" />
              <Button type="submit" className="h-10 px-4 rounded-l-none rounded-r-lg bg-gradient-to-r from-iwanyu-primary to-iwanyu-primary-glow text-iwanyu-dark font-semibold">
                <Search size={18} strokeWidth={2.5} />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* Secondary Nav */}
      <nav className="bg-iwanyu-light border-t border-white/5">
        <div className="container mx-auto hidden px-4 md:block">
          <ul className="flex items-center gap-1 text-sm py-1.5 overflow-x-auto">
            <li>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-white/90 hover:text-white hover:bg-white/10 transition-all font-medium">
                <Menu size={16} />
                <span>All</span>
              </button>
            </li>
            {categories.slice(0, 6).map(category => <li key={category.id}>
                <Link to={`/category/${category.id}`} className="block px-3 py-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10 transition-all text-sm">
                  {category.name}
                </Link>
              </li>)}
            <li>
              <Link to="/deals" className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-gradient-to-r from-iwanyu-primary/20 to-transparent text-iwanyu-primary hover:from-iwanyu-primary/30 transition-all font-semibold text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-iwanyu-primary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-iwanyu-primary"></span>
                </span>
                Today's Deals
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && <div className="fixed inset-0 z-50 flex animate-fade-in md:hidden">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={toggleMobileMenu}></div>
          <div className="relative h-full w-4/5 max-w-xs animate-slide-in-right bg-white shadow-2xl">
            {/* Mobile Menu Header */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-iwanyu-dark to-iwanyu-light p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10">
                <User size={22} className="text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-base font-semibold text-white">Hello, Sign In</h2>
                <p className="text-xs text-white/60">Welcome to iwanyu</p>
              </div>
              <button onClick={toggleMobileMenu} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors" aria-label="Close menu">
                <X size={22} />
              </button>
            </div>

            {/* Mobile Menu Content */}
            <nav className="h-[calc(100%-72px)] overflow-y-auto">
              <div className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-iwanyu-foreground/50 mb-3">
                  Shop By Department
                </h3>
                <ul className="space-y-1">
                  {categories.map(category => <li key={category.id}>
                      <Link to={`/category/${category.id}`} className="flex items-center justify-between py-2.5 px-3 rounded-lg text-iwanyu-foreground hover:bg-iwanyu-muted transition-colors" onClick={toggleMobileMenu}>
                        <span>{category.name}</span>
                        <ChevronDown size={16} className="-rotate-90 text-iwanyu-foreground/30" />
                      </Link>
                    </li>)}
                </ul>
              </div>

              <div className="border-t border-iwanyu-border mx-4" />

              <div className="p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-iwanyu-foreground/50 mb-3">
                  Your Account
                </h3>
                <ul className="space-y-1">
                  <li>
                    <Link to="/account" className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-iwanyu-foreground hover:bg-iwanyu-muted transition-colors" onClick={toggleMobileMenu}>
                      <User size={18} className="text-iwanyu-foreground/50" />
                      <span>Your Account</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/orders" className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-iwanyu-foreground hover:bg-iwanyu-muted transition-colors" onClick={toggleMobileMenu}>
                      <ShoppingCart size={18} className="text-iwanyu-foreground/50" />
                      <span>Your Orders</span>
                    </Link>
                  </li>
                  <li>
                    <Link to="/wishlist" className="flex items-center gap-3 py-2.5 px-3 rounded-lg text-iwanyu-foreground hover:bg-iwanyu-muted transition-colors" onClick={toggleMobileMenu}>
                      <Heart size={18} className="text-iwanyu-foreground/50" />
                      <span>Your Wishlist</span>
                    </Link>
                  </li>
                </ul>
              </div>
            </nav>
          </div>
        </div>}
    </header>;
};
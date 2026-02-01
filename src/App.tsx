import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, useEffect, useState } from "react";
import { HelmetProvider } from 'react-helmet-async';
import { useAuth } from "@/context/auth";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import Index from "./pages/Index";
const NotFound = lazy(() => import("./pages/NotFound"));
const Deals = lazy(() => import("./pages/Deals"));
const Search = lazy(() => import("./pages/Search"));
const CategoryPage = lazy(() => import("./pages/Category"));
const ProductPage = lazy(() => import("./pages/Product"));
const CartPage = lazy(() => import("./pages/Cart"));
const CheckoutPage = lazy(() => import("./pages/Checkout"));
const AccountPage = lazy(() => import("./pages/Account"));
const OrdersPage = lazy(() => import("./pages/Orders"));
const WishlistPage = lazy(() => import("./pages/Wishlist"));
const SellPage = lazy(() => import("./pages/Sell"));
const SellerDashboardPage = lazy(() => import("./pages/seller/SellerDashboard"));
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminVendorsPage = lazy(() => import("./pages/admin/AdminVendors"));
const AdminProductsPage = lazy(() => import("./pages/admin/AdminProducts"));
const AdminApplicationsPage = lazy(() => import("./pages/admin/AdminApplications"));
const StaticPage = lazy(() => import("./pages/StaticPage"));
const SellerProductsPage = lazy(() => import("./pages/seller/SellerProducts"));
const SellerNewProductPage = lazy(() => import("./pages/seller/SellerNewProduct"));
const SellerOrdersPage = lazy(() => import("./pages/seller/SellerOrders"));
const SellerPayoutsPage = lazy(() => import("./pages/seller/SellerPayouts"));
const SellerSettingsPage = lazy(() => import("./pages/seller/SellerSettings"));
import { CartProvider } from "./context/cart";
import { MarketplaceProvider } from "./context/marketplace";
import { AuthProvider } from "./context/auth";
import { WishlistProvider } from "@/context/wishlist";
import { RecentlyViewedProvider } from "@/context/recentlyViewed";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import LogoutPage from "./pages/Logout";
const VendorApplicationPage = lazy(() => import("./pages/VendorApplication"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfService"));
import RequireAuth from "./components/RequireAuth";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

function PageFallback() {
  return (
    <div className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-32">
      <div className="relative flex items-center justify-center">
        {/* Spinning ring */}
        <div className="absolute h-20 w-20 animate-spin rounded-full border-[3px] border-transparent border-t-amber-400 border-r-amber-400/30" />
        {/* Logo in center */}
        <img src="/logo.png" alt="iwanyu" className="h-12 w-12 object-contain rounded-full" />
      </div>
    </div>
  );
}

function withSuspense(node: JSX.Element) {
  return <Suspense fallback={<PageFallback />}>{node}</Suspense>;
}

const AppContent = () => {
  const { user, isReady } = useAuth();
  const supabase = getSupabaseClient();
  const [showProfileCompletion, setShowProfileCompletion] = useState(false);
  const [profileCheckDone, setProfileCheckDone] = useState(false);

  useEffect(() => {
    if (!user || !supabase || !isReady || profileCheckDone) return;

    const checkProfileCompletion = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('profile_completed, full_name')
          .eq('id', user.id)
          .single();

        // Show profile completion if user has no profile or incomplete profile
        const needsCompletion = !data || !data.profile_completed || !data.full_name?.trim();
        setShowProfileCompletion(needsCompletion);
        setProfileCheckDone(true);
      } catch (error) {
        // If no profile exists, show completion
        setShowProfileCompletion(true);
        setProfileCheckDone(true);
      }
    };

    checkProfileCompletion();
  }, [user, supabase, isReady, profileCheckDone]);

  const handleProfileComplete = () => {
    setShowProfileCompletion(false);
  };

  const handleProfileSkip = () => {
    setShowProfileCompletion(false);
  };

  return (
    <>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/search" element={withSuspense(<Search />)} />
        <Route path="/deals" element={withSuspense(<Deals />)} />
        <Route path="/category/:categoryId" element={withSuspense(<CategoryPage />)} />
        <Route path="/product/:productId" element={withSuspense(<ProductPage />)} />
        <Route path="/cart" element={withSuspense(<CartPage />)} />
        <Route path="/checkout" element={withSuspense(<CheckoutPage />)} />
        <Route path="/account" element={withSuspense(<AccountPage />)} />
        <Route path="/orders" element={withSuspense(<OrdersPage />)} />
        <Route path="/wishlist" element={withSuspense(<WishlistPage />)} />
        <Route path="/sell" element={withSuspense(<SellPage />)} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/vendor-application" element={withSuspense(<VendorApplicationPage />)} />
        <Route path="/logout" element={<LogoutPage />} />

        {/* Dashboards */}
        <Route
          path="/seller"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              {withSuspense(<SellerDashboardPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/seller/products"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              {withSuspense(<SellerProductsPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/seller/products/new"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              {withSuspense(<SellerNewProductPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/seller/orders"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              {withSuspense(<SellerOrdersPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/seller/payouts"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              {withSuspense(<SellerPayoutsPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/seller/settings"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              {withSuspense(<SellerSettingsPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["admin"]}>
              {withSuspense(<AdminDashboardPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/admin/vendors"
          element={
            <RequireAuth roles={["admin"]}>
              {withSuspense(<AdminVendorsPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/admin/products"
          element={
            <RequireAuth roles={["admin"]}>
              {withSuspense(<AdminProductsPage />)}
            </RequireAuth>
          }
        />
        <Route
          path="/admin/applications"
          element={
            <RequireAuth roles={["admin"]}>
              {withSuspense(<AdminApplicationsPage />)}
            </RequireAuth>
          }
        />

        {/* Footer / info pages */}
        <Route path="/about" element={withSuspense(<StaticPage title="About iwanyu" />)} />
        <Route path="/careers" element={withSuspense(<StaticPage title="Careers" />)} />
        <Route path="/corporate" element={withSuspense(<StaticPage title="Corporate Information" />)} />
        <Route path="/science" element={withSuspense(<StaticPage title="iwanyu Science" />)} />
        <Route path="/affiliate" element={withSuspense(<StaticPage title="Affiliate Program" />)} />
        <Route path="/about" element={withSuspense(<StaticPage title="About Us" />)} />
        <Route path="/affiliate" element={withSuspense(<StaticPage title="Become an Affiliate" />)} />
        <Route path="/advertise" element={withSuspense(<StaticPage title="Advertise Your Products" />)} />
        <Route path="/publish" element={withSuspense(<StaticPage title="Self-Publish" />)} />
        <Route path="/business-card" element={withSuspense(<StaticPage title="iwanyu Business Card" />)} />
        <Route path="/shop-with-points" element={withSuspense(<StaticPage title="Shop with Points" />)} />
        <Route path="/reload" element={withSuspense(<StaticPage title="Reload Your Balance" />)} />
        <Route path="/currency" element={withSuspense(<StaticPage title="Currency Converter" />)} />
        <Route path="/shipping" element={withSuspense(<StaticPage title="Shipping Rates & Policies" />)} />
        <Route path="/returns" element={withSuspense(<StaticPage title="Returns & Replacements" />)} />
        <Route path="/help" element={withSuspense(<StaticPage title="Help" />)} />
        <Route path="/privacy" element={withSuspense(<PrivacyPolicyPage />)} />
        <Route path="/terms" element={withSuspense(<TermsOfServicePage />)} />
        
        {/* New Footer/Header Links Mapped to Static Pages */}
        <Route path="/track-order" element={withSuspense(<StaticPage title="Track Your Order" />)} />
        <Route path="/track" element={withSuspense(<StaticPage title="Order Tracker" />)} />
        <Route path="/stores" element={withSuspense(<StaticPage title="Store Locator" />)} />
        <Route path="/releases" element={withSuspense(<StaticPage title="Latest Releases" />)} />
        <Route path="/top-sellers" element={withSuspense(<StaticPage title="Top Sellers" />)} />
        <Route path="/sport/:sportName" element={withSuspense(<StaticPage title="Shop by Sport" />)} />
        <Route path="/apps" element={withSuspense(<StaticPage title="Mobile Apps" />)} />
        <Route path="/sustainability" element={withSuspense(<StaticPage title="Sustainability" />)} />
        <Route path="/press" element={withSuspense(<StaticPage title="Press" />)} />


        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={withSuspense(<NotFound />)} />
      </Routes>
      
      {/* Profile Completion Modal */}
      {showProfileCompletion && user && (
        <ProfileCompletion 
          onComplete={handleProfileComplete}
          onSkip={handleProfileSkip}
        />
      )}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <HelmetProvider>
        <AuthProvider>
          <MarketplaceProvider>
            <WishlistProvider>
              <RecentlyViewedProvider>
                <CartProvider>
                  <BrowserRouter>
                    <ScrollToTop />
                    <AppContent />
                  </BrowserRouter>
                </CartProvider>
              </RecentlyViewedProvider>
            </WishlistProvider>
          </MarketplaceProvider>
        </AuthProvider>
      </HelmetProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "./context/auth";
import { getSupabaseClient } from "./lib/supabaseClient";
import { ProfileCompletion } from "@/components/ProfileCompletion";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Deals from "./pages/Deals";
import Search from "./pages/Search";
import CategoryPage from "./pages/Category";
import ProductPage from "./pages/Product";
import CartPage from "./pages/Cart";
import CheckoutPage from "./pages/Checkout";
import AccountPage from "./pages/Account";
import OrdersPage from "./pages/Orders";
import WishlistPage from "./pages/Wishlist";
import SellPage from "./pages/Sell";
import SellerDashboardPage from "./pages/seller/SellerDashboard";
import AdminDashboardPage from "./pages/admin/AdminDashboard";
import StaticPage from "./pages/StaticPage";
import SellerProductsPage from "./pages/seller/SellerProducts";
import SellerNewProductPage from "./pages/seller/SellerNewProduct";
import SellerOrdersPage from "./pages/seller/SellerOrders";
import SellerPayoutsPage from "./pages/seller/SellerPayouts";
import SellerSettingsPage from "./pages/seller/SellerSettings";
import { CartProvider } from "./context/cart";
import { MarketplaceProvider } from "./context/marketplace";
import { AuthProvider } from "./context/auth";
import { WishlistProvider } from "@/context/wishlist";
import { RecentlyViewedProvider } from "@/context/recentlyViewed";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import LogoutPage from "./pages/Logout";
import VendorApplicationPage from "./pages/VendorApplication";
import PrivacyPolicyPage from "./pages/PrivacyPolicy";
import TermsOfServicePage from "./pages/TermsOfService";
import RequireAuth from "./components/RequireAuth";
import ScrollToTop from "@/components/ScrollToTop";

const queryClient = new QueryClient();

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
        <Route path="/search" element={<Search />} />
        <Route path="/deals" element={<Deals />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/wishlist" element={<WishlistPage />} />
        <Route path="/sell" element={<SellPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/vendor-application" element={<VendorApplicationPage />} />
        <Route path="/logout" element={<LogoutPage />} />

        {/* Dashboards */}
        <Route
          path="/seller"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/products"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerProductsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/products/new"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerNewProductPage />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/orders"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerOrdersPage />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/payouts"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerPayoutsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/seller/settings"
          element={
            <RequireAuth roles={["seller", "admin"]}>
              <SellerSettingsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth roles={["admin"]}>
              <AdminDashboardPage />
            </RequireAuth>
          }
        />

        {/* Footer / info pages */}
        <Route path="/about" element={<StaticPage title="About iwanyu" />} />
        <Route path="/careers" element={<StaticPage title="Careers" />} />
        <Route path="/corporate" element={<StaticPage title="Corporate Information" />} />
        <Route path="/science" element={<StaticPage title="iwanyu Science" />} />
        <Route path="/affiliate" element={<StaticPage title="Affiliate Program" />} />
        <Route path="/about" element={<StaticPage title="About Us" />} />
        <Route path="/careers" element={<StaticPage title="Careers" />} />
        <Route path="/corporate" element={<StaticPage title="Corporate Information" />} />
        <Route path="/science" element={<StaticPage title="Iwanyu Science" />} />
        <Route path="/affiliate" element={<StaticPage title="Become an Affiliate" />} />
        <Route path="/advertise" element={<StaticPage title="Advertise Your Products" />} />
        <Route path="/publish" element={<StaticPage title="Self-Publish" />} />
        <Route path="/business-card" element={<StaticPage title="iwanyu Business Card" />} />
        <Route path="/shop-with-points" element={<StaticPage title="Shop with Points" />} />
        <Route path="/reload" element={<StaticPage title="Reload Your Balance" />} />
        <Route path="/currency" element={<StaticPage title="Currency Converter" />} />
        <Route path="/shipping" element={<StaticPage title="Shipping Rates & Policies" />} />
        <Route path="/returns" element={<StaticPage title="Returns & Replacements" />} />
        <Route path="/help" element={<StaticPage title="Help" />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsOfServicePage />} />
        
        {/* New Footer/Header Links Mapped to Static Pages */}
        <Route path="/track-order" element={<StaticPage title="Track Your Order" />} />
        <Route path="/track" element={<StaticPage title="Order Tracker" />} />
        <Route path="/stores" element={<StaticPage title="Store Locator" />} />
        <Route path="/releases" element={<StaticPage title="Latest Releases" />} />
        <Route path="/top-sellers" element={<StaticPage title="Top Sellers" />} />
         <Route path="/sport/:sportName" element={<StaticPage title="Shop by Sport" />} />
        <Route path="/apps" element={<StaticPage title="Mobile Apps" />} />
        <Route path="/sustainability" element={<StaticPage title="Sustainability" />} />
        <Route path="/press" element={<StaticPage title="Press" />} />


        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
        <Route path="*" element={<NotFound />} />
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
      <Sonner />
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
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

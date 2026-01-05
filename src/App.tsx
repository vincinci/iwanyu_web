import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Deals from "./pages/Deals";
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
import { CartProvider } from "./context/cart";
import { MarketplaceProvider } from "./context/marketplace";
import { AuthProvider } from "./context/auth";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/Signup";
import LogoutPage from "./pages/Logout";
import VendorApplicationPage from "./pages/VendorApplication";
import RequireAuth from "./components/RequireAuth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <MarketplaceProvider>
          <CartProvider>
            <BrowserRouter>
              <Routes>
            <Route path="/" element={<Index />} />
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
            <Route path="/advertise" element={<StaticPage title="Advertise Your Products" />} />
            <Route path="/publish" element={<StaticPage title="Self-Publish" />} />
            <Route path="/business-card" element={<StaticPage title="iwanyu Business Card" />} />
            <Route path="/shop-with-points" element={<StaticPage title="Shop with Points" />} />
            <Route path="/reload" element={<StaticPage title="Reload Your Balance" />} />
            <Route path="/currency" element={<StaticPage title="Currency Converter" />} />
            <Route path="/shipping" element={<StaticPage title="Shipping Rates & Policies" />} />
            <Route path="/returns" element={<StaticPage title="Returns & Replacements" />} />
            <Route path="/help" element={<StaticPage title="Help" />} />

            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </CartProvider>
        </MarketplaceProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

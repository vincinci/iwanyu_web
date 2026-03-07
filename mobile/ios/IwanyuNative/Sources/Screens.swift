import SwiftUI

enum AppRoute: String, CaseIterable, Identifiable {
    // Core storefront
    case home, search, category, product, deals, cart, checkout, paymentCallback, wishlist
    // Auth/account/static
    case login, signup, logout, account, orders, sell, sellerOnboarding, vendorApplication
    case privacyPolicy, termsOfService, staticPage, notFound
    // Admin
    case adminDashboard, adminVendors, adminProducts, adminDiscounts, adminApplications
    // Seller
    case sellerDashboard, sellerProducts, sellerNewProduct, sellerOrders, sellerPayouts, sellerSettings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .home: return "Home"
        case .search: return "Search"
        case .category: return "Category"
        case .product: return "Product"
        case .deals: return "Deals"
        case .cart: return "Cart"
        case .checkout: return "Checkout"
        case .paymentCallback: return "Payment Callback"
        case .wishlist: return "Wishlist"
        case .login: return "Login"
        case .signup: return "Signup"
        case .logout: return "Logout"
        case .account: return "Account"
        case .orders: return "Orders"
        case .sell: return "Sell"
        case .sellerOnboarding: return "Seller Onboarding"
        case .vendorApplication: return "Vendor Application"
        case .privacyPolicy: return "Privacy Policy"
        case .termsOfService: return "Terms of Service"
        case .staticPage: return "Static Page"
        case .notFound: return "Not Found"
        case .adminDashboard: return "Admin Dashboard"
        case .adminVendors: return "Admin Vendors"
        case .adminProducts: return "Admin Products"
        case .adminDiscounts: return "Admin Discounts"
        case .adminApplications: return "Admin Applications"
        case .sellerDashboard: return "Seller Dashboard"
        case .sellerProducts: return "Seller Products"
        case .sellerNewProduct: return "Seller New Product"
        case .sellerOrders: return "Seller Orders"
        case .sellerPayouts: return "Seller Payouts"
        case .sellerSettings: return "Seller Settings"
        }
    }
}

struct RootView: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        NavigationStack {
            List {
                Section("Brand") {
                    HStack(spacing: 12) {
                        Image("logo")
                            .resizable()
                            .scaledToFit()
                            .frame(width: 36, height: 36)
                        Text("iwanyu Native")
                            .font(.headline)
                    }
                }

                Section("Storefront") {
                    NavigationLink("Home") { HomeScreen() }
                    NavigationLink("Search") { SearchScreen() }
                    NavigationLink("Category") { CategoryScreen() }
                    NavigationLink("Product") { ProductScreen() }
                    NavigationLink("Deals") { DealsScreen() }
                    NavigationLink("Cart") { CartScreen() }
                    NavigationLink("Checkout") { CheckoutScreen() }
                    NavigationLink("Payment Callback") { PaymentCallbackScreen() }
                    NavigationLink("Wishlist") { WishlistScreen() }
                }

                Section("Auth / Account") {
                    NavigationLink("Login") { LoginScreen() }
                    NavigationLink("Signup") { SignupScreen() }
                    NavigationLink("Logout") { LogoutScreen() }
                    NavigationLink("Account") { AccountScreen() }
                    NavigationLink("Orders") { OrdersScreen() }
                    NavigationLink("Sell") { SellScreen() }
                    NavigationLink("Seller Onboarding") { SellerOnboardingScreen() }
                    NavigationLink("Vendor Application") { VendorApplicationScreen() }
                    NavigationLink("Privacy Policy") { PrivacyPolicyScreen() }
                    NavigationLink("Terms Of Service") { TermsOfServiceScreen() }
                    NavigationLink("Static Page") { StaticPageScreen() }
                    NavigationLink("Not Found") { NotFoundScreen() }
                }

                Section("Admin") {
                    NavigationLink("Admin Dashboard") { AdminDashboardScreen() }
                    NavigationLink("Admin Vendors") { AdminVendorsScreen() }
                    NavigationLink("Admin Products") { AdminProductsScreen() }
                    NavigationLink("Admin Discounts") { AdminDiscountsScreen() }
                    NavigationLink("Admin Applications") { AdminApplicationsScreen() }
                }

                Section("Seller") {
                    NavigationLink("Seller Dashboard") { SellerDashboardScreen() }
                    NavigationLink("Seller Products") { SellerProductsScreen() }
                    NavigationLink("Seller New Product") { SellerNewProductScreen() }
                    NavigationLink("Seller Orders") { SellerOrdersScreen() }
                    NavigationLink("Seller Payouts") { SellerPayoutsScreen() }
                    NavigationLink("Seller Settings") { SellerSettingsScreen() }
                }
            }
            .navigationTitle("iwanyu")
            .task {
                if store.products.isEmpty {
                    await store.loadMarketplace()
                }
            }
        }
    }
}

struct HomeScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            Section("Quick Actions") {
                NavigationLink("Login") { LoginScreen() }
                NavigationLink("Search") { SearchScreen() }
                NavigationLink("Cart (\(store.cart.count))") { CartScreen() }
                NavigationLink("Checkout") { CheckoutScreen() }
            }

            if let error = store.errorMessage {
                Section {
                    Text(error).foregroundStyle(.red)
                }
            }

            Section("Featured Products") {
                ForEach(store.products.prefix(20), id: \.id) { product in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(product.title).font(.headline)
                        Text("RWF \(product.price_rwf)")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                        HStack {
                            Text(product.category ?? "Uncategorized")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Spacer()
                            Button("Add to Cart") { store.addToCart(product) }
                                .buttonStyle(.bordered)
                        }
                    }
                }
            }
        }
        .overlay {
            if store.loading {
                ProgressView("Loading marketplace...")
            }
        }
        .navigationTitle("Home")
    }
}


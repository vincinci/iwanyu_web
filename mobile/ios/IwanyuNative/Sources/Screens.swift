import SwiftUI

enum AppRoute: String, CaseIterable, Identifiable {
    case home, search, cart, checkout, account
    case sellerHub, adminHub

    var id: String { rawValue }
}

struct RootView: View {
    @EnvironmentObject private var store: AppStore
    @State private var selected: AppRoute = .home

    var body: some View {
        TabView(selection: $selected) {
            NavigationStack {
                HomeScreen()
            }
            .tabItem {
                Label("Home", systemImage: "house")
            }
            .tag(AppRoute.home)

            NavigationStack {
                SearchScreen()
            }
            .tabItem {
                Label("Search", systemImage: "magnifyingglass")
            }
            .tag(AppRoute.search)

            NavigationStack {
                CartScreen()
            }
            .tabItem {
                Label("Cart", systemImage: "cart")
            }
            .tag(AppRoute.cart)

            NavigationStack {
                CheckoutScreen()
            }
            .tabItem {
                Label("Checkout", systemImage: "creditcard")
            }
            .tag(AppRoute.checkout)

            NavigationStack {
                AccountHubScreen()
            }
            .tabItem {
                Label("Account", systemImage: "person")
            }
            .tag(AppRoute.account)

            if store.isLoggedIn && (store.userRole == "seller" || store.userRole == "admin") {
                NavigationStack {
                    SellerHubScreen()
                }
                .tabItem {
                    Label("Seller", systemImage: "bag")
                }
                .tag(AppRoute.sellerHub)
            }

            if store.isLoggedIn && store.userRole == "admin" {
                NavigationStack {
                    AdminHubScreen()
                }
                .tabItem {
                    Label("Admin", systemImage: "shield")
                }
                .tag(AppRoute.adminHub)
            }
        }
        .task {
            if store.products.isEmpty {
                await store.loadMarketplace()
            }
        }
    }
}

struct HomeScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            Section("Brand") {
                HStack(spacing: 12) {
                    Image("logo")
                        .resizable()
                        .scaledToFit()
                        .frame(width: 32, height: 32)
                    VStack(alignment: .leading) {
                        Text("iwanyu")
                            .font(.headline)
                        Text("Role: \(store.userRole)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Section("Quick Routes") {
                NavigationLink("Search") { SearchScreen() }
                NavigationLink("Cart (\(store.cart.count))") { CartScreen() }
                NavigationLink("Checkout") { CheckoutScreen() }
                NavigationLink("Orders") { OrdersScreen() }
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

struct AccountHubScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            Section("Authentication") {
                NavigationLink("Login") { LoginScreen() }
                NavigationLink("Signup") { SignupScreen() }
                NavigationLink("Logout") { LogoutScreen() }
            }

            Section("Buyer") {
                NavigationLink("Orders") { OrdersScreen() }
                NavigationLink("Wishlist") { WishlistScreen() }
                if store.isLoggedIn && store.userRole == "buyer" {
                    NavigationLink("Sell") { SellScreen() }
                    NavigationLink("Seller Onboarding") { SellerOnboardingScreen() }
                    NavigationLink("Vendor Application") { VendorApplicationScreen() }
                }
            }

            Section("Static") {
                NavigationLink("Privacy Policy") { PrivacyPolicyScreen() }
                NavigationLink("Terms Of Service") { TermsOfServiceScreen() }
                NavigationLink("Static Page") { StaticPageScreen() }
                NavigationLink("Not Found") { NotFoundScreen() }
            }
        }
        .navigationTitle("Account")
    }
}

struct SellerHubScreen: View {
    var body: some View {
        List {
            NavigationLink("Seller Dashboard") { SellerDashboardScreen() }
            NavigationLink("Seller Products") { SellerProductsScreen() }
            NavigationLink("Seller New Product") { SellerNewProductScreen() }
            NavigationLink("Seller Orders") { SellerOrdersScreen() }
            NavigationLink("Seller Payouts") { SellerPayoutsScreen() }
            NavigationLink("Seller Settings") { SellerSettingsScreen() }
        }
        .navigationTitle("Seller")
    }
}

struct AdminHubScreen: View {
    var body: some View {
        List {
            NavigationLink("Admin Dashboard") { AdminDashboardScreen() }
            NavigationLink("Admin Vendors") { AdminVendorsScreen() }
            NavigationLink("Admin Products") { AdminProductsScreen() }
            NavigationLink("Admin Discounts") { AdminDiscountsScreen() }
            NavigationLink("Admin Applications") { AdminApplicationsScreen() }
        }
        .navigationTitle("Admin")
    }
}

import SwiftUI

struct ScreenTemplate: View {
    let title: String

    var body: some View {
        VStack(spacing: 12) {
            Image("icon")
                .resizable()
                .scaledToFit()
                .frame(width: 70, height: 70)
            Text(title).font(.title2.weight(.semibold))
            Text("Native \(title) screen scaffolded and ready for feature wiring.")
                .multilineTextAlignment(.center)
                .foregroundStyle(.secondary)
                .padding(.horizontal)
        }
        .padding()
        .navigationTitle(title)
    }
}

// Storefront
struct SearchScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var query = ""

    var filtered: [Product] {
        if query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return store.products }
        return store.products.filter {
            $0.title.localizedCaseInsensitiveContains(query) ||
            ($0.category?.localizedCaseInsensitiveContains(query) ?? false)
        }
    }

    var body: some View {
        List {
            ForEach(filtered, id: \.id) { product in
                VStack(alignment: .leading, spacing: 6) {
                    Text(product.title).font(.headline)
                    Text("RWF \(product.price_rwf)").foregroundStyle(.secondary)
                    HStack {
                        Text(product.category ?? "Uncategorized")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Button("Add") { store.addToCart(product) }
                            .buttonStyle(.borderedProminent)
                    }
                }
                .padding(.vertical, 4)
            }
        }
        .searchable(text: $query, prompt: "Search products")
        .navigationTitle("Search")
    }
}
struct CategoryScreen: View { var body: some View { ScreenTemplate(title: "Category") } }
struct ProductScreen: View { var body: some View { ScreenTemplate(title: "Product") } }
struct DealsScreen: View { var body: some View { ScreenTemplate(title: "Deals") } }
struct CartScreen: View {
    @EnvironmentObject private var store: AppStore

    var subtotal: Int {
        store.cart.reduce(0) { $0 + ($1.priceRwf * $1.quantity) }
    }

    var body: some View {
        List {
            if store.cart.isEmpty {
                Text("Your cart is empty.")
            } else {
                ForEach(store.cart, id: \.id) { item in
                    VStack(alignment: .leading) {
                        Text(item.title).font(.headline)
                        Text("Qty \(item.quantity) • RWF \(item.priceRwf * item.quantity)")
                            .foregroundStyle(.secondary)
                    }
                }
                HStack {
                    Text("Subtotal")
                    Spacer()
                    Text("RWF \(subtotal)").bold()
                }
            }
        }
        .navigationTitle("Cart")
    }
}

struct CheckoutScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var email = ""
    @State private var phone = ""
    @State private var address = ""
    @State private var paymentMethod = "momo"
    @State private var isSubmitting = false
    @State private var paymentStatus: String?

    var body: some View {
        Form {
            Section("Contact") {
                TextField("Email", text: $email)
                TextField("Phone", text: $phone)
                TextField("Address", text: $address)
            }

            Section("Payment") {
                Picker("Method", selection: $paymentMethod) {
                    Text("Mobile Money").tag("momo")
                }
                .pickerStyle(.segmented)
            }

            Section {
                Button(isSubmitting ? "Processing..." : "Create order and request payment") {
                    Task {
                        isSubmitting = true
                        defer { isSubmitting = false }
                        paymentStatus = await store.checkout(
                            email: email,
                            phone: phone,
                            address: address,
                            paymentMethod: paymentMethod
                        )
                    }
                }
                .disabled(isSubmitting || store.cart.isEmpty)
            }

            if let status = paymentStatus {
                Section("Payment Status") {
                    Text(status)
                }
            }

            if let error = store.errorMessage {
                Section {
                    Text(error).foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Checkout")
    }
}
struct PaymentCallbackScreen: View { var body: some View { ScreenTemplate(title: "Payment Callback") } }
struct WishlistScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        VStack(spacing: 12) {
            Text("Wishlist sync is wired to Supabase table `wishlist_items`.")
                .multilineTextAlignment(.center)
            if let userId = store.session?.user.id {
                Text("Logged in user: \(userId)").font(.caption)
            } else {
                Text("Login to load wishlist.").font(.caption)
            }
        }
        .padding()
        .navigationTitle("Wishlist")
    }
}

// Auth/account/static
struct LoginScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        Form {
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
            SecureField("Password", text: $password)

            Button("Login") {
                Task { await store.signIn(email: email, password: password) }
            }

            if let user = store.session?.user {
                Text("Logged in as \(user.email ?? user.id)").foregroundStyle(.green)
            }
            if let error = store.errorMessage {
                Text(error).foregroundStyle(.red)
            }
        }
        .navigationTitle("Login")
    }
}

struct SignupScreen: View {
    @EnvironmentObject private var store: AppStore
    @State private var email = ""
    @State private var password = ""

    var body: some View {
        Form {
            TextField("Email", text: $email)
                .textInputAutocapitalization(.never)
            SecureField("Password", text: $password)

            Button("Create account") {
                Task { await store.signUp(email: email, password: password) }
            }

            if let error = store.errorMessage {
                Text(error).foregroundStyle(.red)
            }
        }
        .navigationTitle("Signup")
    }
}

struct LogoutScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        VStack(spacing: 12) {
            Button("Logout") {
                store.session = nil
                store.userRole = "buyer"
                store.orders = []
                store.sellerVendors = []
                store.sellerOrderItems = []
                store.sellerPayouts = []
                store.adminVendorApplications = []
                store.adminDiscountCodes = []
                store.clearCart()
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
        .navigationTitle("Logout")
    }
}
struct AccountScreen: View { var body: some View { ScreenTemplate(title: "Account") } }
struct OrdersScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            if store.orders.isEmpty {
                Text("No orders yet or login required.")
            } else {
                ForEach(store.orders, id: \.id) { order in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(order.id).font(.caption).foregroundStyle(.secondary)
                        Text(order.status).font(.headline)
                        Text("RWF \(order.total_rwf)")
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .task {
            await store.loadOrders()
        }
        .navigationTitle("Orders")
    }
}
struct SellScreen: View { var body: some View { ScreenTemplate(title: "Sell") } }
struct SellerOnboardingScreen: View { var body: some View { ScreenTemplate(title: "Seller Onboarding") } }
struct VendorApplicationScreen: View { var body: some View { ScreenTemplate(title: "Vendor Application") } }
struct PrivacyPolicyScreen: View { var body: some View { ScreenTemplate(title: "Privacy Policy") } }
struct TermsOfServiceScreen: View { var body: some View { ScreenTemplate(title: "Terms Of Service") } }
struct StaticPageScreen: View { var body: some View { ScreenTemplate(title: "Static Page") } }
struct NotFoundScreen: View { var body: some View { ScreenTemplate(title: "Not Found") } }

// Admin
struct AdminDashboardScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            Text("Role: \(store.userRole)")
            Text("Total products: \(store.products.count)")
            Text("Total vendors: \(store.vendors.count)")
            Text("Vendor applications: \(store.adminVendorApplications.count)")
            Text("Discount codes: \(store.adminDiscountCodes.count)")
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Admin Dashboard")
    }
}

struct AdminVendorsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.vendors, id: \.id) { v in
            VStack(alignment: .leading) {
                Text(v.name).font(.headline)
                Text(v.location ?? "Unknown location").font(.caption)
                Text(v.status ?? "pending").font(.caption2)
            }
        }
        .navigationTitle("Admin Vendors")
    }
}

struct AdminProductsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.products, id: \.id) { p in
            VStack(alignment: .leading) {
                Text(p.title).font(.headline)
                Text("RWF \(p.price_rwf)").font(.caption)
            }
        }
        .navigationTitle("Admin Products")
    }
}

struct AdminDiscountsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.adminDiscountCodes, id: \.id) { code in
            VStack(alignment: .leading) {
                Text(code.code).font(.headline)
                Text(code.discount_type).font(.caption)
                Text("Redeemed: \(code.redeemed_count ?? 0)").font(.caption2)
            }
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Admin Discounts")
    }
}

struct AdminApplicationsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.adminVendorApplications, id: \.id) { app in
            VStack(alignment: .leading) {
                Text(app.store_name).font(.headline)
                Text(app.status).font(.caption)
                Text(app.created_at ?? "").font(.caption2)
            }
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Admin Applications")
    }
}

// Seller
struct SellerDashboardScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List {
            Text("Your stores: \(store.sellerVendors.count)")
            Text("Your order items: \(store.sellerOrderItems.count)")
            Text("Your payouts: \(store.sellerPayouts.count)")
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Seller Dashboard")
    }
}

struct SellerProductsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        let vendorIds = Set(store.sellerVendors.map { $0.id })
        List(store.products.filter { vendorIds.contains($0.vendor_id) }, id: \.id) { product in
            VStack(alignment: .leading) {
                Text(product.title).font(.headline)
                Text("RWF \(product.price_rwf)").font(.caption)
            }
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Seller Products")
    }
}

struct SellerNewProductScreen: View { var body: some View { ScreenTemplate(title: "Seller New Product") } }

struct SellerOrdersScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.sellerOrderItems, id: \.id) { item in
            VStack(alignment: .leading) {
                Text(item.title).font(.headline)
                Text("Qty \(item.quantity) • \(item.status)").font(.caption)
                Text(item.order_id).font(.caption2)
            }
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Seller Orders")
    }
}

struct SellerPayoutsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.sellerPayouts, id: \.id) { payout in
            VStack(alignment: .leading) {
                Text("RWF \(payout.amount_rwf)").font(.headline)
                Text(payout.status).font(.caption)
                Text(payout.order_id).font(.caption2)
            }
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Seller Payouts")
    }
}

struct SellerSettingsScreen: View {
    @EnvironmentObject private var store: AppStore

    var body: some View {
        List(store.sellerVendors, id: \.id) { vendor in
            VStack(alignment: .leading) {
                Text(vendor.name).font(.headline)
                Text(vendor.location ?? "Unknown").font(.caption)
            }
        }
        .task { await store.loadRoleData() }
        .navigationTitle("Seller Settings")
    }
}

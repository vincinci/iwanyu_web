import SwiftUI

@main
struct IwanyuApp: App {
    @StateObject private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(store)
        }
    }
}

final class AppStore: ObservableObject {
    @Published var products: [Product] = []
    @Published var vendors: [Vendor] = []
    @Published var loading = false
    @Published var errorMessage: String?
    @Published var session: AuthSession?
    @Published var cart: [CartItem] = []
    @Published var orders: [Order] = []

    let api = SupabaseAPI()

    @MainActor
    func loadMarketplace() async {
        loading = true
        defer { loading = false }
        do {
            async let p = api.fetchProducts(limit: 200)
            async let v = api.fetchVendors(limit: 100)
            products = try await p
            vendors = try await v
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    var isLoggedIn: Bool { session?.access_token.isEmpty == false }

    @MainActor
    func signIn(email: String, password: String) async {
        do {
            session = try await api.signIn(email: email, password: password)
            errorMessage = nil
            await loadOrders()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func signUp(email: String, password: String) async {
        do {
            session = try await api.signUp(email: email, password: password)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func loadOrders() async {
        guard let userId = session?.user.id, let token = session?.access_token else { return }
        do {
            orders = try await api.fetchOrders(userId: userId, token: token)
            errorMessage = nil
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    @MainActor
    func addToCart(_ product: Product) {
        if let index = cart.firstIndex(where: { $0.productId == product.id }) {
            let existing = cart[index]
            cart[index] = CartItem(
                id: existing.id,
                productId: existing.productId,
                title: existing.title,
                priceRwf: existing.priceRwf,
                quantity: existing.quantity + 1
            )
        } else {
            cart.append(CartItem(product: product))
        }
    }

    @MainActor
    func clearCart() {
        cart.removeAll()
    }

    @MainActor
    func checkout(email: String, phone: String, address: String, paymentMethod: String) async -> String? {
        guard let token = session?.access_token else {
            errorMessage = "Please login first"
            return nil
        }
        do {
            let payload: [String: Any] = [
                "items": cart.map { ["productId": $0.productId, "quantity": $0.quantity] },
                "email": email,
                "phone": phone,
                "address": address,
                "paymentMethod": paymentMethod,
                "discountCode": NSNull()
            ]
            let create = try await api.createOrder(accessToken: token, payload: payload)
            guard let orderId = create.orderId, let total = create.total else {
                throw APIError.invalidResponse
            }

            let initPayload: [String: Any] = [
                "txRef": orderId,
                "amount": total,
                "currency": "RWF",
                "redirectUrl": "https://www.iwanyu.store/payment-callback?orderId=\(orderId)",
                "paymentOptions": paymentMethod == "momo" ? "mobilemoney" : "card",
                "customer": [
                    "email": email,
                    "name": session?.user.email ?? email,
                    "phone_number": phone
                ],
                "customizations": [
                    "title": "iwanyu",
                    "description": "Order \(orderId)"
                ]
            ]
            let initResult = try await api.initFlutterwavePayment(accessToken: token, payload: initPayload)
            errorMessage = nil
            return initResult["paymentLink"]
        } catch {
            errorMessage = error.localizedDescription
            return nil
        }
    }
}

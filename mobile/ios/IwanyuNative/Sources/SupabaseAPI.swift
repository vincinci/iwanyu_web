import Foundation

enum APIError: Error {
    case missingConfig
    case invalidResponse
    case status(Int, String)
}

struct AuthSession: Codable {
    let access_token: String
    let refresh_token: String?
    let user: AuthUser
}

struct AuthUser: Codable {
    let id: String
    let email: String?
}

struct FunctionResult: Codable {
    let success: Bool?
    let orderId: String?
    let total: Int?
    let message: String?
}

final class SupabaseAPI {
    private let baseURL: URL
    private let anonKey: String

    init() {
        guard
            let urlString = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_URL") as? String,
            let url = URL(string: urlString),
            let key = Bundle.main.object(forInfoDictionaryKey: "SUPABASE_ANON_KEY") as? String,
            !key.isEmpty
        else {
            fatalError("Missing SUPABASE_URL / SUPABASE_ANON_KEY in Info.plist")
        }
        self.baseURL = url
        self.anonKey = key
    }

    // MARK: - Auth (same Supabase backend)

    func signIn(email: String, password: String) async throws -> AuthSession {
        let payload: [String: Any] = ["email": email, "password": password]
        let data = try await postRaw(path: "/auth/v1/token?grant_type=password", payload: payload, bearer: anonKey)
        return try JSONDecoder().decode(AuthSession.self, from: data)
    }

    func signUp(email: String, password: String) async throws -> AuthSession {
        let payload: [String: Any] = ["email": email, "password": password]
        let data = try await postRaw(path: "/auth/v1/signup", payload: payload, bearer: anonKey)
        return try JSONDecoder().decode(AuthSession.self, from: data)
    }

    // MARK: - Read APIs

    func fetchProducts(limit: Int) async throws -> [Product] {
        let path = "/rest/v1/products?select=id,vendor_id,title,description,category,price_rwf,image_url,in_stock,free_shipping,rating,review_count,discount_percentage&deleted_at=is.null&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: anonKey)
    }

    func fetchVendors(limit: Int) async throws -> [Vendor] {
        let path = "/rest/v1/vendors?select=id,name,location,verified,status,owner_user_id&deleted_at=is.null&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: anonKey)
    }

    func fetchProfileRole(userId: String, token: String) async throws -> String {
        let path = "/rest/v1/profiles?select=role&id=eq.\(userId)&limit=1"
        let rows: [ProfileRoleRow] = try await get(path: path, token: token)
        return rows.first?.role ?? "buyer"
    }

    func fetchVendorsForOwner(userId: String, token: String) async throws -> [Vendor] {
        let path = "/rest/v1/vendors?select=id,name,location,verified,status,owner_user_id&owner_user_id=eq.\(userId)&deleted_at=is.null&limit=50"
        return try await get(path: path, token: token)
    }

    func fetchSellerOrderItems(vendorIds: [String], token: String, limit: Int = 100) async throws -> [SellerOrderItem] {
        guard !vendorIds.isEmpty else { return [] }
        let inList = vendorIds.joined(separator: ",")
        let path = "/rest/v1/order_items?select=order_id,product_id,vendor_id,title,quantity,status&vendor_id=in.(\(inList))&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: token)
    }

    func fetchSellerPayouts(vendorIds: [String], token: String, limit: Int = 100) async throws -> [VendorPayout] {
        guard !vendorIds.isEmpty else { return [] }
        let inList = vendorIds.joined(separator: ",")
        let path = "/rest/v1/vendor_payouts?select=id,vendor_id,order_id,amount_rwf,status&vendor_id=in.(\(inList))&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: token)
    }

    func fetchAdminVendorApplications(token: String, limit: Int = 100) async throws -> [VendorApplication] {
        let path = "/rest/v1/vendor_applications?select=id,store_name,status,owner_user_id,created_at&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: token)
    }

    func fetchAdminDiscountCodes(token: String, limit: Int = 100) async throws -> [DiscountCode] {
        let path = "/rest/v1/discount_codes?select=id,code,discount_type,active,redeemed_count&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: token)
    }

    func fetchOrders(userId: String, token: String, limit: Int = 50) async throws -> [Order] {
        let path = "/rest/v1/orders?select=id,buyer_user_id,buyer_email,shipping_address,status,total_rwf,created_at&buyer_user_id=eq.\(userId)&order=created_at.desc&limit=\(limit)"
        return try await get(path: path, token: token)
    }

    func fetchWishlist(userId: String, token: String, limit: Int = 100) async throws -> [[String: String]] {
        let path = "/rest/v1/wishlist_items?select=product_id,user_id&user_id=eq.\(userId)&limit=\(limit)"
        return try await get(path: path, token: token)
    }

    // MARK: - Edge functions (same website APIs)

    func createOrder(accessToken: String, payload: [String: Any]) async throws -> FunctionResult {
        let data = try await postRaw(path: "/functions/v1/create-order", payload: payload, bearer: accessToken)
        return try JSONDecoder().decode(FunctionResult.self, from: data)
    }

    func verifyFlutterwavePayment(accessToken: String, orderId: String, transactionId: String) async throws -> FunctionResult {
        let payload: [String: Any] = ["orderId": orderId, "transactionId": transactionId]
        let data = try await postRaw(path: "/functions/v1/flutterwave-verify", payload: payload, bearer: accessToken)
        return try JSONDecoder().decode(FunctionResult.self, from: data)
    }

    func initFlutterwavePayment(accessToken: String, payload: [String: Any]) async throws -> [String: String] {
        let data = try await postRaw(path: "/functions/v1/flutterwave-init", payload: payload, bearer: accessToken)
        return (try JSONSerialization.jsonObject(with: data) as? [String: String]) ?? [:]
    }

    // MARK: - HTTP helpers

    private func get<T: Decodable>(path: String, token: String) async throws -> T {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw APIError.invalidResponse }
        var req = URLRequest(url: url)
        req.httpMethod = "GET"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.status(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func postRaw(path: String, payload: [String: Any], bearer: String) async throws -> Data {
        guard let url = URL(string: path, relativeTo: baseURL) else { throw APIError.invalidResponse }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.setValue("Bearer \(bearer)", forHTTPHeaderField: "Authorization")
        req.httpBody = try JSONSerialization.data(withJSONObject: payload)

        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse else { throw APIError.invalidResponse }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError.status(http.statusCode, String(data: data, encoding: .utf8) ?? "")
        }
        return data
    }
}

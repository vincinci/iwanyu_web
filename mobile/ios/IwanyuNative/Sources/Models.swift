import Foundation

struct Product: Codable, Identifiable, Hashable {
    let id: String
    let vendor_id: String
    let title: String
    let description: String?
    let category: String?
    let price_rwf: Int
    let image_url: String?
    let in_stock: Bool?
    let free_shipping: Bool?
    let rating: Double?
    let review_count: Int?
    let discount_percentage: Int?
}

struct Vendor: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let location: String?
    let verified: Bool?
    let status: String?
    let owner_user_id: String?
}

struct Order: Codable, Identifiable, Hashable {
    let id: String
    let buyer_user_id: String?
    let buyer_email: String?
    let shipping_address: String?
    let status: String
    let total_rwf: Int
    let created_at: String?
}

struct ProfileRoleRow: Codable, Hashable {
    let role: String
}

struct SellerOrderItem: Codable, Identifiable, Hashable {
    let order_id: String
    let product_id: String
    let vendor_id: String
    let title: String
    let quantity: Int
    let status: String

    var id: String { "\(order_id)-\(product_id)" }
}

struct VendorPayout: Codable, Identifiable, Hashable {
    let id: String
    let vendor_id: String
    let order_id: String
    let amount_rwf: Int
    let status: String
}

struct VendorApplication: Codable, Identifiable, Hashable {
    let id: String
    let store_name: String
    let status: String
    let owner_user_id: String?
    let created_at: String?
}

struct DiscountCode: Codable, Identifiable, Hashable {
    let id: String
    let code: String
    let discount_type: String
    let active: Bool
    let redeemed_count: Int?
}

struct CartItem: Identifiable, Hashable {
    let id: String
    let productId: String
    let title: String
    let priceRwf: Int
    let quantity: Int

    init(product: Product, quantity: Int = 1) {
        self.id = product.id
        self.productId = product.id
        self.title = product.title
        self.priceRwf = product.price_rwf
        self.quantity = quantity
    }

    init(id: String, productId: String, title: String, priceRwf: Int, quantity: Int) {
        self.id = id
        self.productId = productId
        self.title = title
        self.priceRwf = priceRwf
        self.quantity = quantity
    }
}

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

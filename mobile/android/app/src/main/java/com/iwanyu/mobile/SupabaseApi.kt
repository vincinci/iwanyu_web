package com.iwanyu.mobile

import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

@Serializable
data class Product(
    val id: String,
    val vendor_id: String,
    val title: String,
    val description: String? = null,
    val category: String? = null,
    val price_rwf: Int,
    val image_url: String? = null,
    val in_stock: Boolean? = null,
    val free_shipping: Boolean? = null,
    val rating: Double? = null,
    val review_count: Int? = null,
    val discount_percentage: Int? = null,
)

@Serializable
data class VendorBasic(
    val id: String,
    val name: String,
    val location: String? = null,
    val verified: Boolean? = null,
    val status: String? = null,
    val owner_user_id: String? = null,
)

@Serializable
data class OrderBasic(
    val id: String,
    val status: String,
    val total_rwf: Int,
    val created_at: String? = null,
)

@Serializable
data class SellerOrderItem(
    val order_id: String,
    val product_id: String,
    val vendor_id: String,
    val title: String,
    val quantity: Int,
    val status: String,
)

@Serializable
data class VendorPayout(
    val id: String,
    val vendor_id: String,
    val order_id: String,
    val amount_rwf: Int,
    val status: String,
)

@Serializable
data class VendorApplicationRow(
    val id: String,
    val store_name: String,
    val status: String,
    val created_at: String? = null,
)

@Serializable
data class DiscountCodeRow(
    val id: String,
    val code: String,
    val discount_type: String,
    val active: Boolean,
    val redeemed_count: Int? = null,
)

@Serializable
data class ProfileRoleRow(val role: String)

@Serializable
data class AuthUser(
    val id: String,
    val email: String? = null,
)

@Serializable
data class AuthSession(
    val access_token: String,
    val refresh_token: String? = null,
    val user: AuthUser,
)

@Serializable
data class FunctionResult(
    val success: Boolean? = null,
    val orderId: String? = null,
    val total: Int? = null,
    val message: String? = null,
)

object SupabaseApi {
    private val client = OkHttpClient()
    private val json = Json { ignoreUnknownKeys = true }

    private val baseUrl = BuildConfig.SUPABASE_URL.trimEnd('/')
    private val anonKey = BuildConfig.SUPABASE_ANON_KEY

    fun fetchProducts(limit: Int): List<Product> {
        require(baseUrl.isNotBlank()) { "SUPABASE_URL is missing" }
        require(anonKey.isNotBlank()) { "SUPABASE_ANON_KEY is missing" }

        val url = "$baseUrl/rest/v1/products?select=id,vendor_id,title,description,category,price_rwf,image_url,in_stock,free_shipping,rating,review_count,discount_percentage&deleted_at=is.null&order=created_at.desc&limit=$limit"
        return getList(url, anonKey, ListSerializer(Product.serializer()))
    }

    fun fetchVendors(limit: Int = 100): List<VendorBasic> {
        val url = "$baseUrl/rest/v1/vendors?select=id,name,location,verified,status,owner_user_id&deleted_at=is.null&order=created_at.desc&limit=$limit"
        return getList(url, anonKey, ListSerializer(VendorBasic.serializer()))
    }

    fun fetchProfileRole(userId: String, token: String): String {
        val url = "$baseUrl/rest/v1/profiles?select=role&id=eq.$userId&limit=1"
        val rows = getList(url, token, ListSerializer(ProfileRoleRow.serializer()))
        return rows.firstOrNull()?.role ?: "buyer"
    }

    fun fetchOrders(userId: String, token: String, limit: Int = 50): List<OrderBasic> {
        val url = "$baseUrl/rest/v1/orders?select=id,status,total_rwf,created_at&buyer_user_id=eq.$userId&order=created_at.desc&limit=$limit"
        return getList(url, token, ListSerializer(OrderBasic.serializer()))
    }

    fun fetchVendorsForOwner(userId: String, token: String): List<VendorBasic> {
        val url = "$baseUrl/rest/v1/vendors?select=id,name,location,verified,status,owner_user_id&owner_user_id=eq.$userId&deleted_at=is.null&limit=50"
        return getList(url, token, ListSerializer(VendorBasic.serializer()))
    }

    fun fetchSellerOrderItems(vendorIds: List<String>, token: String, limit: Int = 100): List<SellerOrderItem> {
        if (vendorIds.isEmpty()) return emptyList()
        val inClause = vendorIds.joinToString(",")
        val url = "$baseUrl/rest/v1/order_items?select=order_id,product_id,vendor_id,title,quantity,status&vendor_id=in.($inClause)&order=created_at.desc&limit=$limit"
        return getList(url, token, ListSerializer(SellerOrderItem.serializer()))
    }

    fun fetchSellerPayouts(vendorIds: List<String>, token: String, limit: Int = 100): List<VendorPayout> {
        if (vendorIds.isEmpty()) return emptyList()
        val inClause = vendorIds.joinToString(",")
        val url = "$baseUrl/rest/v1/vendor_payouts?select=id,vendor_id,order_id,amount_rwf,status&vendor_id=in.($inClause)&order=created_at.desc&limit=$limit"
        return getList(url, token, ListSerializer(VendorPayout.serializer()))
    }

    fun fetchAdminVendorApplications(token: String, limit: Int = 100): List<VendorApplicationRow> {
        val url = "$baseUrl/rest/v1/vendor_applications?select=id,store_name,status,created_at&order=created_at.desc&limit=$limit"
        return getList(url, token, ListSerializer(VendorApplicationRow.serializer()))
    }

    fun fetchAdminDiscountCodes(token: String, limit: Int = 100): List<DiscountCodeRow> {
        val url = "$baseUrl/rest/v1/discount_codes?select=id,code,discount_type,active,redeemed_count&order=created_at.desc&limit=$limit"
        return getList(url, token, ListSerializer(DiscountCodeRow.serializer()))
    }

    fun createOrderResult(accessToken: String, jsonPayload: String): FunctionResult {
        val raw = invokeFunction("create-order", accessToken, jsonPayload)
        return json.decodeFromString(FunctionResult.serializer(), raw)
    }

    fun signIn(email: String, password: String): AuthSession {
        val payload = "{\"email\":\"$email\",\"password\":\"$password\"}"
        val url = "$baseUrl/auth/v1/token?grant_type=password"
        return postAuth(url, payload)
    }

    fun signUp(email: String, password: String): AuthSession {
        val payload = "{\"email\":\"$email\",\"password\":\"$password\"}"
        val url = "$baseUrl/auth/v1/signup"
        return postAuth(url, payload)
    }

    private fun postAuth(url: String, payload: String): AuthSession {
        val req = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .addHeader("Content-Type", "application/json")
            .post(payload.toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("HTTP ${res.code}: $body")
            return json.decodeFromString(AuthSession.serializer(), body)
        }
    }

    private fun invokeFunction(slug: String, accessToken: String, jsonPayload: String): String {
        val url = "$baseUrl/functions/v1/$slug"
        val req = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $accessToken")
            .addHeader("Content-Type", "application/json")
            .post(jsonPayload.toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("HTTP ${res.code}: $body")
            return body
        }
    }

    private fun <T> getList(url: String, token: String, serializer: kotlinx.serialization.KSerializer<T>): T {
        val req = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $token")
            .addHeader("Content-Type", "application/json")
            .build()

        client.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) error("HTTP ${res.code}: $body")
            return json.decodeFromString(serializer, body)
        }
    }
}

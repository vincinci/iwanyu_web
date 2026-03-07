package com.iwanyu.mobile

import kotlinx.serialization.Serializable
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.OkHttpClient
import okhttp3.Request

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

        val req = Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .addHeader("Content-Type", "application/json")
            .build()

        client.newCall(req).execute().use { res ->
            if (!res.isSuccessful) error("HTTP ${res.code}: ${res.body?.string()}")
            val body = res.body?.string().orEmpty()
            return json.decodeFromString(ListSerializer(Product.serializer()), body)
        }
    }

    fun fetchVendors(limit: Int = 100): List<Map<String, String>> {
        val url = "$baseUrl/rest/v1/vendors?select=id,name,location,verified,status&deleted_at=is.null&order=created_at.desc&limit=$limit"
        val req = baseGet(url)
        client.newCall(req).execute().use { res ->
            if (!res.isSuccessful) error("HTTP ${res.code}: ${res.body?.string()}")
            val body = res.body?.string().orEmpty()
            return json.decodeFromString(
                ListSerializer(MapSerializer(String.serializer(), String.serializer())),
                body
            )
        }
    }

    fun fetchOrders(userId: String, limit: Int = 50): List<Map<String, String>> {
        val url = "$baseUrl/rest/v1/orders?select=id,buyer_user_id,buyer_email,shipping_address,status,total_rwf,created_at&buyer_user_id=eq.$userId&order=created_at.desc&limit=$limit"
        val req = baseGet(url)
        client.newCall(req).execute().use { res ->
            if (!res.isSuccessful) error("HTTP ${res.code}: ${res.body?.string()}")
            val body = res.body?.string().orEmpty()
            return json.decodeFromString(
                ListSerializer(MapSerializer(String.serializer(), String.serializer())),
                body
            )
        }
    }

    fun fetchWishlist(userId: String, limit: Int = 100): List<Map<String, String>> {
        val url = "$baseUrl/rest/v1/wishlist_items?select=product_id,user_id&user_id=eq.$userId&limit=$limit"
        val req = baseGet(url)
        client.newCall(req).execute().use { res ->
            if (!res.isSuccessful) error("HTTP ${res.code}: ${res.body?.string()}")
            val body = res.body?.string().orEmpty()
            return json.decodeFromString(
                ListSerializer(MapSerializer(String.serializer(), String.serializer())),
                body
            )
        }
    }

    fun createOrder(accessToken: String, jsonPayload: String): String {
        return invokeFunction("create-order", accessToken, jsonPayload)
    }

    fun createOrderResult(accessToken: String, jsonPayload: String): FunctionResult {
        val raw = createOrder(accessToken, jsonPayload)
        return json.decodeFromString(FunctionResult.serializer(), raw)
    }

    fun verifyFlutterwavePayment(accessToken: String, orderId: String, transactionId: String): String {
        val payload = "{\"orderId\":\"$orderId\",\"transactionId\":\"$transactionId\"}"
        return invokeFunction("flutterwave-verify", accessToken, payload)
    }

    fun signIn(email: String, password: String): AuthSession {
        val payload = "{\"email\":\"$email\",\"password\":\"$password\"}"
        val url = "$baseUrl/auth/v1/token?grant_type=password"
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

    fun signUp(email: String, password: String): AuthSession {
        val payload = "{\"email\":\"$email\",\"password\":\"$password\"}"
        val url = "$baseUrl/auth/v1/signup"
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

    private fun baseGet(url: String): Request {
        return Request.Builder()
            .url(url)
            .addHeader("apikey", anonKey)
            .addHeader("Authorization", "Bearer $anonKey")
            .addHeader("Content-Type", "application/json")
            .build()
    }
}

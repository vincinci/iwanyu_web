package com.iwanyu.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.Divider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme {
                IwanyuApp()
            }
        }
    }
}

data class CartItem(
    val productId: String,
    val title: String,
    val priceRwf: Int,
    val quantity: Int,
)

@Composable
fun IwanyuApp() {
    val scope = rememberCoroutineScope()

    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var session by remember { mutableStateOf<AuthSession?>(null) }
    var userRole by remember { mutableStateOf("buyer") }
    var apiError by remember { mutableStateOf<String?>(null) }

    val products = remember { mutableStateListOf<Product>() }
    val vendors = remember { mutableStateListOf<VendorBasic>() }
    val cart = remember { mutableStateListOf<CartItem>() }
    val orders = remember { mutableStateListOf<OrderBasic>() }

    val sellerVendors = remember { mutableStateListOf<VendorBasic>() }
    val sellerOrderItems = remember { mutableStateListOf<SellerOrderItem>() }
    val sellerPayouts = remember { mutableStateListOf<VendorPayout>() }
    val adminApps = remember { mutableStateListOf<VendorApplicationRow>() }
    val adminDiscounts = remember { mutableStateListOf<DiscountCodeRow>() }

    var query by remember { mutableStateOf("") }

    var checkoutEmail by remember { mutableStateOf("") }
    var checkoutPhone by remember { mutableStateOf("") }
    var checkoutAddress by remember { mutableStateOf("") }
    var checkoutResult by remember { mutableStateOf<String?>(null) }

    suspend fun loadRoleData() {
        val s = session ?: return
        try {
            val role = withContext(Dispatchers.IO) { SupabaseApi.fetchProfileRole(s.user.id, s.access_token) }
            userRole = role

            val userOrders = withContext(Dispatchers.IO) { SupabaseApi.fetchOrders(s.user.id, s.access_token) }
            orders.clear()
            orders.addAll(userOrders)

            if (role == "seller" || role == "admin") {
                val ownVendors = withContext(Dispatchers.IO) { SupabaseApi.fetchVendorsForOwner(s.user.id, s.access_token) }
                sellerVendors.clear()
                sellerVendors.addAll(ownVendors)
                val ids = ownVendors.map { it.id }
                sellerOrderItems.clear()
                sellerOrderItems.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchSellerOrderItems(ids, s.access_token) })
                sellerPayouts.clear()
                sellerPayouts.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchSellerPayouts(ids, s.access_token) })
            } else {
                sellerVendors.clear()
                sellerOrderItems.clear()
                sellerPayouts.clear()
            }

            if (role == "admin") {
                adminApps.clear()
                adminApps.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchAdminVendorApplications(s.access_token) })
                adminDiscounts.clear()
                adminDiscounts.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchAdminDiscountCodes(s.access_token) })
            } else {
                adminApps.clear()
                adminDiscounts.clear()
            }

            apiError = null
        } catch (e: Exception) {
            apiError = e.message
        }
    }

    LaunchedEffect(Unit) {
        try {
            val loadedProducts = withContext(Dispatchers.IO) { SupabaseApi.fetchProducts(limit = 120) }
            val loadedVendors = withContext(Dispatchers.IO) { SupabaseApi.fetchVendors(limit = 120) }
            products.clear(); products.addAll(loadedProducts)
            vendors.clear(); vendors.addAll(loadedVendors)
        } catch (e: Exception) {
            apiError = e.message
        }
    }

    val filtered = remember(products, query) {
        if (query.isBlank()) products.toList() else products.filter {
            it.title.contains(query, ignoreCase = true) || (it.category ?: "").contains(query, ignoreCase = true)
        }
    }

    val subtotal = cart.sumOf { it.priceRwf * it.quantity }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Image(painter = painterResource(id = R.drawable.logo), contentDescription = "iwanyu logo", modifier = Modifier.size(36.dp))
                Text("iwanyu Native Android", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            }
            Text("Role: $userRole", modifier = Modifier.padding(top = 4.dp))
            Divider(modifier = Modifier.padding(top = 10.dp, bottom = 12.dp))
        }

        item {
            Text("Auth", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
                Button(onClick = {
                    scope.launch {
                        try {
                            session = withContext(Dispatchers.IO) { SupabaseApi.signIn(email, password) }
                            loadRoleData()
                        } catch (e: Exception) { apiError = e.message }
                    }
                }) { Text("Login") }
                TextButton(onClick = {
                    scope.launch {
                        try {
                            session = withContext(Dispatchers.IO) { SupabaseApi.signUp(email, password) }
                            loadRoleData()
                        } catch (e: Exception) { apiError = e.message }
                    }
                }) { Text("Signup") }
                TextButton(onClick = {
                    session = null
                    userRole = "buyer"
                    cart.clear()
                    orders.clear()
                    sellerVendors.clear(); sellerOrderItems.clear(); sellerPayouts.clear()
                    adminApps.clear(); adminDiscounts.clear()
                }) { Text("Logout") }
            }
            session?.let { Text("Logged in: ${it.user.email ?: it.user.id}", modifier = Modifier.padding(top = 6.dp)) }
            Divider(modifier = Modifier.padding(vertical = 12.dp))
        }

        item {
            Text("Storefront (Buyer)", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(value = query, onValueChange = { query = it }, label = { Text("Search products") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 8.dp))
        }

        items(filtered.take(40), key = { it.id }) { p ->
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Text(p.title, fontWeight = FontWeight.SemiBold)
                Text("RWF ${p.price_rwf}")
                Text(p.category ?: "Uncategorized", style = MaterialTheme.typography.bodySmall)
                Button(onClick = {
                    val idx = cart.indexOfFirst { it.productId == p.id }
                    if (idx >= 0) {
                        val existing = cart[idx]
                        cart[idx] = existing.copy(quantity = existing.quantity + 1)
                    } else {
                        cart.add(CartItem(productId = p.id, title = p.title, priceRwf = p.price_rwf, quantity = 1))
                    }
                }, modifier = Modifier.padding(top = 6.dp)) { Text("Add to cart") }
            }
            Divider()
        }

        item {
            Divider(modifier = Modifier.padding(vertical = 10.dp))
            Text("Cart & Checkout", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (cart.isEmpty()) Text("Cart is empty", modifier = Modifier.padding(top = 8.dp))
            cart.forEach { item ->
                Text("• ${item.title} x${item.quantity} = RWF ${item.priceRwf * item.quantity}", modifier = Modifier.padding(top = 4.dp))
            }
            Text("Subtotal: RWF $subtotal", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))

            OutlinedTextField(value = checkoutEmail, onValueChange = { checkoutEmail = it }, label = { Text("Checkout Email") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = checkoutPhone, onValueChange = { checkoutPhone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = checkoutAddress, onValueChange = { checkoutAddress = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))

            Button(onClick = {
                val token = session?.access_token
                if (token.isNullOrBlank()) {
                    apiError = "Login before checkout"
                    return@Button
                }
                if (cart.isEmpty()) {
                    apiError = "Cart is empty"
                    return@Button
                }
                val itemsJson = cart.joinToString(",") { "{\\\"productId\\\":\\\"${it.productId}\\\",\\\"quantity\\\":${it.quantity}}" }
                val payload = "{" +
                    "\\\"items\\\":[${itemsJson}]," +
                    "\\\"email\\\":\\\"${checkoutEmail}\\\"," +
                    "\\\"phone\\\":\\\"${checkoutPhone}\\\"," +
                    "\\\"address\\\":\\\"${checkoutAddress}\\\"," +
                    "\\\"paymentMethod\\\":\\\"momo\\\"," +
                    "\\\"discountCode\\\":null}" 

                scope.launch {
                    try {
                        val res = withContext(Dispatchers.IO) { SupabaseApi.createOrderResult(token, payload) }
                        checkoutResult = "Order ${res.orderId ?: "created"} total ${res.total ?: 0}"
                        cart.clear()
                        loadRoleData()
                    } catch (e: Exception) { apiError = e.message }
                }
            }, modifier = Modifier.padding(top = 10.dp)) { Text("Create Order") }

            checkoutResult?.let { Text(it, modifier = Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.primary) }
            Divider(modifier = Modifier.padding(vertical = 12.dp))
        }

        if (session != null && (userRole == "seller" || userRole == "admin")) {
            item {
                Text("Seller", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("Stores: ${sellerVendors.size}")
                Text("Order items: ${sellerOrderItems.size}")
                Text("Payouts: ${sellerPayouts.size}")
                sellerVendors.forEach { Text("• ${it.name} (${it.status ?: "pending"})") }
                Divider(modifier = Modifier.padding(vertical = 12.dp))
            }
        }

        if (session != null && userRole == "admin") {
            item {
                Text("Admin", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
                Text("Vendors: ${vendors.size}")
                Text("Applications: ${adminApps.size}")
                Text("Discount codes: ${adminDiscounts.size}")
                adminApps.take(8).forEach { Text("• ${it.store_name} (${it.status})") }
                Divider(modifier = Modifier.padding(vertical = 12.dp))
            }
        }

        item {
            apiError?.let { Text("Error: $it", color = MaterialTheme.colorScheme.error) }
            Text("All website pages remain scaffolded individually in PageScreens.kt")
        }
    }
}

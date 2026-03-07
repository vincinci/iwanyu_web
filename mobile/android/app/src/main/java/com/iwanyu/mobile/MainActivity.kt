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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.CoroutineScope
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
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var session by remember { mutableStateOf<AuthSession?>(null) }
    var apiError by remember { mutableStateOf<String?>(null) }

    val products = remember { mutableStateListOf<Product>() }
    val cart = remember { mutableStateListOf<CartItem>() }
    var query by remember { mutableStateOf("") }

    var checkoutEmail by remember { mutableStateOf("") }
    var checkoutPhone by remember { mutableStateOf("") }
    var checkoutAddress by remember { mutableStateOf("") }
    var checkoutResult by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        try {
            val loaded = withContext(Dispatchers.IO) { SupabaseApi.fetchProducts(limit = 120) }
            products.clear()
            products.addAll(loaded)
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
            Text("Core flows wired to same Supabase backend as web.", modifier = Modifier.padding(top = 6.dp, bottom = 12.dp))
            Divider()
        }

        item {
            Text("Auth", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(value = email, onValueChange = { email = it }, label = { Text("Email") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = password, onValueChange = { password = it }, label = { Text("Password") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.padding(top = 8.dp)) {
                Button(onClick = {
                    apiError = null
                    checkoutResult = null
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val s = SupabaseApi.signIn(email, password)
                            runOnMain { session = s }
                        } catch (e: Exception) {
                            runOnMain { apiError = e.message }
                        }
                    }
                }) { Text("Login") }
                TextButton(onClick = {
                    apiError = null
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val s = SupabaseApi.signUp(email, password)
                            runOnMain { session = s }
                        } catch (e: Exception) {
                            runOnMain { apiError = e.message }
                        }
                    }
                }) { Text("Signup") }
            }
            session?.let {
                Text("Logged in: ${it.user.email ?: it.user.id}", modifier = Modifier.padding(top = 6.dp))
            }
            Divider(modifier = Modifier.padding(vertical = 12.dp))
        }

        item {
            Text("Search", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            OutlinedTextField(value = query, onValueChange = { query = it }, label = { Text("Search products") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp, bottom = 8.dp))
        }

        items(filtered.take(50), key = { it.id }) { p ->
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Text(p.title, fontWeight = FontWeight.SemiBold)
                Text("RWF ${p.price_rwf}")
                Text(p.category ?: "Uncategorized", style = MaterialTheme.typography.bodySmall)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 6.dp)) {
                    Button(onClick = {
                        val idx = cart.indexOfFirst { it.productId == p.id }
                        if (idx >= 0) {
                            val existing = cart[idx]
                            cart[idx] = existing.copy(quantity = existing.quantity + 1)
                        } else {
                            cart.add(CartItem(productId = p.id, title = p.title, priceRwf = p.price_rwf, quantity = 1))
                        }
                    }) { Text("Add to cart") }
                }
            }
            Divider()
        }

        item {
            Divider(modifier = Modifier.padding(vertical = 10.dp))
            Text("Cart & Checkout", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.SemiBold)
            if (cart.isEmpty()) {
                Text("Cart is empty", modifier = Modifier.padding(top = 8.dp))
            } else {
                cart.forEach { item ->
                    Text("• ${item.title} x${item.quantity} = RWF ${item.priceRwf * item.quantity}", modifier = Modifier.padding(top = 4.dp))
                }
                Text("Subtotal: RWF $subtotal", fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 8.dp))
            }

            OutlinedTextField(value = checkoutEmail, onValueChange = { checkoutEmail = it }, label = { Text("Checkout Email") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = checkoutPhone, onValueChange = { checkoutPhone = it }, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))
            OutlinedTextField(value = checkoutAddress, onValueChange = { checkoutAddress = it }, label = { Text("Address") }, modifier = Modifier.fillMaxWidth().padding(top = 8.dp))

            Button(
                onClick = {
                    val token = session?.access_token
                    if (token.isNullOrBlank()) {
                        apiError = "Login before checkout"
                        return@Button
                    }
                    if (cart.isEmpty()) {
                        apiError = "Cart is empty"
                        return@Button
                    }
                    apiError = null
                    checkoutResult = null
                    val itemsJson = cart.joinToString(",") { "{\\\"productId\\\":\\\"${it.productId}\\\",\\\"quantity\\\":${it.quantity}}" }
                    val payload = "{" +
                        "\\\"items\\\":[${itemsJson}]," +
                        "\\\"email\\\":\\\"${checkoutEmail}\\\"," +
                        "\\\"phone\\\":\\\"${checkoutPhone}\\\"," +
                        "\\\"address\\\":\\\"${checkoutAddress}\\\"," +
                        "\\\"paymentMethod\\\":\\\"momo\\\"," +
                        "\\\"discountCode\\\":null" +
                        "}"

                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val res = SupabaseApi.createOrderResult(token, payload)
                            runOnMain {
                                checkoutResult = "Order ${res.orderId ?: "created"} total ${res.total ?: 0}"
                                cart.clear()
                            }
                        } catch (e: Exception) {
                            runOnMain { apiError = e.message }
                        }
                    }
                },
                modifier = Modifier.padding(top = 10.dp)
            ) { Text("Create Order (Edge Function)") }

            checkoutResult?.let { Text(it, modifier = Modifier.padding(top = 8.dp), color = MaterialTheme.colorScheme.primary) }
            apiError?.let { Text("Error: $it", modifier = Modifier.padding(top = 6.dp), color = MaterialTheme.colorScheme.error) }
            Divider(modifier = Modifier.padding(vertical = 12.dp))
        }

        item {
            Text("All Website Pages are available as individual native screens in `PageScreens.kt`.")
        }
    }
}

private fun runOnMain(block: () -> Unit) {
    android.os.Handler(android.os.Looper.getMainLooper()).post { block() }
}

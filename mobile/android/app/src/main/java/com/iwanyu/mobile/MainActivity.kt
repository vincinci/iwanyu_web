package com.iwanyu.mobile

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.navigation.NavDestination
import androidx.navigation.NavDestination.Companion.hierarchy
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { MaterialTheme { IwanyuApp() } }
    }
}

data class CartItem(
    val productId: String,
    val title: String,
    val priceRwf: Int,
    val quantity: Int,
)

data class BottomRoute(val route: String, val title: String)

@Composable
fun IwanyuApp() {
    val scope = rememberCoroutineScope()
    val navController = rememberNavController()

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
            userRole = withContext(Dispatchers.IO) { SupabaseApi.fetchProfileRole(s.user.id, s.access_token) }
            orders.clear()
            orders.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchOrders(s.user.id, s.access_token) })

            if (userRole == "seller" || userRole == "admin") {
                sellerVendors.clear()
                sellerVendors.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchVendorsForOwner(s.user.id, s.access_token) })
                val ids = sellerVendors.map { it.id }
                sellerOrderItems.clear()
                sellerOrderItems.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchSellerOrderItems(ids, s.access_token) })
                sellerPayouts.clear()
                sellerPayouts.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchSellerPayouts(ids, s.access_token) })
            } else {
                sellerVendors.clear(); sellerOrderItems.clear(); sellerPayouts.clear()
            }

            if (userRole == "admin") {
                adminApps.clear()
                adminApps.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchAdminVendorApplications(s.access_token) })
                adminDiscounts.clear()
                adminDiscounts.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchAdminDiscountCodes(s.access_token) })
            } else {
                adminApps.clear(); adminDiscounts.clear()
            }
            apiError = null
        } catch (e: Exception) {
            apiError = e.message
        }
    }

    LaunchedEffect(Unit) {
        try {
            products.clear()
            products.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchProducts(120) })
            vendors.clear()
            vendors.addAll(withContext(Dispatchers.IO) { SupabaseApi.fetchVendors(120) })
        } catch (e: Exception) {
            apiError = e.message
        }
    }

    val bottomRoutes = buildList {
        add(BottomRoute("home", "Home"))
        add(BottomRoute("search", "Search"))
        add(BottomRoute("cart", "Cart"))
        add(BottomRoute("checkout", "Checkout"))
        add(BottomRoute("account", "Account"))
        if (session != null && (userRole == "seller" || userRole == "admin")) add(BottomRoute("seller", "Seller"))
        if (session != null && userRole == "admin") add(BottomRoute("admin", "Admin"))
    }

    Scaffold(
        bottomBar = {
            NavigationBar {
                val navBackStackEntry by navController.currentBackStackEntryAsState()
                val currentDestination = navBackStackEntry?.destination
                bottomRoutes.forEach { item ->
                    NavigationBarItem(
                        selected = currentDestination.isRouteInHierarchy(item.route),
                        onClick = {
                            navController.navigate(item.route) {
                                popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                                launchSingleTop = true
                                restoreState = true
                            }
                        },
                        icon = {},
                        label = { Text(item.title) }
                    )
                }
            }
        }
    ) { paddingValues ->
        NavHost(
            navController = navController,
            startDestination = "home",
            modifier = Modifier.padding(paddingValues)
        ) {
            composable("home") {
                HomeRoute(products = products, userRole = userRole, onAdd = { p ->
                    val idx = cart.indexOfFirst { it.productId == p.id }
                    if (idx >= 0) {
                        val ex = cart[idx]
                        cart[idx] = ex.copy(quantity = ex.quantity + 1)
                    } else {
                        cart.add(CartItem(p.id, p.title, p.price_rwf, 1))
                    }
                }, error = apiError)
            }
            composable("search") {
                SearchRoute(products = products, query = query, onQuery = { query = it }, onAdd = { p ->
                    val idx = cart.indexOfFirst { it.productId == p.id }
                    if (idx >= 0) {
                        val ex = cart[idx]
                        cart[idx] = ex.copy(quantity = ex.quantity + 1)
                    } else {
                        cart.add(CartItem(p.id, p.title, p.price_rwf, 1))
                    }
                })
            }
            composable("cart") {
                CartRoute(cart = cart)
            }
            composable("checkout") {
                CheckoutRoute(
                    session = session,
                    cart = cart,
                    checkoutEmail = checkoutEmail,
                    checkoutPhone = checkoutPhone,
                    checkoutAddress = checkoutAddress,
                    onCheckoutEmail = { checkoutEmail = it },
                    onCheckoutPhone = { checkoutPhone = it },
                    onCheckoutAddress = { checkoutAddress = it },
                    checkoutResult = checkoutResult,
                    error = apiError,
                    onCreateOrder = {
                        val token = session?.access_token ?: return@CheckoutRoute
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
                            } catch (e: Exception) {
                                apiError = e.message
                            }
                        }
                    }
                )
            }
            composable("account") {
                AccountRoute(
                    session = session,
                    userRole = userRole,
                    email = email,
                    password = password,
                    onEmail = { email = it },
                    onPassword = { password = it },
                    orders = orders,
                    onLogin = {
                        scope.launch {
                            try {
                                session = withContext(Dispatchers.IO) { SupabaseApi.signIn(email, password) }
                                loadRoleData()
                            } catch (e: Exception) { apiError = e.message }
                        }
                    },
                    onSignup = {
                        scope.launch {
                            try {
                                session = withContext(Dispatchers.IO) { SupabaseApi.signUp(email, password) }
                                loadRoleData()
                            } catch (e: Exception) { apiError = e.message }
                        }
                    },
                    onLogout = {
                        session = null
                        userRole = "buyer"
                        cart.clear(); orders.clear(); sellerVendors.clear(); sellerOrderItems.clear(); sellerPayouts.clear(); adminApps.clear(); adminDiscounts.clear()
                    }
                )
            }
            composable("seller") {
                SellerRoute(sellerVendors = sellerVendors, sellerOrderItems = sellerOrderItems, sellerPayouts = sellerPayouts)
            }
            composable("admin") {
                AdminRoute(vendors = vendors, apps = adminApps, discounts = adminDiscounts)
            }
        }
    }
}

private fun NavDestination?.isRouteInHierarchy(route: String): Boolean {
    return this?.hierarchy?.any { it.route == route } == true
}

@Composable
private fun HomeRoute(products: List<Product>, userRole: String, onAdd: (Product) -> Unit, error: String?) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        item {
            Text("iwanyu", style = MaterialTheme.typography.headlineMedium)
            Text("Role: $userRole")
            error?.let { Text("Error: $it", color = MaterialTheme.colorScheme.error) }
            Text("Featured", modifier = Modifier.padding(top = 8.dp))
        }
        items(products.take(20), key = { it.id }) { p ->
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Text(p.title, fontWeight = FontWeight.SemiBold)
                Text("RWF ${p.price_rwf}")
                Button(onClick = { onAdd(p) }, modifier = Modifier.padding(top = 6.dp)) { Text("Add to cart") }
            }
        }
    }
}

@Composable
private fun SearchRoute(products: List<Product>, query: String, onQuery: (String) -> Unit, onAdd: (Product) -> Unit) {
    val filtered = if (query.isBlank()) products else products.filter {
        it.title.contains(query, ignoreCase = true) || (it.category ?: "").contains(query, ignoreCase = true)
    }

    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        item {
            OutlinedTextField(value = query, onValueChange = onQuery, label = { Text("Search products") }, modifier = Modifier.fillMaxWidth())
        }
        items(filtered.take(60), key = { it.id }) { p ->
            Column(modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp)) {
                Text(p.title, fontWeight = FontWeight.SemiBold)
                Text("RWF ${p.price_rwf}")
                Text(p.category ?: "Uncategorized")
                Button(onClick = { onAdd(p) }, modifier = Modifier.padding(top = 6.dp)) { Text("Add") }
            }
        }
    }
}

@Composable
private fun CartRoute(cart: List<CartItem>) {
    val subtotal = cart.sumOf { it.priceRwf * it.quantity }
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp)) {
        item { Text("Cart", style = MaterialTheme.typography.headlineSmall) }
        items(cart, key = { it.productId }) { item ->
            Text("• ${item.title} x${item.quantity} = RWF ${item.priceRwf * item.quantity}", modifier = Modifier.padding(top = 6.dp))
        }
        item { Text("Subtotal: RWF $subtotal", modifier = Modifier.padding(top = 10.dp), fontWeight = FontWeight.SemiBold) }
    }
}

@Composable
private fun CheckoutRoute(
    session: AuthSession?,
    cart: List<CartItem>,
    checkoutEmail: String,
    checkoutPhone: String,
    checkoutAddress: String,
    onCheckoutEmail: (String) -> Unit,
    onCheckoutPhone: (String) -> Unit,
    onCheckoutAddress: (String) -> Unit,
    checkoutResult: String?,
    error: String?,
    onCreateOrder: () -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Checkout", style = MaterialTheme.typography.headlineSmall) }
        item { Text(if (session == null) "Login required" else "Logged in") }
        item { OutlinedTextField(value = checkoutEmail, onValueChange = onCheckoutEmail, label = { Text("Email") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(value = checkoutPhone, onValueChange = onCheckoutPhone, label = { Text("Phone") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(value = checkoutAddress, onValueChange = onCheckoutAddress, label = { Text("Address") }, modifier = Modifier.fillMaxWidth()) }
        item {
            Button(onClick = onCreateOrder, enabled = session != null && cart.isNotEmpty()) {
                Text("Create Order")
            }
        }
        checkoutResult?.let { item { Text(it, color = MaterialTheme.colorScheme.primary) } }
        error?.let { item { Text("Error: $it", color = MaterialTheme.colorScheme.error) } }
    }
}

@Composable
private fun AccountRoute(
    session: AuthSession?,
    userRole: String,
    email: String,
    password: String,
    onEmail: (String) -> Unit,
    onPassword: (String) -> Unit,
    orders: List<OrderBasic>,
    onLogin: () -> Unit,
    onSignup: () -> Unit,
    onLogout: () -> Unit,
) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        item { Text("Account", style = MaterialTheme.typography.headlineSmall) }
        item { Text("Role: $userRole") }
        item { OutlinedTextField(value = email, onValueChange = onEmail, label = { Text("Email") }, modifier = Modifier.fillMaxWidth()) }
        item { OutlinedTextField(value = password, onValueChange = onPassword, label = { Text("Password") }, modifier = Modifier.fillMaxWidth()) }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Button(onClick = onLogin) { Text("Login") }
                TextButton(onClick = onSignup) { Text("Signup") }
                TextButton(onClick = onLogout) { Text("Logout") }
            }
        }
        session?.let { item { Text("Logged in as ${it.user.email ?: it.user.id}") } }
        item { Text("Orders", style = MaterialTheme.typography.titleMedium) }
        items(orders, key = { it.id }) { order ->
            Text("• ${order.id} • ${order.status} • RWF ${order.total_rwf}")
        }
    }
}

@Composable
private fun SellerRoute(sellerVendors: List<VendorBasic>, sellerOrderItems: List<SellerOrderItem>, sellerPayouts: List<VendorPayout>) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        item { Text("Seller", style = MaterialTheme.typography.headlineSmall) }
        item { Text("Stores: ${sellerVendors.size}") }
        item { Text("Order items: ${sellerOrderItems.size}") }
        item { Text("Payouts: ${sellerPayouts.size}") }
        item { Text("Your stores", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 6.dp)) }
        items(sellerVendors, key = { it.id }) { v ->
            Text("• ${v.name} (${v.status ?: "pending"})")
        }
    }
}

@Composable
private fun AdminRoute(vendors: List<VendorBasic>, apps: List<VendorApplicationRow>, discounts: List<DiscountCodeRow>) {
    LazyColumn(modifier = Modifier.fillMaxSize().padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        item { Text("Admin", style = MaterialTheme.typography.headlineSmall) }
        item { Text("Vendors: ${vendors.size}") }
        item { Text("Applications: ${apps.size}") }
        item { Text("Discounts: ${discounts.size}") }
        item { Text("Recent applications", style = MaterialTheme.typography.titleMedium, modifier = Modifier.padding(top = 6.dp)) }
        items(apps.take(12), key = { it.id }) { a ->
            Text("• ${a.store_name} (${a.status})")
        }
    }
}

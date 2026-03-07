package com.iwanyu.mobile

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp

@Composable private fun ScreenTemplate(title: String) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(text = title)
        Text(text = "Native $title screen scaffolded and ready for API wiring.")
    }
}

@Composable fun SearchScreen() = ScreenTemplate("Search")
@Composable fun CategoryScreen() = ScreenTemplate("Category")
@Composable fun ProductScreen() = ScreenTemplate("Product")
@Composable fun DealsScreen() = ScreenTemplate("Deals")
@Composable fun CartScreen() = ScreenTemplate("Cart")
@Composable fun CheckoutScreen() = ScreenTemplate("Checkout")
@Composable fun PaymentCallbackScreen() = ScreenTemplate("Payment Callback")
@Composable fun WishlistScreen() = ScreenTemplate("Wishlist")

@Composable fun LoginScreen() = ScreenTemplate("Login")
@Composable fun SignupScreen() = ScreenTemplate("Signup")
@Composable fun LogoutScreen() = ScreenTemplate("Logout")
@Composable fun AccountScreen() = ScreenTemplate("Account")
@Composable fun OrdersScreen() = ScreenTemplate("Orders")
@Composable fun SellScreen() = ScreenTemplate("Sell")
@Composable fun SellerOnboardingScreen() = ScreenTemplate("Seller Onboarding")
@Composable fun VendorApplicationScreen() = ScreenTemplate("Vendor Application")
@Composable fun PrivacyPolicyScreen() = ScreenTemplate("Privacy Policy")
@Composable fun TermsOfServiceScreen() = ScreenTemplate("Terms Of Service")
@Composable fun StaticPageScreen() = ScreenTemplate("Static Page")
@Composable fun NotFoundScreen() = ScreenTemplate("Not Found")

@Composable fun AdminDashboardScreen() = ScreenTemplate("Admin Dashboard")
@Composable fun AdminVendorsScreen() = ScreenTemplate("Admin Vendors")
@Composable fun AdminProductsScreen() = ScreenTemplate("Admin Products")
@Composable fun AdminDiscountsScreen() = ScreenTemplate("Admin Discounts")
@Composable fun AdminApplicationsScreen() = ScreenTemplate("Admin Applications")

@Composable fun SellerDashboardScreen() = ScreenTemplate("Seller Dashboard")
@Composable fun SellerProductsScreen() = ScreenTemplate("Seller Products")
@Composable fun SellerNewProductScreen() = ScreenTemplate("Seller New Product")
@Composable fun SellerOrdersScreen() = ScreenTemplate("Seller Orders")
@Composable fun SellerPayoutsScreen() = ScreenTemplate("Seller Payouts")
@Composable fun SellerSettingsScreen() = ScreenTemplate("Seller Settings")

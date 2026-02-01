import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { 
  ShoppingBag, CreditCard, Smartphone, ArrowLeft, Lock, Truck, 
  ChevronRight, Shield, CheckCircle2, Loader2 
} from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart";
import { formatMoney } from "@/lib/money";
import { calculateServiceFee, calculateVendorPayout, GUEST_SERVICE_FEE_RATE } from "@/lib/fees";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { initializeFlutterwavePayment, redirectToFlutterwave } from "@/lib/flutterwave";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { items, subtotal } = useCart();
  const { user } = useAuth();
  const { products } = useMarketplace();
  const supabase = getSupabaseClient();
  
  const [isPlacing, setIsPlacing] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"momo" | "card">("momo");

  const serviceFee = calculateServiceFee(subtotal);
  const total = subtotal + serviceFee;

  const canPlaceOrder = useMemo(
    () => items.length > 0 && email.trim().length > 3 && address.trim().length > 5 && phone.trim().length >= 10,
    [items.length, email, address, phone]
  );

  const handleCheckout = async () => {
    if (isPlacing) return;
    setIsPlacing(true);
    
    try {
      const trimmedEmail = email.trim();
      const trimmedAddress = `${address.trim()}${city ? `, ${city.trim()}` : ""}`;
      const trimmedPhone = phone.trim();
      
      const orderItems = items.map((i) => {
        const p = products.find((x) => x.id === i.productId);
        return { ...i, vendorId: p?.vendorId };
      });

      if (!user) {
        navigate("/login", { state: { from: location }, replace: false });
        return;
      }

      if (!supabase) {
        throw new Error("Checkout is not configured.");
      }

      const serviceFeeRwf = calculateServiceFee(subtotal);
      const totalRwf = Math.round(subtotal + serviceFeeRwf);
      const vendorPayoutRwf = calculateVendorPayout(subtotal);

      const paymentMeta = {
        provider: "flutterwave",
        mode: "redirect",
        selected: paymentMethod,
        phone: trimmedPhone,
      };

      // Insert order and get the generated UUID
      const { data: orderData, error: ordErr } = await supabase.from("orders").insert({
        buyer_user_id: user.id,
        buyer_email: trimmedEmail,
        shipping_address: trimmedAddress,
        status: "Placed",
        total_rwf: totalRwf,
        service_fee_rwf: serviceFeeRwf,
        vendor_payout_rwf: vendorPayoutRwf,
        payment: paymentMeta,
      }).select("id").single();

      if (ordErr) throw new Error(ordErr.message);
      
      const orderId = orderData.id;

      const missingVendor = orderItems.find((i) => !i.vendorId);
      if (missingVendor) {
        throw new Error(`Missing vendor for product ${missingVendor.productId}`);
      }

      const rows = orderItems.map((i) => {
        const lineTotal = Math.round(i.price * i.quantity);
        return {
          order_id: orderId,
          product_id: i.productId,
          vendor_id: i.vendorId!,
          title: i.title,
          price_rwf: Math.round(i.price),
          quantity: i.quantity,
          image_url: i.image,
          status: "Placed",
          vendor_payout_rwf: calculateVendorPayout(lineTotal),
        };
      });

      const { error: itemsErr } = await supabase.from("order_items").insert(rows);
      if (itemsErr) throw new Error(itemsErr.message);

      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Please log in to continue");

      const customerName = user.name ?? user.email ?? trimmedEmail;

      const result = await initializeFlutterwavePayment(
        {
          txRef: orderId,
          amount: totalRwf,
          currency: "RWF",
          redirectUrl: `${window.location.origin}/payment-callback?orderId=${orderId}&amount=${totalRwf}`,
          paymentOptions: paymentMethod === "momo" ? "mobilemoney" : "card",
          customer: {
            email: trimmedEmail,
            name: customerName,
            phone_number: trimmedPhone,
          },
          customizations: {
            title: "iwanyu",
            description: `Order ${orderId}`,
          },
        },
        accessToken
      );

      if (!result?.paymentLink) {
        throw new Error("Failed to initialize payment. Please try again.");
      }

      sessionStorage.setItem("pendingOrderId", orderId);
      sessionStorage.setItem("pendingOrderAmount", String(totalRwf));

      redirectToFlutterwave(result.paymentLink);
    } catch (e) {
      toast({
        title: "Checkout failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setIsPlacing(false);
    }
  };

  if (items.length === 0) {
    return (
      <StorefrontPage>
        <div className="container min-h-screen py-16 flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <ShoppingBag className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Add some items to get started</p>
          <Link to="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-full px-8">
              Start Shopping
            </Button>
          </Link>
        </div>
      </StorefrontPage>
    );
  }

  return (
    <StorefrontPage>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="container py-4">
            <div className="flex items-center justify-between">
              <button 
                onClick={() => navigate("/cart")} 
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} />
                <span className="font-medium">Back to cart</span>
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock size={14} />
                <span>Secure checkout</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8 lg:py-12">
          <div className="max-w-5xl mx-auto">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-4 mb-10">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-amber-500 text-black flex items-center justify-center font-semibold text-sm">1</div>
                <span className="text-sm font-medium text-gray-900 hidden sm:inline">Details</span>
              </div>
              <ChevronRight className="text-gray-300" size={20} />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">2</div>
                <span className="text-sm font-medium text-gray-400 hidden sm:inline">Payment</span>
              </div>
              <ChevronRight className="text-gray-300" size={20} />
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-semibold text-sm">3</div>
                <span className="text-sm font-medium text-gray-400 hidden sm:inline">Complete</span>
              </div>
            </div>

            <div className="grid gap-8 lg:grid-cols-5">
              {/* Left Column - Form */}
              <div className="lg:col-span-3 space-y-6">
                {/* Contact Information */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                      <Input 
                        type="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="you@example.com" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone number</label>
                      <Input 
                        type="tel"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="0788 123 456" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">For delivery updates and Mobile Money payments</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">Shipping Address</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Street address</label>
                      <Input 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="KG 123 Street, Kigali" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">City / District</label>
                      <Input 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="Kigali" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white rounded-2xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                      <Shield className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Payment Method</h2>
                      <p className="text-sm text-gray-500">Secure payment powered by Flutterwave</p>
                    </div>
                  </div>
                  
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod("momo")}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === "momo" 
                          ? "border-amber-500 bg-amber-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        paymentMethod === "momo" ? "bg-amber-500" : "bg-gray-100"
                      }`}>
                        <Smartphone className={`h-6 w-6 ${paymentMethod === "momo" ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">Mobile Money</div>
                        <div className="text-xs text-gray-500">MTN MoMo / Airtel Money</div>
                      </div>
                      {paymentMethod === "momo" && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-amber-500" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod("card")}
                      className={`relative flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${
                        paymentMethod === "card" 
                          ? "border-amber-500 bg-amber-50" 
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                        paymentMethod === "card" ? "bg-amber-500" : "bg-gray-100"
                      }`}>
                        <CreditCard className={`h-6 w-6 ${paymentMethod === "card" ? "text-white" : "text-gray-500"}`} />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900">Debit / Credit Card</div>
                        <div className="text-xs text-gray-500">Visa, Mastercard</div>
                      </div>
                      {paymentMethod === "card" && (
                        <CheckCircle2 className="absolute top-3 right-3 h-5 w-5 text-amber-500" />
                      )}
                    </button>
                  </div>

                  <div className="mt-4 p-3 bg-blue-50 rounded-xl flex items-start gap-3">
                    <Lock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                    <p className="text-xs text-blue-700">
                      You'll be redirected to Flutterwave's secure payment page to complete your {paymentMethod === "momo" ? "Mobile Money" : "card"} payment.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-6 shadow-sm sticky top-24">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h2>
                  
                  {/* Items */}
                  <div className="space-y-4 max-h-64 overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.productId} className="flex gap-3">
                        <div className="h-16 w-16 rounded-xl bg-gray-100 shrink-0 overflow-hidden">
                          {item.image ? (
                            <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-gray-400">
                              <ShoppingBag size={20} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{item.title}</div>
                          <div className="text-xs text-gray-500">Qty: {item.quantity}</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            {formatMoney(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="border-t mt-4 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="font-medium text-gray-900">{formatMoney(subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Service fee ({GUEST_SERVICE_FEE_RATE * 100}%)</span>
                      <span className="font-medium text-gray-900">{formatMoney(serviceFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Shipping</span>
                      <span className="font-medium text-green-600">Free</span>
                    </div>
                  </div>

                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">Total</span>
                      <span className="text-2xl font-bold text-gray-900">{formatMoney(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={!canPlaceOrder || isPlacing}
                    className="w-full mt-6 h-14 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-black font-semibold text-base rounded-xl shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:shadow-none"
                  >
                    {isPlacing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Pay {formatMoney(total)}
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  {/* Trust Badges */}
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Lock size={12} />
                      <span>SSL Secured</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield size={12} />
                      <span>Buyer Protection</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </StorefrontPage>
  );
}

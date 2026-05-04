import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { 
  ShoppingBag, ArrowLeft, Lock, Truck, 
  ChevronRight, Shield, Loader2
} from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart";
import { formatMoney } from "@/lib/money";
import { calculateServiceFee, GUEST_SERVICE_FEE_RATE } from "@/lib/fees";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { usePreventDoubleClick } from "@/hooks/useRateLimit";
import { validateEmail, validatePhone } from "@/lib/security";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { t } = useLanguage();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const supabase = getSupabaseClient();
  
  const [isPlacing, setIsPlacing] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const [discountCodeInput, setDiscountCodeInput] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState<null | {
    code: string;
    discountRwf: number;
  }>(null);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const discountRwf = appliedDiscount?.discountRwf ?? 0;
  const discountedSubtotal = Math.max(0, Math.round(subtotal - discountRwf));

  const serviceFee = calculateServiceFee(discountedSubtotal);
  const total = discountedSubtotal + serviceFee;

  const canPlaceOrder = useMemo(
    () => items.length > 0 && email.trim().length > 3 && address.trim().length > 5 && phone.trim().length >= 10,
    [items.length, email, address, phone]
  );

  const applyDiscountCode = async () => {
    if (isApplyingDiscount) return;
    setIsApplyingDiscount(true);
    try {
      if (!supabase) throw new Error("Discounts are not configured");

      const normalized = discountCodeInput.trim().toUpperCase();
      if (!normalized) {
        setAppliedDiscount(null);
        return;
      }

      const { data, error } = await supabase
        .from("discount_codes")
        .select("code, discount_type, amount_rwf, percentage, min_subtotal_rwf")
        .eq("code", normalized)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Invalid or expired discount code");

      const minSubtotal = Math.max(0, Number(data.min_subtotal_rwf ?? 0));
      if (subtotal < minSubtotal) {
        throw new Error(`Minimum subtotal for this code is ${formatMoney(minSubtotal)}`);
      }

      let nextDiscount = 0;
      if (data.discount_type === "fixed") {
        nextDiscount = Math.max(0, Math.round(Number(data.amount_rwf ?? 0)));
      } else {
        const pct = Math.max(0, Math.min(100, Math.round(Number(data.percentage ?? 0))));
        nextDiscount = Math.round((Math.max(0, subtotal) * pct) / 100);
      }
      nextDiscount = Math.min(Math.max(0, Math.round(subtotal)), Math.max(0, nextDiscount));

      setAppliedDiscount({ code: data.code, discountRwf: nextDiscount });
      toast({ title: t("checkout.discountAppliedToast"), description: `${data.code} ${t("checkout.apply")}` });
    } finally {
      setIsApplyingDiscount(false);
    }
  };

  // Prevent double-click on checkout
  const { handler: handleCheckout, isProcessing: isCheckoutProcessing } = usePreventDoubleClick(
    async () => {
      const trimmedEmail = email.trim();
      const trimmedAddress = `${address.trim()}${city ? `, ${city.trim()}` : ""}`;
      const trimmedPhone = phone.trim();

      // Validate inputs
      const emailValidation = validateEmail(trimmedEmail);
      if (!emailValidation.valid) {
        throw new Error(emailValidation.error);
      }

      const phoneValidation = validatePhone(trimmedPhone);
      if (!phoneValidation.valid) {
        throw new Error(phoneValidation.error);
      }

      if (trimmedAddress.length < 5) {
        throw new Error("Please enter a valid shipping address");
      }

      if (!user) {
        navigate("/login", { state: { from: location }, replace: false });
        return;
      }

      if (!supabase) {
        throw new Error("Checkout is not configured.");
      }

      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Please log in to continue");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseAnonKey) throw new Error("Configuration missing");

      setIsPlacing(true);

      try {
        // Create order via server-side edge function (totals computed from DB prices)
        const createOrderRes = await fetch(
          `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/create-order`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: supabaseAnonKey,
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
              email: trimmedEmail,
              phone: trimmedPhone,
              address: trimmedAddress,
              paymentMethod: "cod",
              discountCode: appliedDiscount?.code ?? null,
            }),
          }
        );

        if (!createOrderRes.ok) {
          const errorText = await createOrderRes.text();
          let errorMessage = `Order creation failed (${createOrderRes.status})`;

          try {
            const parsed = JSON.parse(errorText) as { error?: string; message?: string };
            errorMessage = parsed.error || parsed.message || errorMessage;
          } catch {
            if (errorText.trim()) errorMessage = errorText.trim();
          }

          console.error("create-order failed", {
            status: createOrderRes.status,
            body: errorText,
          });

          throw new Error(errorMessage);
        }

        const { orderId } = await createOrderRes.json();

        // Order is persisted server-side; clear local cart and go to confirmation.
        clear();
        navigate(`/order-confirmation/${orderId}`);
      } catch (e) {
        toast({
          title: t("checkout.checkoutFailed"),
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
        setIsPlacing(false);
      }
    },
    3000 // 3 second cooldown
  );

  if (items.length === 0) {
    return (
      <StorefrontPage>
        <div className="container min-h-screen py-16 flex flex-col items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
            <ShoppingBag className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">{t("checkout.emptyTitle")}</h1>
          <p className="text-gray-500 mb-6">{t("checkout.emptyDesc")}</p>
          <Link to="/">
            <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-full px-8">
              {t("checkout.startShopping")}
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
                <span className="font-medium">{t("checkout.backToCart")}</span>
              </button>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Lock size={14} />
                <span>{t("checkout.secure")}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="container py-8 lg:py-12">
          <div className="max-w-5xl mx-auto">
            <h1 className="mb-6 text-3xl font-semibold text-gray-900">Checkout</h1>
            <div className="grid gap-8 lg:grid-cols-5">
              {/* Left Column - Form */}
              <div className="lg:col-span-3 space-y-6">
                {/* Contact Information */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("checkout.contactInfo")}</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("checkout.emailAddress")}</label>
                      <Input 
                        type="email"
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        placeholder="you@example.com" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("checkout.phone")}</label>
                      <Input 
                        type="tel"
                        value={phone} 
                        onChange={(e) => setPhone(e.target.value)} 
                        placeholder="07xxxxxxxx" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                      <p className="mt-1.5 text-xs text-gray-500">{t("checkout.phoneHint")}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                <div className="bg-white rounded-2xl p-6 border border-gray-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                      <Truck className="h-5 w-5 text-amber-600" />
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900">{t("checkout.shippingAddress")}</h2>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("checkout.streetAddress")}</label>
                      <Input 
                        value={address} 
                        onChange={(e) => setAddress(e.target.value)} 
                        placeholder="Street, City, State" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">{t("checkout.cityDistrict")}</label>
                      <Input 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="Kigali" 
                        className="h-12 rounded-xl border-gray-200 focus:border-amber-500 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Column - Order Summary */}
              <div className="lg:col-span-2">
                <div className="bg-white rounded-2xl p-6 border border-gray-100 sticky top-24">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("checkout.orderSummary")}</h2>
                  
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
                          <div className="text-xs text-gray-500">{t("checkout.qty")}: {item.quantity}</div>
                          <div className="text-sm font-semibold text-gray-900 mt-1">
                            {formatMoney(item.price * item.quantity)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Discount Code */}
                  <div className="mt-4">
                    <div className="text-xs font-medium text-gray-700 mb-1.5">{t("checkout.discountCode")}</div>
                    <div className="flex gap-2">
                      <Input
                        value={discountCodeInput}
                        onChange={(e) => setDiscountCodeInput(e.target.value)}
                        placeholder="SAVE10"
                        className="h-10 rounded-xl"
                        autoCapitalize="characters"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 rounded-xl"
                        disabled={isApplyingDiscount}
                        onClick={async () => {
                          try {
                            await applyDiscountCode();
                          } catch (e) {
                            toast({
                              title: t("checkout.discountFailed"),
                              description: e instanceof Error ? e.message : "Unknown error",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        {t("checkout.apply")}
                      </Button>
                    </div>
                    {appliedDiscount && (
                      <div className="mt-2 text-xs text-green-700">
                        {t("checkout.discountApplied")}: <span className="font-semibold">{appliedDiscount.code}</span> (-{formatMoney(appliedDiscount.discountRwf)})
                        <button
                          type="button"
                          className="ml-2 text-gray-500 hover:text-gray-900 underline"
                          onClick={() => setAppliedDiscount(null)}
                        >
                          {t("checkout.remove")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pricing */}
                  <div className="border-t mt-4 pt-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("cart.subtotal")}</span>
                      <span className="font-medium text-gray-900">{formatMoney(subtotal)}</span>
                    </div>
                    {discountRwf > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">{t("checkout.discount")}</span>
                        <span className="font-medium text-green-700">-{formatMoney(discountRwf)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("cart.serviceFee")} ({GUEST_SERVICE_FEE_RATE * 100}%)</span>
                      <span className="font-medium text-gray-900">{formatMoney(serviceFee)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">{t("cart.shipping")}</span>
                      <span className="font-medium text-green-600">{t("checkout.free")}</span>
                    </div>
                  </div>

                  <div className="border-t mt-4 pt-4">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-semibold text-gray-900">{t("cart.total")}</span>
                      <span className="text-2xl font-bold text-gray-900">{formatMoney(total)}</span>
                    </div>
                  </div>

                  {/* Checkout Button */}
                  <Button
                    onClick={handleCheckout}
                    disabled={!canPlaceOrder || isPlacing || isCheckoutProcessing}
                    className="w-full mt-6 h-12 bg-gray-900 hover:bg-gray-800 text-white font-semibold text-base rounded-xl disabled:opacity-50"
                  >
                    {isPlacing || isCheckoutProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {t("checkout.processing")}
                      </>
                    ) : (
                      <>
                        Place Order — {formatMoney(total)}
                        <ChevronRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>

                  {/* Trust Badges */}
                  <div className="mt-4 flex items-center justify-center gap-4 text-xs text-gray-400">
                    <div className="flex items-center gap-1">
                      <Lock size={12} />
                      <span>{t("checkout.sslSecured")}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield size={12} />
                      <span>{t("checkout.buyerProtection")}</span>
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

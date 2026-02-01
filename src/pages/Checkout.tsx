import { useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/cart";
import { formatMoney } from "@/lib/money";
import { calculateServiceFee, calculateVendorPayout, GUEST_SERVICE_FEE_RATE } from "@/lib/fees";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { createId } from "@/lib/ids";
import { initializeFlutterwavePayment, redirectToFlutterwave } from "@/lib/flutterwave";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { items, subtotal, clear } = useCart();
  const { user } = useAuth();
  const { products } = useMarketplace();
  const supabase = getSupabaseClient();
  const [isPlacing, setIsPlacing] = useState(false);
  const [email, setEmail] = useState(user?.email ?? "");
  const [address, setAddress] = useState("");

  const [paymentType, setPaymentType] = useState<"card" | "momo">("momo");
  const [momoNetwork, setMomoNetwork] = useState<"MTN" | "Airtel">("MTN");
  const [momoPhone, setMomoPhone] = useState("");
  const [cardNumber, setCardNumber] = useState("");

  const canPay = useMemo(() => {
    if (paymentType === "momo") return momoPhone.trim().length >= 8;
    return true;
  }, [paymentType, momoPhone]);

  const canPlaceOrder = useMemo(
    () => items.length > 0 && email.trim().length > 3 && address.trim().length > 5 && canPay,
    [items.length, email, address, canPay]
  );

  return (
    <StorefrontPage>
      <div className="container min-h-screen py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">Checkout</h1>
          <Link to="/cart" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            Back to cart
          </Link>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-lg border border-border bg-card p-6">
            <p className="text-sm text-muted-foreground">Your cart is empty.</p>
            <Link to="/">
              <Button className="mt-4 rounded-md">
                Shop products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 rounded-lg border border-border bg-card p-6">
              <h2 className="text-sm font-medium text-foreground">Contact</h2>
              <div className="mt-3">
                <label className="text-sm font-medium text-muted-foreground">Email</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="mt-1" />
              </div>

              <h2 className="mt-6 text-sm font-medium text-foreground">Shipping</h2>
              <div className="mt-3">
                <label className="text-sm font-medium text-muted-foreground">Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, City, State" className="mt-1" />
              </div>

              <h2 className="mt-6 text-sm font-medium text-foreground">Payment</h2>
              <div className="mt-3 rounded-lg border border-border bg-muted/30 p-4">
                <RadioGroup value={paymentType} onValueChange={(v) => setPaymentType(v as "card" | "momo")} className="grid gap-3">
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="momo" id="pay-momo" />
                    <Label htmlFor="pay-momo" className="font-medium text-foreground">Mobile Money (MTN / Airtel)</Label>
                  </div>
                  <div className="flex items-center gap-3">
                    <RadioGroupItem value="card" id="pay-card" />
                    <Label htmlFor="pay-card" className="font-medium text-foreground">Card (Visa / Mastercard)</Label>
                  </div>
                </RadioGroup>

                {paymentType === "momo" ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Network</label>
                      <div className="mt-1 flex gap-2">
                        <Button
                          type="button"
                          variant={momoNetwork === "MTN" ? "default" : "outline"}
                          className="rounded-md"
                          onClick={() => setMomoNetwork("MTN")}
                        >
                          MTN
                        </Button>
                        <Button
                          type="button"
                          variant={momoNetwork === "Airtel" ? "default" : "outline"}
                          className="rounded-md"
                          onClick={() => setMomoNetwork("Airtel")}
                        >
                          Airtel
                        </Button>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Phone</label>
                      <Input
                        value={momoPhone}
                        onChange={(e) => setMomoPhone(e.target.value)}
                        placeholder="07xxxxxxxx"
                        className="mt-1"
                        inputMode="tel"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <label className="text-sm font-medium text-muted-foreground">Card number</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="1234 5678 9012 3456"
                      className="mt-1"
                      inputMode="numeric"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">You will complete payment in a secure Flutterwave window.</p>
                  </div>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-md" onClick={() => navigate("/cart")}
                >
                  Back
                </Button>
                <Button
                  className="rounded-md"
                  disabled={!canPlaceOrder || isPlacing}
                  onClick={async () => {
                    if (isPlacing) return;
                    setIsPlacing(true);
                    try {
                      const trimmedEmail = email.trim();
                      const trimmedAddress = address.trim();
                      const orderItems = items.map((i) => {
                        const p = products.find((x) => x.id === i.productId);
                        return {
                          ...i,
                          vendorId: p?.vendorId,
                        };
                      });

                      if (!user) {
                        navigate("/login", { state: { from: location }, replace: false });
                        return;
                      }

                      if (!supabase) {
                        throw new Error("Checkout is not configured. Missing Supabase environment variables.");
                      }

                      const orderId = createId("ord");
                      const serviceFeeRwf = calculateServiceFee(subtotal);
                      const totalRwf = Math.round(subtotal + serviceFeeRwf);
                      const vendorPayoutRwf = calculateVendorPayout(subtotal);

                      const paymentMeta = {
                        provider: "flutterwave",
                        mode: "redirect",
                        selected: paymentType,
                        momoNetwork: paymentType === "momo" ? momoNetwork : undefined,
                        momoPhone: paymentType === "momo" ? momoPhone.trim() : undefined,
                      };

                      const { error: ordErr } = await supabase.from("orders").insert({
                        id: orderId,
                        buyer_user_id: user.id,
                        buyer_email: trimmedEmail,
                        shipping_address: trimmedAddress,
                        status: "Placed",
                        total_rwf: totalRwf,
                        service_fee_rwf: serviceFeeRwf,
                        vendor_payout_rwf: vendorPayoutRwf,
                        payment: paymentMeta,
                      });

                      if (ordErr) throw new Error(ordErr.message);

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
                      if (!accessToken) throw new Error("Missing auth session");

                      const customerName = user.name ?? user.email ?? trimmedEmail;

                      // Initialize payment and get redirect URL
                      const result = await initializeFlutterwavePayment(
                        {
                          txRef: orderId,
                          amount: totalRwf,
                          currency: "RWF",
                          redirectUrl: `${window.location.origin}/payment-callback?orderId=${orderId}&amount=${totalRwf}`,
                          paymentOptions: paymentType === "momo" ? "mobilemoney" : "card",
                          customer: {
                            email: trimmedEmail,
                            name: customerName,
                            phone_number: momoPhone.trim() || undefined,
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

                      // Store order ID in sessionStorage for callback
                      sessionStorage.setItem("pendingOrderId", orderId);
                      sessionStorage.setItem("pendingOrderAmount", String(totalRwf));

                      // Redirect to Flutterwave hosted checkout
                      redirectToFlutterwave(result.paymentLink);
                    } catch (e) {
                      toast({
                        title: "Checkout failed",
                        description: e instanceof Error ? e.message : "Unknown error",
                        variant: "destructive",
                      });
                    } finally {
                      setIsPlacing(false);
                    }
                  }}
                >
                  Place order
                </Button>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-5 h-fit">
              <h2 className="text-sm font-medium text-foreground">Summary</h2>
              <div className="mt-4 space-y-3 text-sm">
                {items.map((i) => (
                  <div key={i.productId} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-foreground">{i.title}</div>
                      <div className="text-muted-foreground">Qty {i.quantity}</div>
                    </div>
                    <div className="font-medium text-foreground">{formatMoney(i.price * i.quantity)}</div>
                  </div>
                ))}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">{formatMoney(subtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Service fee ({GUEST_SERVICE_FEE_RATE * 100}%)</span>
                    <span className="font-medium text-foreground">{formatMoney(calculateServiceFee(subtotal))}</span>
                  </div>
                  <div className="border-t pt-2 flex items-center justify-between">
                    <span className="text-foreground font-medium">Total</span>
                    <span className="text-foreground font-semibold">{formatMoney(subtotal + calculateServiceFee(subtotal))}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

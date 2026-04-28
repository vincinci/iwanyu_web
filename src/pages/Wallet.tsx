import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Wallet, Plus, ArrowLeft, Loader2, ShieldCheck, Send } from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { initializePawaPayDeposit, redirectToPawaPay } from "@/lib/pawapay";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getUserWalletBalance } from "@/lib/liveSessions";
import { useEffect } from "react";

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];
const MOBILE_NETWORKS = ["MTN", "Airtel", "Orange"];

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

    // Seller withdrawal state
    const [vendorId, setVendorId] = useState<string | null>(null);
    const [payoutBalance, setPayoutBalance] = useState<number | null>(null);
    const [isLoadingVendor, setIsLoadingVendor] = useState(true);
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [selectedNetwork, setSelectedNetwork] = useState<string>("MTN");
    const [phoneNumber, setPhoneNumber] = useState("");
    const [isWithdrawing, setIsWithdrawing] = useState(false);

  const amount = selectedPreset ?? (customAmount ? Number(customAmount) : 0);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/wallet", { replace: true });
      return;
    }
    getUserWalletBalance(user.id).then((w) => {
      setBalance(w?.availableRwf ?? 0);
      setLoadingBalance(false);
    });
    
      // Fetch vendor/seller payout balance
      const fetchVendor = async () => {
        try {
          const { data, error } = await supabase
            .from("vendors")
            .select("id, payout_balance_rwf")
            .eq("owner_user_id", user.id)
            .single();

          if (data) {
            setVendorId(data.id);
            setPayoutBalance(data.payout_balance_rwf ?? 0);
          }
        } catch (e) {
          // User may not be a seller
          console.log("Not a seller or error fetching vendor:", e);
        } finally {
          setIsLoadingVendor(false);
        }
      };

      fetchVendor();
    }, [user, navigate, supabase]);

  const handleTopUp = async () => {
    if (!user || !supabase || amount < 500) return;
    setIsProcessing(true);

    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Please log in to continue.");

      const correlationId = `wallet-${user.id}-${Date.now()}`;

      const result = await initializePawaPayDeposit(
        {
          amount: Math.round(amount),
          currency: "RWF",
          country: "RW",
          correlationId,
          notificationUrl: `${window.location.origin}/api/wallet-deposit-callback`,
        },
        accessToken
      );

      if (!result?.depositId || !result?.authenticationUrl) {
        throw new Error("Failed to initialize payment. Please try again.");
      }

      const { error: txnCreateErr } = await supabase
        .from("wallet_transactions")
        .insert({
          user_id: user.id,
          type: "deposit",
          amount_rwf: Math.round(amount),
          external_transaction_id: result.depositId,
          payment_method: "pawapay_momo",
          status: "pending",
          description: `PawaPay wallet deposit ${correlationId}`,
        });

      if (txnCreateErr) {
        console.warn("Failed to create pending wallet transaction:", txnCreateErr);
      }

      sessionStorage.setItem("pendingDepositId", result.depositId);
      redirectToPawaPay(result.authenticationUrl);
    } catch (e) {
      toast({
        title: "Top-up failed",
        description: e instanceof Error ? e.message : "Unknown error",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

    const handleWithdraw = async () => {
      if (!user || !vendorId || !supabase) {
        toast({
          title: "Error",
          description: "You must be a seller to withdraw.",
          variant: "destructive",
        });
        return;
      }

      const withdrawAmountNum = Number(withdrawAmount);
      if (withdrawAmountNum < 1000 || withdrawAmountNum > (payoutBalance ?? 0)) {
        toast({
          title: "Invalid amount",
          description: `Withdrawal must be between 1,000 and ${formatMoney(payoutBalance ?? 0)} RWF`,
          variant: "destructive",
        });
        return;
      }

      if (!phoneNumber || !selectedNetwork) {
        toast({
          title: "Missing information",
          description: "Please enter your phone number and select a network.",
          variant: "destructive",
        });
        return;
      }

      setIsWithdrawing(true);
      try {
        const session = (await supabase.auth.getSession()).data.session;
        const accessToken = session?.access_token;
        if (!accessToken) throw new Error("Please log in to continue.");

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/seller-withdrawal-callback`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              vendorId,
              amountRwf: Math.round(withdrawAmountNum),
              mobileNetwork: selectedNetwork,
              phoneNumber,
              reason: "Seller earnings withdrawal",
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Withdrawal failed. Please try again.");
        }

        toast({
          title: "Withdrawal initiated!",
          description: `Your withdrawal of ${formatMoney(withdrawAmountNum)} RWF has been initiated. You'll receive the funds in 1-2 minutes.`,
        });

        // Reset form
        setWithdrawAmount("");
        setPhoneNumber("");
        setSelectedNetwork("MTN");

        // Refresh payout balance
        const { data } = await supabase
          .from("vendors")
          .select("payout_balance_rwf")
          .eq("id", vendorId)
          .single();
        if (data) setPayoutBalance(data.payout_balance_rwf ?? 0);
      } catch (e) {
        toast({
          title: "Withdrawal failed",
          description: e instanceof Error ? e.message : "Unknown error",
          variant: "destructive",
        });
      } finally {
        setIsWithdrawing(false);
      }
    };

  return (
    <StorefrontPage>
      <div className="container max-w-lg mx-auto py-8 px-4">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center">
            <Wallet className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Wallet</h1>
            <p className="text-sm text-gray-500">Top up to bid in live auctions</p>
          </div>
        </div>

        {/* Balance card */}
        <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 p-6 text-white mb-8 shadow-lg">
          <p className="text-sm font-medium text-orange-100 mb-1">Available Balance</p>
          {loadingBalance ? (
            <div className="h-10 flex items-center">
              <Loader2 className="h-5 w-5 animate-spin text-white/70" />
            </div>
          ) : (
            <p className="text-4xl font-black tracking-tight">{formatMoney(balance ?? 0)}</p>
          )}
          <p className="text-xs text-orange-100 mt-3">Used for live auction bids</p>
        </div>

          {/* Seller Payout Balance (if seller) */}
          {!isLoadingVendor && vendorId && (
            <div className="rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-6 text-white mb-8 shadow-lg">
              <p className="text-sm font-medium text-green-100 mb-1">Available for Withdrawal</p>
              <p className="text-4xl font-black tracking-tight">{formatMoney(payoutBalance ?? 0)}</p>
              <p className="text-xs text-green-100 mt-3">Your seller earnings ready to withdraw</p>
            </div>
          )}

        {/* Top-up form */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-6">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">Select amount</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_AMOUNTS.map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedPreset(p);
                    setCustomAmount("");
                  }}
                  className={`rounded-xl border py-3 text-sm font-semibold transition-all ${
                    selectedPreset === p
                      ? "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-gray-200 text-gray-700 hover:border-amber-300 hover:bg-amber-50/50"
                  }`}
                >
                  {(p / 1000).toFixed(0)}k
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Or enter custom amount (RWF)</p>
            <Input
              type="number"
              placeholder="e.g. 15000"
              value={customAmount}
              min={500}
              onChange={(e) => {
                setCustomAmount(e.target.value);
                setSelectedPreset(null);
              }}
              className="rounded-xl text-base"
            />
            {customAmount && Number(customAmount) < 500 && (
              <p className="text-xs text-red-500 mt-1">Minimum top-up is 500 RWF</p>
            )}
          </div>

          {amount >= 500 && (
            <div className="rounded-xl bg-gray-50 px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-gray-500">Amount to add</span>
              <span className="font-bold text-gray-900">{formatMoney(Math.round(amount))}</span>
            </div>
          )}

          <Button
            onClick={handleTopUp}
            disabled={isProcessing || amount < 500}
            className="w-full rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold py-6 text-base disabled:opacity-50"
          >
            {isProcessing ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> Top Up {amount >= 500 ? formatMoney(Math.round(amount)) : ""}</>
            )}
          </Button>

          <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            Secured by PawaPay · Mobile money payments are non-refundable
          </div>
        </div>

          {/* Seller Withdrawal Form */}
          {!isLoadingVendor && vendorId && (
            <div className="rounded-2xl border border-green-200 bg-green-50 p-6 shadow-sm space-y-6 mt-8">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                  <Send className="h-5 w-5 text-green-600" />
                  Withdraw Earnings
                </h2>
                <p className="text-sm text-gray-600">
                  Withdraw your seller earnings directly to your mobile money account (MTN, Airtel, Orange)
                </p>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Withdrawal amount (RWF)</p>
                <Input
                  type="number"
                  placeholder="e.g. 50000"
                  value={withdrawAmount}
                  min={1000}
                  max={payoutBalance}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="rounded-xl text-base"
                />
                {withdrawAmount && (
                  <p className="text-xs text-gray-500 mt-1">
                    Min: 1,000 RWF | Available: {formatMoney(payoutBalance ?? 0)}
                  </p>
                )}
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Mobile network</p>
                <div className="flex gap-2">
                  {MOBILE_NETWORKS.map((network) => (
                    <button
                      key={network}
                      onClick={() => setSelectedNetwork(network)}
                      className={`flex-1 rounded-xl border py-2 text-sm font-semibold transition-all ${
                        selectedNetwork === network
                          ? "border-green-500 bg-green-100 text-green-700"
                          : "border-gray-200 text-gray-700 hover:border-green-300 hover:bg-green-50/50"
                      }`}
                    >
                      {network}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">Phone number</p>
                <Input
                  type="tel"
                  placeholder="+250788123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="rounded-xl text-base"
                />
                <p className="text-xs text-gray-500 mt-1">Format: +250... (E.164 international format)</p>
              </div>

              {withdrawAmount && Number(withdrawAmount) >= 1000 && (
                <div className="rounded-xl bg-white px-4 py-3 flex items-center justify-between text-sm border border-green-200">
                  <span className="text-gray-500">You will receive</span>
                  <span className="font-bold text-green-600">{formatMoney(Math.round(Number(withdrawAmount)))}</span>
                </div>
              )}

              <Button
                onClick={handleWithdraw}
                disabled={isWithdrawing || !withdrawAmount || Number(withdrawAmount) < 1000 || (payoutBalance ?? 0) < 1000}
                className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold py-6 text-base disabled:opacity-50"
              >
                {isWithdrawing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" /> Withdraw{" "}
                    {withdrawAmount && Number(withdrawAmount) >= 1000 ? formatMoney(Math.round(Number(withdrawAmount))) : ""}
                  </>
                )}
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Funds typically arrive within 1-2 minutes. Your payout balance will be updated after confirmation.
              </p>
              {(payoutBalance ?? 0) < 1000 && (
                <p className="text-xs text-amber-700 text-center">
                  You need at least {formatMoney(1000)} in seller earnings before you can withdraw.
                </p>
              )}
            </div>
          )}

        {/* Back to live */}
        <p className="text-center text-sm text-gray-400 mt-6">
          Ready to bid?{" "}
          <Link to="/live" className="text-amber-600 font-medium hover:underline">
            Browse live auctions
          </Link>
        </p>
      </div>
    </StorefrontPage>
  );
}

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { paymentService } from "@/lib/payment";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getUserWalletBalance } from "@/lib/liveSessions";
import {
  getUserCountry,
  getPaymentConfig,
  detectCountryFromPhone,
  type CountryCode,
  type MobileNetwork,
} from "@/lib/region";

function getPhoneNormalizer(countryCode: CountryCode) {
  return function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const detected = detectCountryFromPhone(value);
    const code = detected || countryCode;
    switch (code) {
      case "RW":
        if (digits.startsWith("250") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `250${digits.slice(1)}`;
        if (digits.startsWith("7") && digits.length === 9) return `250${digits}`;
        break;
      case "KE":
        if (digits.startsWith("254") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `254${digits.slice(1)}`;
        if (digits.startsWith("7") && digits.length === 9) return `254${digits}`;
        break;
      case "UG":
        if (digits.startsWith("256") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `256${digits.slice(1)}`;
        if (digits.startsWith("7") && digits.length === 9) return `256${digits}`;
        break;
      default:
        if (digits.startsWith("250") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `250${digits.slice(1)}`;
        if (digits.startsWith("7") && digits.length === 9) return `250${digits}`;
    }
    return digits;
  };
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [countryCode, setCountryCode] = useState<CountryCode>("RW");
  const [paymentConfig, setPaymentConfig] = useState(() => getPaymentConfig("RW"));
  const [mobileNetworks, setMobileNetworks] = useState<MobileNetwork[]>(paymentConfig.mobileNetworks);
  const [isLoadingRegion, setIsLoadingRegion] = useState(true);

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [profilePhone, setProfilePhone] = useState("");

  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [depositPhoneMode, setDepositPhoneMode] = useState<"saved" | "other">("saved");
  const [depositPhoneInput, setDepositPhoneInput] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<MobileNetwork>(mobileNetworks[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const normalizePhone = getPhoneNormalizer(countryCode);
  const amount = selectedPreset ?? (customAmount ? Number(customAmount) : 0);
  const normalizedProfilePhone = normalizePhone(profilePhone);
  const normalizedDepositPhone =
    depositPhoneMode === "saved" ? normalizedProfilePhone : normalizePhone(depositPhoneInput);
  const canSubmitDeposit = amount >= paymentConfig.minDeposit && Boolean(normalizedDepositPhone);

  const withdrawAmountNum = withdrawPhone ? Number(withdrawAmount) : 0;
  const canSubmitWithdraw = withdrawAmountNum >= 500 && withdrawAmountNum <= (balance ?? 0) && withdrawPhone.trim().length >= 9;

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/wallet", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const country = await getUserCountry();
        setCountryCode(country);
        const config = getPaymentConfig(country);
        setPaymentConfig(config);
        setMobileNetworks(config.mobileNetworks);
        if (config.mobileNetworks.length > 0) setSelectedNetwork(config.mobileNetworks[0]);

        const wallet = await getUserWalletBalance(user.id);
        setBalance(wallet?.availableRwf ?? 0);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .maybeSingle();

        const phone = profileData?.phone ?? "";
        setProfilePhone(phone);
        if (!phone) setDepositPhoneMode("other");
      } catch (e) {
        console.error("Failed to load wallet page:", e);
      } finally {
        setLoadingBalance(false);
        setIsLoadingRegion(false);
      }
    };

    void load();
  }, [navigate, supabase, user]);

  const handleTopUp = async () => {
    if (!user || amount < paymentConfig.minDeposit) return;
    if (!normalizedDepositPhone) {
      toast({ title: "Phone required", description: "Enter the mobile money number to charge.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const result = await paymentService.depositMobileMoney(
        { amount: Math.round(amount), phone: normalizedDepositPhone, method: "mobile_money", country: countryCode, provider: selectedNetwork?.shortName },
        user.id
      );
      if (!result.success) {
        toast({ title: "Deposit failed", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Deposit failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !canSubmitWithdraw) return;
    const amountRwf = Math.round(withdrawAmountNum);
    const normalizedWithdrawPhone = normalizePhone(withdrawPhone);
    if (!normalizedWithdrawPhone) {
      toast({ title: "Invalid phone", description: "Enter a valid mobile money number.", variant: "destructive" });
      return;
    }
    setIsWithdrawing(true);
    try {
      const session = (await supabase.auth.getSession()).data.session;
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Please log in to continue");

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const res = await fetch(`${supabaseUrl}/functions/v1/wallet-withdrawal`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: supabaseAnonKey,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ amountRwf, phoneNumber: normalizedWithdrawPhone }),
      });
      const data = await res.json() as { success?: boolean; message?: string; error?: string; newBalance?: number };
      if (!res.ok) throw new Error(data.error ?? "Withdrawal failed");

      toast({ title: "Withdrawal initiated", description: data.message ?? `${formatMoney(amountRwf)} is on the way.` });
      setWithdrawAmount("");
      setWithdrawPhone("");
      if (typeof data.newBalance === "number") setBalance(data.newBalance);
    } catch (error) {
      toast({ title: "Withdrawal failed", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <StorefrontPage>
      <div className="container mx-auto max-w-md px-4 py-6">
        <button type="button" onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900">
          Back
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My wallet</h1>
              <p className="mt-1 text-sm text-gray-500">Deposit or withdraw funds via mobile money.</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">Balance</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">{loadingBalance ? "..." : formatMoney(balance ?? 0)}</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("deposit")}
            className={`h-11 rounded-2xl border text-sm font-medium transition ${
              activeTab === "deposit"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            Deposit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("withdraw")}
            className={`h-11 rounded-2xl border text-sm font-medium transition ${
              activeTab === "withdraw"
                ? "border-gray-900 bg-gray-900 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
            }`}
          >
            Withdraw
          </button>
        </div>

        {activeTab === "deposit" && (
          <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-gray-900">Deposit via Mobile Money</p>
              <p className="mt-1 text-sm text-gray-500">Choose an amount and the phone number to charge.</p>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1000, 5000, 10000, 20000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => { setSelectedPreset(preset); setCustomAmount(""); }}
                  className={`rounded-2xl border px-2 py-3 text-sm font-medium transition ${
                    selectedPreset === preset ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                  }`}
                >
                  {preset / 1000}k
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Custom amount</label>
              <Input
                type="number"
                placeholder={`Min. ${paymentConfig.minDeposit} RWF`}
                value={customAmount}
                min={paymentConfig.minDeposit}
                onChange={(e) => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
                className="h-12 rounded-2xl border-gray-200"
              />
              {customAmount && Number(customAmount) < paymentConfig.minDeposit && (
                <p className="text-xs text-gray-500">Minimum is {formatMoney(paymentConfig.minDeposit)}.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Network</label>
              <div className="grid grid-cols-2 gap-2">
                {isLoadingRegion ? (
                  <p className="col-span-2 text-xs text-gray-400">Detecting region...</p>
                ) : mobileNetworks.map((network) => (
                  <button
                    key={network.id}
                    type="button"
                    onClick={() => setSelectedNetwork(network)}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      selectedNetwork?.id === network.id ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {network.name}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500">Region: {paymentConfig.country.flag} {paymentConfig.country.name}</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Deposit from</label>
              {normalizedProfilePhone ? (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDepositPhoneMode("saved")}
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${depositPhoneMode === "saved" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}
                  >
                    Saved number
                  </button>
                  <button
                    type="button"
                    onClick={() => setDepositPhoneMode("other")}
                    className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${depositPhoneMode === "other" ? "border-gray-900 bg-gray-900 text-white" : "border-gray-200 text-gray-700 hover:border-gray-400"}`}
                  >
                    Another number
                  </button>
                </div>
              ) : null}

              {depositPhoneMode === "saved" && normalizedProfilePhone ? (
                <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700">
                  +{normalizedProfilePhone}
                </div>
              ) : (
                <Input
                  type="tel"
                  placeholder="+250788123456"
                  value={depositPhoneInput}
                  onChange={(e) => setDepositPhoneInput(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
              )}
            </div>

            {amount >= paymentConfig.minDeposit && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">Amount</span>
                  <span className="font-medium text-gray-900">{formatMoney(Math.round(amount))}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-gray-500">Number</span>
                  <span className="font-medium text-gray-900">{normalizedDepositPhone ? `+${normalizedDepositPhone}` : "Add number"}</span>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={handleTopUp}
              disabled={isProcessing || !canSubmitDeposit || isLoadingRegion}
              className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isProcessing ? "Starting deposit..." : isLoadingRegion ? "Detecting region..." : `Deposit ${amount >= paymentConfig.minDeposit ? formatMoney(Math.round(amount)) : ""}`}
            </Button>

            <p className="text-xs text-gray-500">
              Your wallet balance is used for bidding and live stream purchases only. You will confirm the payment on your phone.
            </p>
          </div>
          </div>
        )}

        {activeTab === "withdraw" && (
          <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="space-y-5">
            <div>
              <p className="text-base font-semibold text-gray-900">Withdraw to Mobile Money</p>
              <p className="mt-1 text-sm text-gray-500">Send your wallet balance to your mobile money account.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Amount (RWF)</label>
              <Input
                type="number"
                placeholder="Min. 500 RWF"
                value={withdrawAmount}
                min={500}
                max={balance ?? 0}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="h-12 rounded-2xl border-gray-200"
              />
              {withdrawAmount && withdrawAmountNum > (balance ?? 0) && (
                <p className="text-xs text-red-500">Exceeds your balance of {formatMoney(balance ?? 0)}.</p>
              )}
              {withdrawAmount && withdrawAmountNum < 500 && (
                <p className="text-xs text-gray-500">Minimum withdrawal is {formatMoney(500)}.</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900">Send to phone</label>
              <Input
                type="tel"
                placeholder="+250788123456"
                value={withdrawPhone}
                onChange={(e) => setWithdrawPhone(e.target.value)}
                className="h-12 rounded-2xl border-gray-200"
              />
            </div>

            {canSubmitWithdraw && (
              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">You receive</span>
                  <span className="font-medium text-gray-900">{formatMoney(withdrawAmountNum)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-gray-500">Remaining balance</span>
                  <span className="font-medium text-gray-900">{formatMoney((balance ?? 0) - withdrawAmountNum)}</span>
                </div>
              </div>
            )}

            <Button
              type="button"
              onClick={handleWithdraw}
              disabled={isWithdrawing || !canSubmitWithdraw}
              className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {isWithdrawing ? "Processing..." : `Withdraw ${canSubmitWithdraw ? formatMoney(withdrawAmountNum) : ""}`}
            </Button>

            <p className="text-xs text-gray-500">
              Withdrawals are sent directly to your mobile money number. Allow a few minutes for processing.
            </p>
          </div>
          </div>
        )}
      </div>
    </StorefrontPage>
  );
}

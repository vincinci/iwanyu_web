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
      toast({ title: "Deposit failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
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
      toast({ title: "Withdrawal failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <StorefrontPage>
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-sm px-4 pb-12 pt-6">

          {/* Back */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-6 flex items-center gap-1.5 text-sm text-gray-400 transition-colors hover:text-gray-700"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Back
          </button>

          {/* Balance card */}
          <div className="relative overflow-hidden rounded-3xl bg-gray-950 px-6 py-7 text-white shadow-2xl shadow-gray-900/30">
            {/* Subtle glow circles */}
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-white/[0.03]" />

            <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Available balance</p>
            <p className="mt-2 text-[2.75rem] font-semibold leading-none tracking-tight">
              {loadingBalance
                ? <span className="inline-block h-9 w-36 animate-pulse rounded-xl bg-white/10" />
                : formatMoney(balance ?? 0)}
            </p>
            <p className="mt-1.5 text-sm font-medium text-white/30">Rwandan Franc · RWF</p>

            {/* Tab pills inside card */}
            <div className="mt-6 inline-flex rounded-2xl bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setActiveTab("deposit")}
                className={`h-8 rounded-xl px-5 text-xs font-semibold transition-all ${
                  activeTab === "deposit" ? "bg-white text-gray-950 shadow-sm" : "text-white/60 hover:text-white/90"
                }`}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("withdraw")}
                className={`h-8 rounded-xl px-5 text-xs font-semibold transition-all ${
                  activeTab === "withdraw" ? "bg-white text-gray-950 shadow-sm" : "text-white/60 hover:text-white/90"
                }`}
              >
                Withdraw
              </button>
            </div>
          </div>

          {/* Deposit form */}
          {activeTab === "deposit" && (
            <div className="mt-5 space-y-4">

              {/* Amount presets */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Amount</p>
                <div className="grid grid-cols-4 gap-2">
                  {[1000, 5000, 10000, 20000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => { setSelectedPreset(preset); setCustomAmount(""); }}
                      className={`rounded-xl py-2.5 text-sm font-semibold transition-all ${
                        selectedPreset === preset
                          ? "bg-gray-950 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {preset >= 1000 ? `${preset / 1000}k` : preset}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <Input
                    type="number"
                    placeholder={`Custom · min ${paymentConfig.minDeposit}`}
                    value={customAmount}
                    min={paymentConfig.minDeposit}
                    onChange={(e) => { setCustomAmount(e.target.value); setSelectedPreset(null); }}
                    className="h-11 rounded-xl border-0 bg-gray-100 text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300"
                  />
                  {customAmount && Number(customAmount) < paymentConfig.minDeposit && (
                    <p className="mt-1.5 text-xs text-gray-400">Minimum is {formatMoney(paymentConfig.minDeposit)}</p>
                  )}
                </div>
              </div>

              {/* Network */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Network · {isLoadingRegion ? "detecting…" : `${paymentConfig.country.flag} ${paymentConfig.country.name}`}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {isLoadingRegion ? (
                    <>
                      <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
                      <div className="h-11 animate-pulse rounded-xl bg-gray-100" />
                    </>
                  ) : mobileNetworks.map((network) => (
                    <button
                      key={network.id}
                      type="button"
                      onClick={() => setSelectedNetwork(network)}
                      className={`h-11 rounded-xl text-sm font-semibold transition-all ${
                        selectedNetwork?.id === network.id
                          ? "bg-gray-950 text-white shadow-sm"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {network.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Phone */}
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Charge number</p>
                {normalizedProfilePhone && (
                  <div className="mb-2 flex gap-2">
                    {(["saved", "other"] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDepositPhoneMode(mode)}
                        className={`h-8 rounded-lg px-3.5 text-xs font-semibold transition-all ${
                          depositPhoneMode === mode
                            ? "bg-gray-950 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {mode === "saved" ? "Saved" : "Other"}
                      </button>
                    ))}
                  </div>
                )}
                {depositPhoneMode === "saved" && normalizedProfilePhone ? (
                  <div className="flex h-11 items-center rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700">
                    +{normalizedProfilePhone}
                  </div>
                ) : (
                  <Input
                    type="tel"
                    placeholder="+250 788 123 456"
                    value={depositPhoneInput}
                    onChange={(e) => setDepositPhoneInput(e.target.value)}
                    className="h-11 rounded-xl border-0 bg-gray-100 text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300"
                  />
                )}
              </div>

              {/* Summary row */}
              {amount >= paymentConfig.minDeposit && (
                <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                  <span className="text-sm text-gray-400">You deposit</span>
                  <span className="text-sm font-bold text-gray-950">{formatMoney(Math.round(amount))}</span>
                </div>
              )}

              <Button
                type="button"
                onClick={handleTopUp}
                disabled={isProcessing || !canSubmitDeposit || isLoadingRegion}
                className="h-13 w-full rounded-2xl bg-gray-950 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 disabled:opacity-40"
              >
                {isProcessing ? "Starting…" : isLoadingRegion ? "Detecting region…" : `Deposit${amount >= paymentConfig.minDeposit ? ` ${formatMoney(Math.round(amount))}` : ""}`}
              </Button>

              <p className="text-center text-xs text-gray-400">
                You'll confirm on your phone. Balance is used for bidding & live purchases.
              </p>
            </div>
          )}

          {/* Withdraw form */}
          {activeTab === "withdraw" && (
            <div className="mt-5 space-y-4">

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Amount · min 500 RWF</p>
                <Input
                  type="number"
                  placeholder="Enter amount"
                  value={withdrawAmount}
                  min={500}
                  max={balance ?? 0}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-gray-100 text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
                {withdrawAmount && withdrawAmountNum > (balance ?? 0) && (
                  <p className="mt-1.5 text-xs text-red-400">Exceeds your balance of {formatMoney(balance ?? 0)}</p>
                )}
                {withdrawAmount && withdrawAmountNum > 0 && withdrawAmountNum < 500 && (
                  <p className="mt-1.5 text-xs text-gray-400">Minimum is {formatMoney(500)}</p>
                )}
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">Send to</p>
                <Input
                  type="tel"
                  placeholder="+250 788 123 456"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="h-11 rounded-xl border-0 bg-gray-100 text-sm placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-300"
                />
              </div>

              {canSubmitWithdraw && (
                <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-400">You receive</span>
                    <span className="text-sm font-bold text-gray-950">{formatMoney(withdrawAmountNum)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-gray-400">Remaining</span>
                    <span className="text-sm font-medium text-gray-600">{formatMoney((balance ?? 0) - withdrawAmountNum)}</span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing || !canSubmitWithdraw}
                className="h-13 w-full rounded-2xl bg-gray-950 text-sm font-semibold text-white shadow-lg shadow-gray-900/20 hover:bg-gray-800 disabled:opacity-40"
              >
                {isWithdrawing ? "Processing…" : `Withdraw${canSubmitWithdraw ? ` ${formatMoney(withdrawAmountNum)}` : ""}`}
              </Button>

              <p className="text-center text-xs text-gray-400">
                Sent directly to your mobile money. Allow a few minutes.
              </p>
            </div>
          )}

        </div>
      </div>
    </StorefrontPage>
  );
}

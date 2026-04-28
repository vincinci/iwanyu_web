import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { paymentService, InsufficientFundsError, PaymentError } from "@/lib/payment";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getUserWalletBalance } from "@/lib/liveSessions";
import {
  getUserCountry,
  getPaymentConfig,
  detectCountryFromPhone,
  type CountryCode,
  type MobileNetwork,
} from "@/lib/region";

type WalletPanel = "deposit" | "withdraw";

interface PhoneNormalizer {
  (value: string): string;
}

function getPhoneNormalizer(countryCode: CountryCode): PhoneNormalizer {
  return function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";


    // Try to detect country from phone number first
    const detectedCountry = detectCountryFromPhone(value);
    const code = detectedCountry || countryCode;

    // Country-specific normalization
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
      case "NG":
        if (digits.startsWith("234") && digits.length === 13) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `234${digits.slice(1)}`;
        if (digits.startsWith("8") && digits.length === 9) return `234${digits}`;
        break;
      case "GH":
        if (digits.startsWith("233") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 9) return `233${digits.slice(1)}`;
        if (digits.startsWith("5") && digits.length === 9) return `233${digits}`;
        break;
      case "TZ":
        if (digits.startsWith("255") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `255${digits.slice(1)}`;
        if (digits.startsWith("6") && digits.length === 9) return `255${digits}`;
        break;
      case "ZM":
        if (digits.startsWith("260") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 9) return `260${digits.slice(1)}`;
        if (digits.startsWith("9") && digits.length === 9) return `260${digits}`;
        break;
      default:
        // Default to Rwanda format
        if (digits.startsWith("250") && digits.length === 12) return digits;
        if (digits.startsWith("0") && digits.length === 10) return `250${digits.slice(1)}`;
        if (digits.startsWith("7") && digits.length === 9) return `250${digits}`;
    }

    return digits;
  };
}

function formatPhonePreview(value: string, countryCode: CountryCode): string {
  const normalize = getPhoneNormalizer(countryCode);
  const normalized = normalize(value);
  return normalized ? `+${normalized}` : value.trim();
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  // Region detection
  const [countryCode, setCountryCode] = useState<CountryCode>("RW");
  const [paymentConfig, setPaymentConfig] = useState(() => getPaymentConfig("RW"));
  const [mobileNetworks, setMobileNetworks] = useState<MobileNetwork[]>(paymentConfig.mobileNetworks);
  const [isLoadingRegion, setIsLoadingRegion] = useState(true);

  const [activePanel, setActivePanel] = useState<WalletPanel>("deposit");
  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [profilePhone, setProfilePhone] = useState("");

  const [customAmount, setCustomAmount] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<number | null>(null);
  const [depositPhoneMode, setDepositPhoneMode] = useState<"saved" | "other">("saved");
  const [depositPhoneInput, setDepositPhoneInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const [vendorId, setVendorId] = useState<string | null>(null);
  const [payoutBalance, setPayoutBalance] = useState<number | null>(null);
  const [isLoadingVendor, setIsLoadingVendor] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [selectedNetwork, setSelectedNetwork] = useState<MobileNetwork>(mobileNetworks[0]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // Get normalized phone function for current country
  const normalizePhone = getPhoneNormalizer(countryCode);

  const amount = selectedPreset ?? (customAmount ? Number(customAmount) : 0);
  const withdrawAmountNumber = Number(withdrawAmount || 0);
  const normalizedProfilePhone = normalizePhone(profilePhone);
  const normalizedDepositPhone =
    depositPhoneMode === "saved"
      ? normalizedProfilePhone
      : normalizePhone(depositPhoneInput);
  const normalizedWithdrawalPhone = normalizePhone(phoneNumber);
  const hasEnoughSellerBalance = (payoutBalance ?? 0) >= paymentConfig.minWithdrawal;
  const canSubmitDeposit = amount >= paymentConfig.minDeposit && Boolean(normalizedDepositPhone);
  const canSubmitWithdrawal =
    hasEnoughSellerBalance &&
    withdrawAmountNumber >= paymentConfig.minWithdrawal &&
    withdrawAmountNumber <= (payoutBalance ?? 0) &&
    Boolean(normalizedWithdrawalPhone);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/wallet", { replace: true });
      return;
    }

    const loadWallet = async () => {
      try {
        // Load user's country first
        const country = await getUserCountry();
        setCountryCode(country);
        const config = getPaymentConfig(country);
        setPaymentConfig(config);
        setMobileNetworks(config.mobileNetworks);
        
        // Set default network for user's country
        if (config.mobileNetworks.length > 0) {
          setSelectedNetwork(config.mobileNetworks[0]);
        }

        const wallet = await getUserWalletBalance(user.id);
        setBalance(wallet?.availableRwf ?? 0);

        const { data: profileData } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .maybeSingle();

        const nextProfilePhone = profileData?.phone ?? "";
        setProfilePhone(nextProfilePhone);
        if (nextProfilePhone && !phoneNumber) {
          setPhoneNumber(nextProfilePhone);
        }
        if (!nextProfilePhone) {
          setDepositPhoneMode("other");
        }

        const { data: vendorData } = await supabase
          .from("vendors")
          .select("id, payout_balance_rwf")
          .eq("owner_user_id", user.id)
          .maybeSingle();

        if (vendorData) {
          setVendorId(vendorData.id);
          setPayoutBalance(vendorData.payout_balance_rwf ?? 0);
        } else {
          setVendorId(null);
          setPayoutBalance(null);
          setActivePanel("deposit");
        }
      } catch (error) {
        console.error("Failed to load wallet page:", error);
      } finally {
        setLoadingBalance(false);
        setIsLoadingVendor(false);
        setIsLoadingRegion(false);
      }
    };

    void loadWallet();
  }, [navigate, supabase, user]);

    const handleTopUp = async () => {
    if (!user || amount < paymentConfig.minDeposit) return;

    if (!normalizedDepositPhone) {
      toast({
        title: "Phone number required",
        description: "Enter the mobile money number you want to use for this deposit.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      const result = await paymentService.depositMobileMoney(
        {
          amount: Math.round(amount),
          phone: normalizedDepositPhone,
          method: "mobile_money",
        },
        user.id
      );

      if (!result.success) {
        toast({
          title: "Deposit failed",
          description: result.message,
          variant: "destructive",
        });
      }
      // If success, user is redirected to PawaPay
    } catch (error) {
      toast({
        title: "Deposit failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

    const handleWithdraw = async () => {
    if (!user || !vendorId) {
      toast({
        title: "Withdrawal unavailable",
        description: "You must be a seller to withdraw earnings.",
        variant: "destructive",
      });
      return;
    }

    if (!normalizedWithdrawalPhone) {
      toast({
        title: "Phone number required",
        description: "Enter a valid mobile money number.",
        variant: "destructive",
      });
      return;
    }

    if (!canSubmitWithdrawal) {
      toast({
        title: "Invalid withdrawal",
        description: `Withdrawal must be between ${formatMoney(paymentConfig.minWithdrawal)} and ${formatMoney(payoutBalance ?? 0)}.`,
        variant: "destructive",
      });
      return;
    }

    setIsWithdrawing(true);

    try {
      const result = await paymentService.withdraw(
        {
          amount: Math.round(withdrawAmountNumber),
          phone: normalizedWithdrawalPhone,
          network: selectedNetwork.shortName as "MTN" | "Airtel",
        },
        user.id
      );

      if (!result.success) {
        toast({
          title: "Withdrawal failed",
          description: result.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Withdrawal started",
        description: result.message,
      });

      setWithdrawAmount("");

      // Refresh payout balance
      const { data } = await supabase
        .from("vendors")
        .select("payout_balance_rwf")
        .eq("id", vendorId)
        .single();

      if (data) {
        setPayoutBalance(data.payout_balance_rwf ?? 0);
      }
    } catch (error) {
      let message = "Unknown error";
      if (error instanceof InsufficientFundsError) {
        message = error.message;
      } else if (error instanceof PaymentError) {
        message = error.message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      toast({
        title: "Withdrawal failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsWithdrawing(false);
    }
  };

  return (
    <StorefrontPage>
      <div className="container mx-auto max-w-md px-4 py-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          Back
        </button>

        <div className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">My wallet</h1>
              <p className="mt-1 text-sm text-gray-500">
                {activePanel === "withdraw" && vendorId
                  ? "Send seller earnings to mobile money."
                  : "Deposit money to use for wallet payments."}
              </p>
            </div>

            <div className="text-right">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">Balance</p>
              <p className="mt-1 text-2xl font-semibold text-gray-900">
                {loadingBalance ? "..." : formatMoney(balance ?? 0)}
              </p>
            </div>
          </div>

          {vendorId ? (
            <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setActivePanel("deposit")}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  activePanel === "deposit"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Deposit
              </button>
              <button
                type="button"
                onClick={() => setActivePanel("withdraw")}
                className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${
                  activePanel === "withdraw"
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                Withdraw
              </button>
            </div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-sm text-gray-500">
              Deposit money here. Withdrawals appear once you have seller earnings.
            </div>
          )}
        </div>

        <div className="mt-4 rounded-3xl border border-gray-200 bg-white p-5 shadow-sm">
          {activePanel === "deposit" ? (
            <div className="space-y-5">
              <div>
                <p className="text-base font-semibold text-gray-900">Deposit</p>
                <p className="mt-1 text-sm text-gray-500">
                  Choose an amount and the phone number that should be charged.
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {[1000, 5000, 10000, 20000].map((presetAmount) => (
                  <button
                    key={presetAmount}
                    type="button"
                    onClick={() => {
                      setSelectedPreset(presetAmount);
                      setCustomAmount("");
                    }}
                    className={`rounded-2xl border px-2 py-3 text-sm font-medium transition ${
                      selectedPreset === presetAmount
                        ? "border-gray-900 bg-gray-900 text-white"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-400"
                    }`}
                  >
                    {presetAmount / 1000}k
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Custom amount</label>
                <Input
                  type="number"
                  placeholder={`e.g. ${paymentConfig.minDeposit * 10}`}
                  value={customAmount}
                  min={paymentConfig.minDeposit}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPreset(null);
                  }}
                  className="h-12 rounded-2xl border-gray-200"
                />
                {customAmount && Number(customAmount) < paymentConfig.minDeposit && (
                  <p className="text-xs text-gray-500">Minimum deposit is {formatMoney(paymentConfig.minDeposit)}.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Deposit from</label>

                {normalizedProfilePhone ? (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDepositPhoneMode("saved")}
                      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                        depositPhoneMode === "saved"
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      Saved number
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepositPhoneMode("other")}
                      className={`rounded-2xl border px-4 py-2.5 text-sm font-medium transition ${
                        depositPhoneMode === "other"
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      Another number
                    </button>
                  </div>
                ) : null}

                {depositPhoneMode === "saved" && normalizedProfilePhone ? (
                  <div className="flex h-12 items-center rounded-2xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-700">
                    {formatPhonePreview(profilePhone, countryCode)}
                  </div>
                ) : (
                  <Input
                    type="tel"
                    placeholder={"+250788123456"}
                    value={depositPhoneInput}
                    onChange={(e) => setDepositPhoneInput(e.target.value)}
                    className="h-12 rounded-2xl border-gray-200"
                  />
                )}

                {!normalizedProfilePhone && (
                  <p className="text-xs text-gray-500">

                    Enter your mobile money number to deposit.
                  </p>
                )}
              </div>

              {amount >= 500 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-medium text-gray-900">{formatMoney(Math.round(amount))}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-gray-500">Number</span>
                    <span className="font-medium text-gray-900">
                      {normalizedDepositPhone ? `+${normalizedDepositPhone}` : "Add number"}
                    </span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleTopUp}
                disabled={isProcessing || !canSubmitDeposit || isLoadingRegion}
                className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isProcessing
                  ? "Starting deposit..."
                  : isLoadingRegion
                  ? "Detecting region..."
                  : `Deposit ${amount >= paymentConfig.minDeposit ? formatMoney(Math.round(amount)) : ""}`}
              </Button>

              <p className="text-xs text-gray-500">
                We’ll open PawaPay so you can confirm the payment from the selected number.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-gray-900">Withdraw</p>
                  <p className="mt-1 text-sm text-gray-500">
                    Send seller earnings to your mobile money wallet.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-gray-400">Available</p>
                  <p className="mt-1 text-lg font-semibold text-gray-900">{formatMoney(payoutBalance ?? 0)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Amount</label>
                <Input
                  type="number"
                  placeholder={`e.g. ${paymentConfig.minWithdrawal * 10}`}
                  value={withdrawAmount}
                  min={paymentConfig.minWithdrawal}
                  max={payoutBalance ?? undefined}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
                <p className="text-xs text-gray-500">Minimum withdrawal is {formatMoney(paymentConfig.minWithdrawal)}.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {mobileNetworks.map((network) => (
                    <button
                      key={network.id}
                      type="button"
                      onClick={() => setSelectedNetwork(network)}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                        selectedNetwork.id === network.id
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {network.shortName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-gray-900">Phone number</label>
                  {normalizedProfilePhone && phoneNumber !== profilePhone && (
                    <button
                      type="button"
                      onClick={() => setPhoneNumber(profilePhone)}
                      className="text-xs text-gray-500 underline"
                    >
                      Use saved number
                    </button>
                  )}
                </div>
                <Input
                  type="tel"
                  placeholder={"+250788123456"}
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">You will receive</span>
                  <span className="font-medium text-gray-900">
                    {formatMoney(withdrawAmountNumber >= paymentConfig.minWithdrawal ? Math.round(withdrawAmountNumber) : 0)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-gray-500">Destination</span>
                  <span className="font-medium text-gray-900">
                    {normalizedWithdrawalPhone ? `+${normalizedWithdrawalPhone}` : "Add number"}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing || !canSubmitWithdrawal}
                className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isWithdrawing
                  ? "Submitting withdrawal..."
                  : `Withdraw ${withdrawAmountNumber >= paymentConfig.minWithdrawal ? formatMoney(Math.round(withdrawAmountNumber)) : ""}`}
              </Button>

              {!hasEnoughSellerBalance && (
                <p className="text-xs text-gray-500">
                  Withdrawals unlock once your seller earnings reach {formatMoney(paymentConfig.minWithdrawal)}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}

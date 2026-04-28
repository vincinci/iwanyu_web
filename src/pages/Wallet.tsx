import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { initializePawaPayDeposit, redirectToPawaPay } from "@/lib/pawapay";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { getUserWalletBalance } from "@/lib/liveSessions";

const PRESET_AMOUNTS = [1000, 5000, 10000, 20000];
const MOBILE_NETWORKS = ["MTN", "Airtel", "Orange"] as const;

type WalletPanel = "deposit" | "withdraw";

function normalizeRwandanPhone(value: string): string {
  const digits = value.replace(/\D/g, "");

  if (!digits) return "";
  if (digits.startsWith("250") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return `250${digits.slice(1)}`;
  if (digits.startsWith("7") && digits.length === 9) return `250${digits}`;

  return "";
}

function formatPhonePreview(value: string): string {
  const normalized = normalizeRwandanPhone(value);
  return normalized ? `+${normalized}` : value.trim();
}

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

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
  const [selectedNetwork, setSelectedNetwork] = useState<(typeof MOBILE_NETWORKS)[number]>("MTN");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const amount = selectedPreset ?? (customAmount ? Number(customAmount) : 0);
  const withdrawAmountNumber = Number(withdrawAmount || 0);
  const normalizedProfilePhone = normalizeRwandanPhone(profilePhone);
  const normalizedDepositPhone =
    depositPhoneMode === "saved"
      ? normalizedProfilePhone
      : normalizeRwandanPhone(depositPhoneInput);
  const normalizedWithdrawalPhone = normalizeRwandanPhone(phoneNumber);
  const hasEnoughSellerBalance = (payoutBalance ?? 0) >= 1000;
  const canSubmitDeposit = amount >= 500 && Boolean(normalizedDepositPhone);
  const canSubmitWithdrawal =
    hasEnoughSellerBalance &&
    withdrawAmountNumber >= 1000 &&
    withdrawAmountNumber <= (payoutBalance ?? 0) &&
    Boolean(normalizedWithdrawalPhone);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/wallet", { replace: true });
      return;
    }

    const loadWallet = async () => {
      try {
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
      }
    };

    void loadWallet();
  }, [navigate, supabase, user]);

  const handleTopUp = async () => {
    if (!user || !supabase || amount < 500) return;

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
          accountIdentifier: normalizedDepositPhone,
          returnUrl: `${window.location.origin}/wallet-callback`,
        },
        accessToken,
      );

      if (!result?.depositId || !result?.authenticationUrl) {
        throw new Error("Failed to initialize payment. Please try again.");
      }

      const { error: txnCreateErr } = await supabase.from("wallet_transactions").insert({
        user_id: user.id,
        type: "deposit",
        amount_rwf: Math.round(amount),
        external_transaction_id: result.depositId,
        payment_method: "pawapay_momo",
        status: "pending",
        description: `Wallet deposit ${correlationId}`,
      });

      if (txnCreateErr) {
        throw new Error(txnCreateErr.message || "Failed to create pending wallet transaction.");
      }

      sessionStorage.setItem("pendingDepositId", result.depositId);
      redirectToPawaPay(result.authenticationUrl);
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
    if (!user || !vendorId || !supabase) {
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
        description: "Enter a valid Rwanda mobile money number.",
        variant: "destructive",
      });
      return;
    }

    if (!canSubmitWithdrawal) {
      toast({
        title: "Invalid withdrawal",
        description: `Withdrawal must be between ${formatMoney(1000)} and ${formatMoney(payoutBalance ?? 0)}.`,
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
            amountRwf: Math.round(withdrawAmountNumber),
            mobileNetwork: selectedNetwork,
            phoneNumber: normalizedWithdrawalPhone,
            reason: "Seller earnings withdrawal",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Withdrawal failed. Please try again.");
      }

      toast({
        title: "Withdrawal started",
        description: `${formatMoney(withdrawAmountNumber)} is on the way to +${normalizedWithdrawalPhone}.`,
      });

      setWithdrawAmount("");

      const { data } = await supabase
        .from("vendors")
        .select("payout_balance_rwf")
        .eq("id", vendorId)
        .single();

      if (data) {
        setPayoutBalance(data.payout_balance_rwf ?? 0);
      }
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        description: error instanceof Error ? error.message : "Unknown error",
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
                {PRESET_AMOUNTS.map((presetAmount) => (
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
                  placeholder="e.g. 15000"
                  value={customAmount}
                  min={500}
                  onChange={(e) => {
                    setCustomAmount(e.target.value);
                    setSelectedPreset(null);
                  }}
                  className="h-12 rounded-2xl border-gray-200"
                />
                {customAmount && Number(customAmount) < 500 && (
                  <p className="text-xs text-gray-500">Minimum deposit is {formatMoney(500)}.</p>
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
                    {formatPhonePreview(profilePhone)}
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

                {!normalizedProfilePhone && (
                  <p className="text-xs text-gray-500">
                    You can use any Rwanda number now, or save one in <Link to="/account" className="underline">Account</Link>.
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
                disabled={isProcessing || !canSubmitDeposit}
                className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isProcessing
                  ? "Starting deposit..."
                  : `Deposit ${amount >= 500 ? formatMoney(Math.round(amount)) : ""}`}
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
                  placeholder="e.g. 50000"
                  value={withdrawAmount}
                  min={1000}
                  max={payoutBalance ?? undefined}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
                <p className="text-xs text-gray-500">Minimum withdrawal is {formatMoney(1000)}.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Network</label>
                <div className="grid grid-cols-3 gap-2">
                  {MOBILE_NETWORKS.map((network) => (
                    <button
                      key={network}
                      type="button"
                      onClick={() => setSelectedNetwork(network)}
                      className={`rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                        selectedNetwork === network
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 text-gray-700 hover:border-gray-400"
                      }`}
                    >
                      {network}
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
                  placeholder="+250788123456"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-gray-500">You will receive</span>
                  <span className="font-medium text-gray-900">
                    {formatMoney(withdrawAmountNumber >= 1000 ? Math.round(withdrawAmountNumber) : 0)}
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
                  : `Withdraw ${withdrawAmountNumber >= 1000 ? formatMoney(Math.round(withdrawAmountNumber)) : ""}`}
              </Button>

              {!hasEnoughSellerBalance && (
                <p className="text-xs text-gray-500">
                  Withdrawals unlock once your seller earnings reach {formatMoney(1000)}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </StorefrontPage>
  );
}

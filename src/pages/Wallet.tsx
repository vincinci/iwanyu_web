import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { PawaPay } from "@/lib/pawapay";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function WalletPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const supabase = getSupabaseClient();

  const [balance, setBalance] = useState<number | null>(null);
  const [loadingBalance, setLoadingBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<"deposit" | "withdraw">("deposit");
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState("");
  const [depositPhone, setDepositPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  const depositAmountNum = depositAmount ? Number(depositAmount) : 0;
  const withdrawAmountNum = withdrawAmount ? Number(withdrawAmount) : 0;
  const canSubmitDeposit = depositAmountNum >= 100 && depositPhone.trim().length >= 9;
  const canSubmitWithdraw = withdrawAmountNum >= 500 && withdrawAmountNum <= (balance ?? 0) && withdrawPhone.trim().length >= 9;

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/wallet", { replace: true });
      return;
    }

    const loadWallet = async () => {
      try {
        const walletBalance = await PawaPay.getBalance();
        setBalance(walletBalance);
      } catch (e) {
        console.error("Failed to load wallet:", e);
        toast({ title: "Error", description: "Failed to load wallet balance", variant: "destructive" });
      } finally {
        setLoadingBalance(false);
      }
    };

    void loadWallet();
  }, [navigate, user, toast]);

  const handleTopUp = async () => {
    if (!user || depositAmountNum < 100) return;
    if (!depositPhone.trim()) {
      toast({ title: "Phone required", description: "Enter the mobile money number to charge.", variant: "destructive" });
      return;
    }
    setIsProcessing(true);
    try {
      const formattedPhone = PawaPay.formatPhoneNumber(depositPhone);
      const result = await PawaPay.deposit(Math.round(depositAmountNum), formattedPhone);
      
      if (result.success) {
        toast({ title: "Deposit initiated", description: result.message ?? "Check your phone to complete payment." });
        setDepositAmount("");
        setTimeout(async () => {
          const newBalance = await PawaPay.getBalance();
          setBalance(newBalance);
        }, 2000);
      } else {
        toast({ title: "Deposit failed", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Deposit failed", description: error.message, variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!user || !canSubmitWithdraw) return;
    const amountZmw = Math.round(withdrawAmountNum);
    if (!withdrawPhone.trim()) {
      toast({ title: "Invalid phone", description: "Enter a valid mobile money number.", variant: "destructive" });
      return;
    }
    setIsWithdrawing(true);
    try {
      const formattedPhone = PawaPay.formatPhoneNumber(withdrawPhone);
      const result = await PawaPay.withdraw(amountZmw, formattedPhone);
      
      if (result.success) {
        toast({ title: "Withdrawal initiated", description: result.message ?? `${formatMoney(amountZmw, "ZMW")} is on the way.` });
        setWithdrawAmount("");
        setWithdrawPhone("");
        const newBalance = await PawaPay.getBalance();
        setBalance(newBalance);
      } else {
        toast({ title: "Withdrawal failed", description: result.error, variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Withdrawal failed", description: error.message, variant: "destructive" });
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
              <p className="mt-1 text-2xl font-semibold text-gray-900">{loadingBalance ? "..." : formatMoney(balance ?? 0, "ZMW")}</p>
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
                <p className="mt-1 text-sm text-gray-500">Add funds using PawaPay mobile money.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Amount (ZMW)</label>
                <Input
                  type="number"
                  placeholder="Min. 100 ZMW"
                  value={depositAmount}
                  min={100}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
                {depositAmount && depositAmountNum < 100 && (
                  <p className="text-xs text-gray-500">Minimum is {formatMoney(100, "ZMW")}.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Phone Number</label>
                <Input
                  type="tel"
                  placeholder="0977123456"
                  value={depositPhone}
                  onChange={(e) => setDepositPhone(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
                <p className="text-xs text-gray-500">Enter your mobile money number</p>
              </div>

              {depositAmountNum >= 100 && depositPhone && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">Amount</span>
                    <span className="font-medium text-gray-900">{formatMoney(Math.round(depositAmountNum), "ZMW")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-gray-500">Number</span>
                    <span className="font-medium text-gray-900">{depositPhone}</span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleTopUp}
                disabled={isProcessing || !canSubmitDeposit}
                className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isProcessing ? "Starting deposit..." : `Deposit ${depositAmountNum >= 100 ? formatMoney(Math.round(depositAmountNum), "ZMW") : ""}`}
              </Button>

              <p className="text-xs text-gray-500">
                You will receive a prompt on your phone to authorize the payment.
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
                <label className="text-sm font-medium text-gray-900">Amount (ZMW)</label>
                <Input
                  type="number"
                  placeholder="Min. 500 ZMW"
                  value={withdrawAmount}
                  min={500}
                  max={balance ?? 0}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
                {withdrawAmount && withdrawAmountNum > (balance ?? 0) && (
                  <p className="text-xs text-red-500">Exceeds your balance of {formatMoney(balance ?? 0, "ZMW")}.</p>
                )}
                {withdrawAmount && withdrawAmountNum < 500 && (
                  <p className="text-xs text-gray-500">Minimum withdrawal is {formatMoney(500, "ZMW")}.</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-900">Send to phone</label>
                <Input
                  type="tel"
                  placeholder="0977123456"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="h-12 rounded-2xl border-gray-200"
                />
                <p className="text-xs text-gray-500">Enter your mobile money number</p>
              </div>

              {canSubmitWithdraw && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-gray-500">You receive</span>
                    <span className="font-medium text-gray-900">{formatMoney(withdrawAmountNum, "ZMW")}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <span className="text-gray-500">Remaining balance</span>
                    <span className="font-medium text-gray-900">{formatMoney((balance ?? 0) - withdrawAmountNum, "ZMW")}</span>
                  </div>
                </div>
              )}

              <Button
                type="button"
                onClick={handleWithdraw}
                disabled={isWithdrawing || !canSubmitWithdraw}
                className="h-12 w-full rounded-2xl bg-gray-900 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isWithdrawing ? "Processing..." : `Withdraw ${canSubmitWithdraw ? formatMoney(withdrawAmountNum, "ZMW") : ""}`}
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

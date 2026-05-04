import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StorefrontPage from "@/components/StorefrontPage";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { getUserWalletBalance } from "@/lib/liveSessions";

export default function WalletPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/login?next=/wallet", { replace: true });
      return;
    }

    getUserWalletBalance(user.id)
      .then((wallet) => setBalance(wallet?.availableRwf ?? 0))
      .catch(() => setBalance(0))
      .finally(() => setLoading(false));
  }, [navigate, user]);

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

        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-gray-900">My wallet</h1>

          <div className="mt-6 flex items-center justify-between rounded-2xl bg-gray-50 px-5 py-4">
            <p className="text-sm font-medium text-gray-500">Balance</p>
            <p className="text-2xl font-bold text-gray-900">
              {loading ? "..." : formatMoney(balance ?? 0)}
            </p>
          </div>

          <p className="mt-4 text-sm text-gray-500">
            Online payments are currently unavailable. Please contact us for assistance.
          </p>
        </div>
      </div>
    </StorefrontPage>
  );
}

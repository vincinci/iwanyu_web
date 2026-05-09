import { BadgeCheck, Users, ClipboardList, Boxes, Percent, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { formatMoney } from "@/lib/money";

const nav = [
  { label: "Overview", icon: ClipboardList, href: "/admin" },
  { label: "Vendors", icon: Users, href: "/admin/vendors" },
  { label: "Products", icon: Boxes, href: "/admin/products" },
  { label: "Discounts", icon: Percent, href: "/admin/discounts" },
  { label: "Applications", icon: BadgeCheck, href: "/admin/applications" },
  { label: "Withdrawals", icon: Wallet, href: "/admin/withdrawals", active: true },
];

type WithdrawalRow = {
  id: string;
  vendor_id: string;
  amount_rwf: number;
  mobile_network: string | null;
  phone_number: string;
  reason: string | null;
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";
  created_at: string;
  completed_at: string | null;
  external_transaction_id: string | null;
  vendors: { name: string | null } | null;
};

type FilterStatus = "all" | "pending" | "processing" | "completed" | "failed" | "cancelled";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  processing: "bg-indigo-100 text-indigo-700",
  completed: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
};

export default function AdminWithdrawalsPage() {
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("seller_withdrawals")
        .select("id, vendor_id, amount_rwf, mobile_network, phone_number, reason, status, created_at, completed_at, external_transaction_id, vendors(name)")
        .order("created_at", { ascending: false })
        .limit(200);
      if (!cancelled) {
        if (!error) setWithdrawals((data ?? []) as WithdrawalRow[]);
        setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [supabase]);

  const filtered = withdrawals.filter((w) => filter === "all" || w.status === filter);

  const pendingCount = withdrawals.filter((w) => w.status === "pending" || w.status === "processing").length;

  return (
    <div className="dashboard-shell">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2">
              <img src="/logo.png" alt="iwanyu" className="h-10 w-auto" />
            </Link>
            <div className="h-6 w-px bg-gray-200" />
            <span className="font-semibold text-gray-800">Admin</span>
          </div>
          <Link to="/"><Button variant="outline" size="sm">Back to Store</Button></Link>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Sidebar */}
        <aside className="dashboard-sidebar">
          <nav className="space-y-1 py-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-gray-900 text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
                {item.label === "Withdrawals" && pendingCount > 0 && (
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingCount}
                  </span>
                )}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <main className="dashboard-main">
          <div className="container py-8">
            <div className="mb-8">
              <h1 className="text-2xl font-semibold text-gray-900">Seller Withdrawals</h1>
              <p className="text-gray-500 text-sm mt-1">
                Live mobile-money withdrawals update here automatically as payout callbacks arrive.
              </p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(["pending", "processing", "completed", "failed", "cancelled", "all"] as FilterStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                    filter === s
                      ? "bg-gray-900 text-white border-gray-900"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
                  }`}
                >
                  {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                  {s === "pending" && pendingCount > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                      {pendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="dashboard-card overflow-hidden">
              {loading ? (
                <div className="px-6 py-12 text-center text-gray-500">Loading withdrawal requests…</div>
              ) : filtered.length === 0 ? (
                <div className="px-6 py-12 text-center text-gray-500">
                  No {filter === "all" ? "" : filter} withdrawal requests.
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 font-medium">
                    <tr>
                      <th className="px-5 py-4">Date</th>
                      <th className="px-5 py-4">Seller</th>
                      <th className="px-5 py-4">Amount</th>
                      <th className="px-5 py-4">Destination</th>
                      <th className="px-5 py-4">Reason</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4">Completed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filtered.map((row) => (
                      <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {new Date(row.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4 font-medium">
                          {row.vendors?.name ?? row.vendor_id.slice(0, 8)}
                        </td>
                        <td className="px-5 py-4 font-bold text-gray-900 whitespace-nowrap">
                          {formatMoney(row.amount_rwf)}
                        </td>
                        <td className="px-5 py-4 text-gray-600 max-w-[200px] truncate">
                          {row.mobile_network ? `${row.mobile_network}: ` : ""}{row.phone_number}
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-[160px] truncate">
                          {row.reason || "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                          {row.completed_at ? new Date(row.completed_at).toLocaleString() : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

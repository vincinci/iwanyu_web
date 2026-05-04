import { BadgeCheck, Users, ClipboardList, Boxes, ShieldAlert, Check, X, Banknote, Percent, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth";
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
  payout_method: string;
  payout_destination: string;
  note: string | null;
  status: "pending" | "approved" | "processing" | "paid" | "rejected";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  vendors: { name: string | null } | null;
};

type FilterStatus = "all" | "pending" | "approved" | "paid" | "rejected";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-blue-100 text-blue-700",
  processing: "bg-indigo-100 text-indigo-700",
  paid: "bg-green-100 text-green-700",
  rejected: "bg-red-100 text-red-700",
};

export default function AdminWithdrawalsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const [loading, setLoading] = useState(false);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRow[]>([]);
  const [filter, setFilter] = useState<FilterStatus>("pending");
  const [actionRow, setActionRow] = useState<WithdrawalRow | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | "paid" | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!supabase) return;
      setLoading(true);
      const { data, error } = await supabase
        .from("vendor_withdrawal_requests")
        .select("id, vendor_id, amount_rwf, payout_method, payout_destination, note, status, admin_note, reviewed_at, created_at, vendors(name)")
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

  const pendingCount = withdrawals.filter((w) => w.status === "pending").length;

  async function submitAction() {
    if (!supabase || !user || !actionRow || !actionType) return;
    setSubmitting(true);
    try {
      const nextStatus = actionType === "approve" ? "approved" : actionType === "reject" ? "rejected" : "paid";
      const { error } = await supabase
        .from("vendor_withdrawal_requests")
        .update({
          status: nextStatus,
          admin_note: adminNote.trim() || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", actionRow.id);
      if (error) throw error;

      // Notify the vendor
      await supabase.from("vendor_notifications").insert({
        vendor_id: actionRow.vendor_id,
        type: "payout_reviewed",
        title: `Withdrawal request ${nextStatus}`,
        message: `Your withdrawal request for ${formatMoney(actionRow.amount_rwf)} is now ${nextStatus}.${
          adminNote.trim() ? ` Note: ${adminNote.trim()}` : ""
        }`,
        created_by: user.id,
      });

      setWithdrawals((prev) =>
        prev.map((w) =>
          w.id === actionRow.id
            ? { ...w, status: nextStatus as WithdrawalRow["status"], admin_note: adminNote.trim() || null, reviewed_at: new Date().toISOString() }
            : w,
        ),
      );
      toast({ title: `Request ${nextStatus}`, description: `${formatMoney(actionRow.amount_rwf)} to ${actionRow.payout_destination}` });
      setActionRow(null);
      setActionType(null);
      setAdminNote("");
    } catch (err) {
      toast({ title: "Action failed", description: err instanceof Error ? err.message : "Unknown error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  function openAction(row: WithdrawalRow, type: "approve" | "reject" | "paid") {
    setActionRow(row);
    setActionType(type);
    setAdminNote("");
  }

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
              <h1 className="text-2xl font-semibold text-gray-900">Seller Withdrawal Requests</h1>
              <p className="text-gray-500 text-sm mt-1">
                Sellers request manual payouts here. Approve, reject, or mark as paid.
              </p>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(["pending", "approved", "paid", "rejected", "all"] as FilterStatus[]).map((s) => (
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
                      <th className="px-5 py-4">Note</th>
                      <th className="px-5 py-4">Status</th>
                      <th className="px-5 py-4 text-right">Actions</th>
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
                          {row.payout_destination}
                        </td>
                        <td className="px-5 py-4 text-gray-500 max-w-[160px] truncate">
                          {row.note || row.admin_note ? (
                            <span title={[row.note, row.admin_note ? `Admin: ${row.admin_note}` : ""].filter(Boolean).join(" | ")}>
                              {row.note ?? "—"}
                              {row.admin_note && <span className="ml-1 text-blue-500">(Admin note)</span>}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${STATUS_COLORS[row.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {row.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white h-7 px-3 text-xs"
                                  onClick={() => openAction(row, "approve")}
                                >
                                  <Check size={12} className="mr-1" /> Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-red-300 text-red-600 hover:bg-red-50 h-7 px-3 text-xs"
                                  onClick={() => openAction(row, "reject")}
                                >
                                  <X size={12} className="mr-1" /> Reject
                                </Button>
                              </>
                            )}
                            {row.status === "approved" && (
                              <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white h-7 px-3 text-xs"
                                onClick={() => openAction(row, "paid")}
                              >
                                <Banknote size={12} className="mr-1" /> Mark Paid
                              </Button>
                            )}
                          </div>
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

      {/* Action dialog */}
      <AlertDialog open={!!actionRow} onOpenChange={(open) => { if (!open) { setActionRow(null); setActionType(null); setAdminNote(""); } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === "approve" && "Approve withdrawal request"}
              {actionType === "reject" && "Reject withdrawal request"}
              {actionType === "paid" && "Mark as paid"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionRow && (
                <>
                  <strong>{actionRow.vendors?.name ?? "Seller"}</strong> requested {formatMoney(actionRow.amount_rwf)} to{" "}
                  <em>{actionRow.payout_destination}</em>.
                  {actionType === "approve" && " Approving means you agree to send this payment manually."}
                  {actionType === "paid" && " Mark this as paid after you have sent the money."}
                  {actionType === "reject" && " The seller will be notified with your note."}
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 py-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {actionType === "reject" ? "Reason for rejection (required)" : "Admin note (optional)"}
            </label>
            <Textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={
                actionType === "reject"
                  ? "e.g. Insufficient verification, please re-submit with ID"
                  : "e.g. Sent via MTN MoMo, ref #12345"
              }
              rows={3}
              className="text-sm"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting || (actionType === "reject" && !adminNote.trim())}
              onClick={(e) => { e.preventDefault(); void submitAction(); }}
              className={
                actionType === "reject"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : actionType === "paid"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {submitting
                ? "Saving…"
                : actionType === "approve"
                ? "Approve"
                : actionType === "reject"
                ? "Reject"
                : "Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

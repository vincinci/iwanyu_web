import { ArrowUpRight, Calendar } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { useToast } from "@/hooks/use-toast";
import { formatMoney } from "@/lib/money";
import { getSupabaseClient } from "@/lib/supabaseClient";
import { Link } from "react-router-dom";

type VendorPayoutRow = {
    id: string;
    order_id: string;
    amount_rwf: number;
    status: "pending" | "processing" | "completed" | "failed";
    provider: string | null;
    provider_reference: string | null;
    created_at: string;
    completed_at: string | null;
};

type OrderItemRow = {
    price_rwf: number;
    quantity: number;
};

type WithdrawalRequestRow = {
    id: string;
    vendor_id: string;
    amount_rwf: number;
    payout_method: string;
    payout_destination: string;
    note: string | null;
    status: "pending" | "approved" | "processing" | "paid" | "rejected";
    admin_note: string | null;
    created_at: string;
    reviewed_at: string | null;
};

export default function SellerPayoutsPage() {
    const { user } = useAuth();
    const { t } = useLanguage();
    const { toast } = useToast();
    const supabase = getSupabaseClient();

    const [loading, setLoading] = useState(false);
    const [ownedVendorIds, setOwnedVendorIds] = useState<string[]>([]);
    const [payouts, setPayouts] = useState<VendorPayoutRow[]>([]);
    const [requests, setRequests] = useState<WithdrawalRequestRow[]>([]);
    const [grossSalesRwf, setGrossSalesRwf] = useState(0);
    const [requestAmount, setRequestAmount] = useState("");
    const [requestDestination, setRequestDestination] = useState("");
    const [requestNote, setRequestNote] = useState("");
    const [submittingRequest, setSubmittingRequest] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function loadPayoutData() {
            if (!supabase || !user?.id) return;
            setLoading(true);

            try {
                const { data: vendorsData, error: vendorsError } = await supabase
                    .from("vendors")
                    .select("id")
                    .eq("owner_user_id", user.id)
                    .eq("status", "approved")
                    .limit(200);

                if (vendorsError) throw vendorsError;

                const vendorIds = ((vendorsData ?? []) as Array<{ id: string }>).map((v) => v.id);
                if (cancelled) return;

                setOwnedVendorIds(vendorIds);

                if (vendorIds.length === 0) {
                    setPayouts([]);
                    setRequests([]);
                    setGrossSalesRwf(0);
                    return;
                }

                const [payoutsResult, salesResult, requestsResult] = await Promise.all([
                    supabase
                        .from("vendor_payouts")
                        .select("id, order_id, amount_rwf, status, provider, provider_reference, created_at, completed_at")
                        .in("vendor_id", vendorIds)
                        .order("created_at", { ascending: false })
                        .limit(100),
                    supabase
                        .from("order_items")
                        .select("price_rwf, quantity")
                        .in("vendor_id", vendorIds)
                        .limit(5000),
                    supabase
                        .from("vendor_withdrawal_requests")
                        .select("id, vendor_id, amount_rwf, payout_method, payout_destination, note, status, admin_note, created_at, reviewed_at")
                        .in("vendor_id", vendorIds)
                        .order("created_at", { ascending: false })
                        .limit(100),
                ]);

                if (payoutsResult.error) throw payoutsResult.error;
                if (salesResult.error) throw salesResult.error;
                if (requestsResult.error) throw requestsResult.error;

                if (cancelled) return;

                const payoutRows = (payoutsResult.data ?? []) as VendorPayoutRow[];
                const salesRows = (salesResult.data ?? []) as OrderItemRow[];
                const requestRows = (requestsResult.data ?? []) as WithdrawalRequestRow[];

                setPayouts(payoutRows);
                setRequests(requestRows);
                setGrossSalesRwf(
                    salesRows.reduce(
                        (sum, row) => sum + Number(row.price_rwf ?? 0) * Number(row.quantity ?? 0),
                        0,
                    ),
                );
            } catch {
                if (!cancelled) {
                    setPayouts([]);
                    setRequests([]);
                    setGrossSalesRwf(0);
                    toast({
                        title: t("sellerPayouts.loadFailedTitle"),
                        description: t("sellerPayouts.loadFailedDesc"),
                        variant: "destructive",
                    });
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void loadPayoutData();
        return () => {
            cancelled = true;
        };
    }, [supabase, t, toast, user?.id]);

    const payoutMetrics = useMemo(() => {
        const completed = payouts
            .filter((p) => p.status === "completed")
            .reduce((sum, p) => sum + Number(p.amount_rwf ?? 0), 0);
        const pendingSettlements = payouts
            .filter((p) => p.status === "pending" || p.status === "processing")
            .reduce((sum, p) => sum + Number(p.amount_rwf ?? 0), 0);

        const requestedOpen = requests
            .filter((r) => r.status === "pending" || r.status === "approved" || r.status === "processing")
            .reduce((sum, r) => sum + Number(r.amount_rwf ?? 0), 0);

        const pending = pendingSettlements + requestedOpen;
        const available = Math.max(0, grossSalesRwf - completed - pending);
        return {
            completed,
            pending,
            available,
            nextPayoutDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        };
    }, [grossSalesRwf, payouts, requests]);

    function statusClassName(status: VendorPayoutRow["status"]) {
        switch (status) {
            case "completed":
                return "bg-green-100 text-green-700";
            case "processing":
                return "bg-blue-100 text-blue-700";
            case "failed":
                return "bg-red-100 text-red-700";
            case "pending":
            default:
                return "bg-amber-100 text-amber-700";
        }
    }

    async function handleWithdrawClick() {
        if (!supabase || !user?.id) return;
        if (ownedVendorIds.length === 0) {
            toast({
                title: t("sellerPayouts.noStoreTitle"),
                description: t("sellerPayouts.noStoreDesc"),
                variant: "destructive",
            });
            return;
        }

        const amount = Math.floor(Number(requestAmount));
        if (!Number.isFinite(amount) || amount <= 0) {
            toast({
                title: t("sellerPayouts.invalidAmountTitle"),
                description: t("sellerPayouts.invalidAmountDesc"),
                variant: "destructive",
            });
            return;
        }

        if (amount > payoutMetrics.available) {
            toast({
                title: t("sellerPayouts.amountExceedsTitle"),
                description: t("sellerPayouts.amountExceedsDesc"),
                variant: "destructive",
            });
            return;
        }

        if (!requestDestination.trim()) {
            toast({
                title: t("sellerPayouts.destinationRequiredTitle"),
                description: t("sellerPayouts.destinationRequiredDesc"),
                variant: "destructive",
            });
            return;
        }

        setSubmittingRequest(true);
        try {
            const { data, error } = await supabase
                .from("vendor_withdrawal_requests")
                .insert({
                    vendor_id: ownedVendorIds[0],
                    requested_by: user.id,
                    amount_rwf: amount,
                    payout_method: "bank_transfer",
                    payout_destination: requestDestination.trim(),
                    note: requestNote.trim() || null,
                })
                .select("id, vendor_id, amount_rwf, payout_method, payout_destination, note, status, admin_note, created_at, reviewed_at")
                .single();

            if (error) throw error;

            const inserted = data as WithdrawalRequestRow;
            setRequests((prev) => [inserted, ...prev]);
            setRequestAmount("");
            setRequestDestination("");
            setRequestNote("");
            toast({
                title: t("sellerPayouts.requestSubmittedTitle"),
                description: t("sellerPayouts.requestSubmittedDesc"),
            });
        } catch {
            toast({
                title: t("sellerPayouts.requestFailedTitle"),
                description: t("sellerPayouts.requestFailedDesc"),
                variant: "destructive",
            });
        } finally {
            setSubmittingRequest(false);
        }
    }

    function handlePayoutSettings() {
        toast({
            title: t("sellerPayouts.settingsTitle"),
            description: t("sellerPayouts.settingsDesc"),
        });
    }

  return (
    <StorefrontPage>
    <div className="dashboard-shell">
    <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-semibold text-gray-900">{t("seller.payoutsTitle")}</h1>
                <p className="text-gray-500">{t("seller.payoutsSubtitle")}</p>
            </div>
            <Link to="/seller">
                <Button variant="outline">{t("seller.backToDashboard")}</Button>
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Balance Card */}
            <Card className="dashboard-card lg:col-span-2">
                <CardHeader>
                    <CardTitle className="text-gray-500 font-normal text-sm uppercase tracking-wider">{t("seller.availableBalance")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-semibold text-gray-900 mb-2">
                      {loading ? "..." : formatMoney(payoutMetrics.available)}
                    </div>
                    <div className="text-sm text-gray-500 mb-6">
                      {loading
                                                ? t("sellerPayouts.loadingTotals")
                                                : `${t("sellerPayouts.completedLabel")}: ${formatMoney(payoutMetrics.completed)} · ${t("sellerPayouts.pendingLabel")}: ${formatMoney(payoutMetrics.pending)}`}
                    </div>
                    <div className="flex gap-4">
                                                <Button
                                                    onClick={() => void handleWithdrawClick()}
                                                    disabled={loading || payoutMetrics.available <= 0 || submittingRequest}
                          className="bg-gray-900 text-white hover:bg-gray-800 font-semibold rounded-full"
                        >
                                                        {submittingRequest ? t("sellerPayouts.submitting") : t("seller.withdrawFunds")} <ArrowUpRight size={16} className="ml-2" />
                        </Button>
                        <Button onClick={handlePayoutSettings} variant="outline" className="rounded-full">
                            {t("seller.payoutSettings")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Payout */}
            <Card className="dashboard-card">
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-gray-500">{t("seller.nextScheduledPayout")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-iwanyu-primary">
                            <Calendar size={24} />
                        </div>
                        <div>
                                                        <div className="font-bold">
                                                            {payoutMetrics.nextPayoutDate.toLocaleDateString(undefined, {
                                                                weekday: "long",
                                                                month: "short",
                                                                day: "numeric",
                                                            })}
                                                        </div>
                            <div className="text-xs text-gray-500">{t("seller.automaticTransfer")}</div>
                        </div>
                    </div>
                                        <div className="text-2xl font-bold">
                                            {loading ? "..." : formatMoney(payoutMetrics.pending)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                            {t("seller.processingPeriod")}: {new Date().toLocaleDateString()} - {payoutMetrics.nextPayoutDate.toLocaleDateString()}
                                        </div>
                </CardContent>
            </Card>
        </div>

        <div className="dashboard-card mt-8 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t("sellerPayouts.requestWithdrawalTitle")}</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("sellerPayouts.amountRwfLabel")}</label>
                    <input
                        value={requestAmount}
                        onChange={(e) => setRequestAmount(e.target.value.replace(/[^0-9]/g, ""))}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                        placeholder="50000"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("sellerPayouts.destinationLabel")}</label>
                    <input
                        value={requestDestination}
                        onChange={(e) => setRequestDestination(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                        placeholder={t("sellerPayouts.destinationPlaceholder")}
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{t("sellerPayouts.noteOptionalLabel")}</label>
                    <input
                        value={requestNote}
                        onChange={(e) => setRequestNote(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
                        placeholder={t("sellerPayouts.notePlaceholder")}
                    />
                </div>
            </div>
            <p className="mt-3 text-xs text-gray-500">
                {t("sellerPayouts.availableNow")} {formatMoney(payoutMetrics.available)}
            </p>
        </div>

        <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t("seller.transactionHistory")}</h2>
            <div className="dashboard-card overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">{t("seller.date")}</th>
                            <th className="px-6 py-4">{t("seller.type")}</th>
                            <th className="px-6 py-4">{t("seller.description")}</th>
                            <th className="px-6 py-4">{t("seller.reference")}</th>
                            <th className="px-6 py-4 text-right">{t("seller.amount")}</th>
                            <th className="px-6 py-4 text-center">{t("seller.status")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                                                {loading ? (
                                                    <tr>
                                                        <td className="px-6 py-6 text-gray-500" colSpan={6}>
                                                            {t("sellerPayouts.loadingHistory")}
                                                        </td>
                                                    </tr>
                                                ) : payouts.length === 0 ? (
                                                    <tr>
                                                        <td className="px-6 py-6 text-gray-500" colSpan={6}>
                                                            {t("sellerPayouts.noPayoutsYet")}
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    payouts.map((row) => (
                                                        <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                                            <td className="px-6 py-4 text-gray-500">
                                                                {new Date(row.created_at).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4 font-medium">
                                                                {row.status === "completed" || row.status === "processing" || row.status === "pending"
                                                                    ? t("seller.payout")
                                                                    : t("seller.sale")}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-500">
                                                                {row.provider
                                                                    ? `${t("seller.weeklySettlement")} · ${row.provider}`
                                                                    : `${t("seller.order")} #${row.order_id.slice(0, 8)}`}
                                                            </td>
                                                            <td className="px-6 py-4 text-gray-400 font-mono text-xs">
                                                                {row.provider_reference || row.id.slice(0, 8).toUpperCase()}
                                                            </td>
                                                            <td className="px-6 py-4 text-right font-bold text-red-600">
                                                                -{formatMoney(row.amount_rwf)}
                                                            </td>
                                                            <td className="px-6 py-4 text-center">
                                                                <span className={`${statusClassName(row.status)} px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide`}>
                                                                    {row.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                    </tbody>
                </table>
            </div>
        </div>

        <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t("sellerPayouts.withdrawalRequestsTitle")}</h2>
            <div className="dashboard-card overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">{t("seller.date")}</th>
                            <th className="px-6 py-4">{t("sellerPayouts.destinationLabel")}</th>
                            <th className="px-6 py-4">{t("seller.amount")}</th>
                            <th className="px-6 py-4">{t("seller.status")}</th>
                            <th className="px-6 py-4">{t("sellerPayouts.adminNote")}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading ? (
                            <tr>
                                <td className="px-6 py-6 text-gray-500" colSpan={5}>
                                    {t("sellerPayouts.loadingWithdrawalRequests")}
                                </td>
                            </tr>
                        ) : requests.length === 0 ? (
                            <tr>
                                <td className="px-6 py-6 text-gray-500" colSpan={5}>
                                    {t("sellerPayouts.noWithdrawalRequests")}
                                </td>
                            </tr>
                        ) : (
                            requests.map((row) => (
                                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-gray-500">{new Date(row.created_at).toLocaleDateString()}</td>
                                    <td className="px-6 py-4 text-gray-600">{row.payout_destination}</td>
                                    <td className="px-6 py-4 font-bold text-gray-900">{formatMoney(row.amount_rwf)}</td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-gray-500">{row.admin_note || "-"}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
            </div>
            </div>
    </StorefrontPage>
  );
}

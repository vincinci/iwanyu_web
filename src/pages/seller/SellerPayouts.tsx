import { Wallet, ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth";
import { useLanguage } from "@/context/languageContext";
import { formatMoney } from "@/lib/money";
import { Link } from "react-router-dom";

export default function SellerPayoutsPage() {
  const { user } = useAuth();
    const { t } = useLanguage();

  return (
    <StorefrontPage>
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
            <Card className="lg:col-span-2 border border-gray-200">
                <CardHeader>
                    <CardTitle className="text-gray-500 font-normal text-sm uppercase tracking-wider">{t("seller.availableBalance")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-4xl font-semibold text-gray-900 mb-6">{formatMoney(1250000)}</div>
                    <div className="flex gap-4">
                        <Button className="bg-gray-900 text-white hover:bg-gray-800 font-semibold rounded-full">
                            {t("seller.withdrawFunds")} <ArrowUpRight size={16} className="ml-2" />
                        </Button>
                        <Button variant="outline" className="rounded-full">
                            {t("seller.payoutSettings")}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Payout */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-gray-500">{t("seller.nextScheduledPayout")}</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-iwanyu-primary">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="font-bold">{t("seller.nextMonday")}</div>
                            <div className="text-xs text-gray-500">{t("seller.automaticTransfer")}</div>
                        </div>
                    </div>
                    <div className="text-2xl font-bold">{formatMoney(450000)}</div>
                    <div className="text-xs text-gray-500 mt-1">{t("seller.processingPeriod")}: Jan 12 - Jan 19</div>
                </CardContent>
            </Card>
        </div>

        <div className="mt-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">{t("seller.transactionHistory")}</h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
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
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-gray-500">Jan {20 - i}, 2026</td>
                                <td className="px-6 py-4 font-medium">{i % 2 === 0 ? t("seller.payout") : t("seller.sale")}</td>
                                <td className="px-6 py-4 text-gray-500">{i % 2 === 0 ? t("seller.weeklySettlement") : t("seller.order") + ' #IW-883' + i}</td>
                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">REF-{84738 + i}</td>
                                <td className={`px-6 py-4 text-right font-bold ${i % 2 === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {i % 2 === 0 ? '-' : '+'}{formatMoney(i * 15000)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                        {t("seller.completed")}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
      </div>
    </StorefrontPage>
  );
}

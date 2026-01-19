import { Wallet, ArrowUpRight, ArrowDownLeft, Calendar } from "lucide-react";
import StorefrontPage from "@/components/StorefrontPage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";
import { Link } from "react-router-dom";

export default function SellerPayoutsPage() {
  const { user } = useAuth();

  return (
    <StorefrontPage>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-3xl font-bold">Payouts & Wallet</h1>
                <p className="text-gray-500">Manage your earnings and withdrawal methods.</p>
            </div>
            <Link to="/seller">
                <Button variant="outline">Back to Dashboard</Button>
            </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Balance Card */}
            <Card className="lg:col-span-2 bg-black text-white border-0">
                <CardHeader>
                    <CardTitle className="text-gray-400 font-normal text-sm uppercase tracking-wider">Available Balance</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-5xl font-bold mb-6">{formatMoney(1250000)}</div>
                    <div className="flex gap-4">
                        <Button className="bg-iwanyu-primary text-black hover:bg-iwanyu-primary/90 font-bold rounded-full">
                            Withdraw Funds <ArrowUpRight size={16} className="ml-2" />
                        </Button>
                        <Button variant="outline" className="bg-transparent text-white border-gray-700 hover:bg-gray-800 rounded-full">
                            Payout Settings
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Upcoming Payout */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-sm uppercase tracking-wider text-gray-500">Next Scheduled Payout</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 mb-4">
                        <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center text-iwanyu-primary">
                            <Calendar size={24} />
                        </div>
                        <div>
                            <div className="font-bold">Next Monday</div>
                            <div className="text-xs text-gray-500">Automatic transfer</div>
                        </div>
                    </div>
                    <div className="text-2xl font-bold">{formatMoney(450000)}</div>
                    <div className="text-xs text-gray-500 mt-1">Processing period: Jan 12 - Jan 19</div>
                </CardContent>
            </Card>
        </div>

        <div className="mt-12">
            <h2 className="text-xl font-bold mb-6">Transaction History</h2>
            <div className="rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-medium">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Type</th>
                            <th className="px-6 py-4">Description</th>
                            <th className="px-6 py-4">Reference</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <tr key={i} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 text-gray-500">Jan {20 - i}, 2026</td>
                                <td className="px-6 py-4 font-medium">{i % 2 === 0 ? 'Payout' : 'Sale'}</td>
                                <td className="px-6 py-4 text-gray-500">{i % 2 === 0 ? 'Weekly Settlement' : 'Order #IW-883' + i}</td>
                                <td className="px-6 py-4 text-gray-400 font-mono text-xs">REF-{84738 + i}</td>
                                <td className={`px-6 py-4 text-right font-bold ${i % 2 === 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {i % 2 === 0 ? '-' : '+'}{formatMoney(i * 15000)}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide">
                                        Completed
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

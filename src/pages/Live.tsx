import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMarketplace } from "@/context/marketplace";
import { Link } from "react-router-dom";
import { Eye, Gavel, Radio, Store } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchActiveLiveSessions, summarizeLiveForHome, type LiveSession } from "@/lib/liveSessions";
import { formatMoney } from "@/lib/money";

export default function LivePage() {
  const { vendors, products } = useMarketplace();
  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const sessions = await fetchActiveLiveSessions();
      if (!cancelled) setActiveSessions(sessions);
    };

    void refresh();
    const id = window.setInterval(() => {
      void refresh();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const summary = useMemo(() => summarizeLiveForHome(vendors, products, activeSessions), [vendors, products, activeSessions]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <main className="container py-10 flex-1 space-y-8">
        <section className="rounded-3xl bg-black text-white p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/20 px-3 py-1 text-xs font-semibold text-red-300">
                <Radio className="h-3.5 w-3.5" />
                LIVE NOW
              </div>
              <h1 className="mt-3 text-3xl font-bold">Live Marketplace</h1>
              <p className="mt-2 text-sm text-gray-300">
                Watch live sellers, join auctions, and bid in real-time on web.
              </p>
            </div>
            <Link to="/seller/live-studio">
              <Button className="rounded-full bg-white text-black hover:bg-gray-200">Go Live Studio</Button>
            </Link>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Live Auctions</h2>
            <Badge variant="secondary" className="rounded-full">
              {summary.liveAuctions.length} active
            </Badge>
          </div>

          {summary.liveAuctions.length === 0 ? (
            <Card className="border border-dashed border-gray-300">
              <CardContent className="py-10 text-center text-gray-600">
                No live auctions right now. Sellers can start one from Live Studio.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summary.liveAuctions.map((session) => (
                <Card key={session.id} className="overflow-hidden border border-gray-200">
                  <div className="aspect-video bg-gray-100">
                    {session.productImage ? (
                      <img src={session.productImage} alt={session.productTitle} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1"><Store className="h-3.5 w-3.5" />{session.vendorName}</span>
                      <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{session.watchers}</span>
                    </div>
                    <h3 className="mt-2 font-semibold text-gray-900 line-clamp-2">{session.productTitle}</h3>
                    <p className="mt-1 text-sm text-gray-600 inline-flex items-center gap-1">
                      <Gavel className="h-3.5 w-3.5" />
                      Current bid: {formatMoney(session.currentBidRwf)}
                    </p>
                    <div className="mt-3">
                      <Link to={`/live/view/${session.id}`}>
                        <Button className="w-full rounded-full">View & Bid</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Sellers Live Now</h2>
            <Badge variant="secondary" className="rounded-full">
              {summary.liveSellers.length} sellers
            </Badge>
          </div>
          {summary.liveSellers.length === 0 ? (
            <Card className="border border-dashed border-gray-300">
              <CardContent className="py-10 text-center text-gray-600">
                No sellers are live right now.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {summary.liveSellers.map((seller) => (
                <Card key={seller.vendorId}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">{seller.vendorName}</div>
                      <div className="text-xs text-gray-500">{seller.watchers} viewers watching</div>
                    </div>
                    <Link to={`/live/view/${seller.sessionId ?? ''}`}>
                      <Button size="sm" variant="outline" className="rounded-full">Watch</Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}

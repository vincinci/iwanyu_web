import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMarketplace } from "@/context/marketplace";
import { Link } from "react-router-dom";
import { Eye, Gavel, Radio, Store, Users, Sparkles, ArrowRight } from "lucide-react";
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
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex flex-col">
      <Header />
      <main className="container py-10 flex-1 space-y-12">
        {/* Hero Section */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8 md:p-12">
          {/* Animated background elements */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-purple-500/20 blur-3xl" />
            <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-cyan-500/20 blur-3xl" />
          </div>
          
          <div className="relative flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-500/30 px-4 py-1.5 text-sm font-semibold text-red-300 animate-pulse">
                <Radio className="h-4 w-4" />
                LIVE NOW
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-bold tracking-tight">
                Live Marketplace
              </h1>
              <p className="mt-3 text-lg text-gray-300 leading-relaxed">
                Watch live sellers, place real-time bids, and win amazing deals. Join the excitement of live auctions happening right now!
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <Link to="/seller/live-studio">
                  <Button size="lg" className="rounded-full bg-white text-gray-900 hover:bg-gray-100 px-6">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Go Live Studio
                  </Button>
                </Link>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="flex gap-4">
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-white">{summary.liveAuctions.length}</div>
                <div className="text-xs text-gray-400">Auctions</div>
              </div>
              <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-4 text-center min-w-[100px]">
                <div className="text-2xl font-bold text-white">{summary.liveSellers.length}</div>
                <div className="text-xs text-gray-400">Sellers</div>
              </div>
            </div>
          </div>
        </section>

        {/* Live Auctions Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600">
                <Gavel className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Live Auctions</h2>
                <p className="text-sm text-gray-500">Active bidding right now</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full bg-amber-100 text-amber-700 px-3 py-1">
              {summary.liveAuctions.length} active
            </Badge>
          </div>

          {summary.liveAuctions.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200 bg-white/50">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Gavel className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No Live Auctions</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                  There are no active auctions right now. Sellers can start one from Live Studio.
                </p>
                <Link to="/seller/live-studio" className="mt-4 inline-block">
                  <Button variant="outline" className="rounded-full">
                    Start an Auction
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {summary.liveAuctions.map((session) => (
                <Card 
                  key={session.id} 
                  className="group relative overflow-hidden border border-gray-200 bg-white transition-all hover:shadow-xl hover:shadow-gray-200/50 hover:border-gray-300"
                >
                  {/* Live indicator */}
                  <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-xs font-semibold text-white">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </div>
                  
                  {/* Product Image */}
                  <div className="aspect-video overflow-hidden bg-gray-100">
                    {session.productImage ? (
                      <img 
                        src={session.productImage} 
                        alt={session.productTitle} 
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" 
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Gavel className="h-12 w-12 text-gray-300" />
                      </div>
                    )}
                  </div>
                  
                  <CardContent className="p-5">
                    {/* Vendor & Viewers */}
                    <div className="flex items-center justify-between text-sm mb-3">
                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        <Store className="h-4 w-4" />
                        <span className="font-medium">{session.vendorName}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-gray-500">
                        <Eye className="h-4 w-4" />
                        {session.watchers} watching
                      </span>
                    </div>
                    
                    {/* Product Title */}
                    <h3 className="font-bold text-gray-900 text-lg line-clamp-2 min-h-[3.5rem]">{session.productTitle}</h3>
                    
                    {/* Current Bid */}
                    <div className="mt-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 p-4 border border-amber-100">
                      <div className="text-xs text-amber-700 font-medium uppercase tracking-wide">Current Bid</div>
                      <div className="mt-1 text-2xl font-bold text-gray-900">
                        {formatMoney(session.currentBidRwf)}
                      </div>
                    </div>
                    
                    {/* Bid Button */}
                    <Link to={`/live/view/${session.id}`} className="mt-4 block">
                      <Button className="w-full rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 border-0">
                        <Gavel className="mr-2 h-4 w-4" />
                        View & Bid
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Sellers Live Now Section */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                <Radio className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Sellers Live Now</h2>
                <p className="text-sm text-gray-500">Watch and interact with sellers</p>
              </div>
            </div>
            <Badge variant="secondary" className="rounded-full bg-purple-100 text-purple-700 px-3 py-1">
              {summary.liveSellers.length} sellers
            </Badge>
          </div>
          
          {summary.liveSellers.length === 0 ? (
            <Card className="border-2 border-dashed border-gray-200 bg-white/50">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
                  <Radio className="h-8 w-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">No Sellers Live</h3>
                <p className="mt-2 text-gray-500 max-w-md mx-auto">
                  There are no sellers live right now. Check back soon!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {summary.liveSellers.map((seller) => (
                <Card 
                  key={seller.vendorId}
                  className="group relative overflow-hidden border border-gray-200 bg-white transition-all hover:shadow-lg hover:border-purple-300"
                >
                  <div className="absolute left-4 top-4 z-10 flex items-center gap-1.5 rounded-full bg-purple-500 px-2.5 py-1 text-xs font-semibold text-white">
                    <Radio className="h-3 w-3 animate-pulse" />
                    LIVE
                  </div>
                  
                  <CardContent className="p-5 flex items-center gap-4">
                    {/* Seller Avatar */}
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-purple-100 to-pink-100">
                      <span className="text-xl font-bold text-purple-600">
                        {seller.vendorName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    
                    {/* Seller Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{seller.vendorName}</h3>
                      <div className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        {seller.watchers} viewers
                      </div>
                    </div>
                    
                    {/* Watch Button */}
                    <Link to={`/live/view/${seller.sessionId ?? ''}`}>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                      >
                        Watch
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
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

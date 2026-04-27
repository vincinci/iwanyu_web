import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Video, Gavel, StopCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import {
  createLiveSession,
  endLiveSession,
  getLiveSessionsForVendors,
  type LiveSession,
} from "@/lib/liveSessions";
import { formatMoney } from "@/lib/money";

export default function SellerLiveStudioPage() {
  const { user } = useAuth();
  const { vendors, products } = useMarketplace();

  const ownedVendors = useMemo(
    () => vendors.filter((vendor) => user && vendor.ownerUserId === user.id && vendor.status === "approved"),
    [vendors, user]
  );

  const ownedVendorIds = useMemo(() => ownedVendors.map((vendor) => vendor.id), [ownedVendors]);
  const ownedProducts = useMemo(
    () => products.filter((product) => ownedVendorIds.includes(product.vendorId)),
    [products, ownedVendorIds]
  );

  const [selectedProductId, setSelectedProductId] = useState<string>(ownedProducts[0]?.id ?? "");
  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);

  const selectedProduct = ownedProducts.find((product) => product.id === selectedProductId);
  const primaryVendor = ownedVendors[0];

  const refreshSessions = useCallback(async () => {
    const sessions = await getLiveSessionsForVendors(ownedVendorIds);
    setActiveSessions(sessions);
  }, [ownedVendorIds]);

  useEffect(() => {
    void refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!selectedProductId && ownedProducts[0]?.id) {
      setSelectedProductId(ownedProducts[0].id);
    }
  }, [ownedProducts, selectedProductId]);

  const handleStartLiveStream = async () => {
    if (!primaryVendor) return;
    
    // Live streaming: no product needed upfront
    const placeholderProduct = {
      id: `live-stream-${Date.now()}`,
      title: "Live Stream",
      price: 0,
      image: "",
      vendorId: primaryVendor.id,
      description: "",
      category: "",
      variants: [],
    };
    
    await createLiveSession({
      vendorId: primaryVendor.id,
      vendorName: primaryVendor.name,
      sellerUserId: user?.id,
      product: placeholderProduct as any,
      auctionEnabled: false,
    });
    await refreshSessions();
  };

  const handleCreateLiveAuction = async () => {
    if (!selectedProduct || !primaryVendor) return;
    
    // Live auction: requires product selection
    await createLiveSession({
      vendorId: primaryVendor.id,
      vendorName: primaryVendor.name,
      sellerUserId: user?.id,
      product: selectedProduct,
      auctionEnabled: true,
    });
    await refreshSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Live Studio</h1>
            <p className="text-sm text-gray-600">Choose how you want to go live and showcase your products.</p>
          </div>
          <Link to="/live">
            <Button variant="outline" className="rounded-full">Open Live Marketplace</Button>
          </Link>
        </div>

        {!primaryVendor ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-600">
              You need an approved seller store before going live.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Two Main Options */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Live Streaming Card */}
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader className="bg-blue-100">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Video className="h-6 w-6" /> Live Streaming
                  </CardTitle>
                  <p className="text-sm text-blue-700 mt-2 font-normal">
                    Go live with your camera and showcase multiple products in real-time
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">How it works:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Open your camera and start streaming immediately</li>
                      <li>Add products on-the-fly as you showcase them</li>
                      <li>Set inventory for each item (quantity available)</li>
                      <li>Items sell out automatically when inventory reaches 0</li>
                      <li>Buyers can purchase while you're streaming</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-white border border-blue-200 p-3">
                    <div className="text-xs font-medium text-gray-600">Store</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{primaryVendor.name}</div>
                  </div>

                  <Button onClick={handleStartLiveStream} size="lg" className="w-full rounded-full bg-blue-600 hover:bg-blue-700">
                    <Zap className="mr-2 h-5 w-5" /> Start Live Stream
                  </Button>
                </CardContent>
              </Card>

              {/* Live Auction Card */}
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader className="bg-purple-100">
                  <CardTitle className="flex items-center gap-2 text-purple-900">
                    <Gavel className="h-6 w-6" /> Live Auction
                  </CardTitle>
                  <p className="text-sm text-purple-700 mt-2 font-normal">
                    Create a live auction for a specific product with real-time bidding
                  </p>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  <div>
                    <Label htmlFor="auction-product" className="text-gray-900">Select Product to Auction</Label>
                    <select
                      id="auction-product"
                      className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">Choose a product...</option>
                      {ownedProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.title} — {formatMoney(product.price)}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProduct && (
                    <div className="rounded-lg bg-white border border-purple-200 p-3 space-y-2">
                      <div className="flex gap-3">
                        {selectedProduct.image && (
                          <img src={selectedProduct.image} alt={selectedProduct.title} className="h-16 w-16 rounded object-cover" />
                        )}
                        <div className="flex-1">
                          <div className="text-sm font-semibold text-gray-900 line-clamp-2">{selectedProduct.title}</div>
                          <div className="text-xs text-gray-600 mt-1">Starting bid: {formatMoney(selectedProduct.price)}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-900">How it works:</div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-700">
                      <li>Select the product you want to auction</li>
                      <li>Set the starting bid (product price)</li>
                      <li>Buyers place bids in real-time</li>
                      <li>Highest bidder wins when auction ends</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleCreateLiveAuction} 
                    disabled={!selectedProduct}
                    size="lg" 
                    className="w-full rounded-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Radio className="mr-2 h-5 w-5" /> Start Live Auction
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Current Live Sessions */}
            <Card>
              <CardHeader>
                <CardTitle>Currently Live</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No active sessions yet. Start one above!</p>
                ) : (
                  activeSessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-gray-200 p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-semibold text-gray-900">{session.productTitle}</div>
                          <div className="mt-2 flex gap-3 text-xs text-gray-600">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
                              <span className="h-2 w-2 rounded-full bg-green-600 animate-pulse" />
                              {session.auctionEnabled ? "Auction" : "Stream"} Live
                            </span>
                            <span>{session.watchers} viewers</span>
                          </div>
                          {session.auctionEnabled && session.currentBidRwf > 0 && (
                            <div className="mt-2 text-sm font-semibold text-purple-600">Current bid: {formatMoney(session.currentBidRwf)}</div>
                          )}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={async () => {
                            await endLiveSession(session.id);
                            await refreshSessions();
                          }}
                        >
                          <StopCircle className="mr-1 h-4 w-4" /> End
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                <div className="pt-2 border-t">
                  <Label htmlFor="health" className="text-xs text-gray-600">Note</Label>
                  <Input id="health" value="Camera and microphone access is browser-based." readOnly className="text-xs mt-1" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

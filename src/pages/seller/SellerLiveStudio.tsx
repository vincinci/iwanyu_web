import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Smartphone, Hammer, StopCircle, AlertCircle, CheckCircle2, Clock } from "lucide-react";
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

async function requestCameraAndMicPermissions(): Promise<boolean> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true,
    });
    // Stop the stream - we just need permissions
    stream.getTracks().forEach(track => track.stop());
    return true;
  } catch (error) {
    console.error("Camera/Mic permission denied:", error);
    alert("Please allow camera and microphone access to go live. You can enable this in your browser settings.");
    return false;
  }
}

export default function SellerLiveStudioPage() {
  const { user } = useAuth();
  const { vendors, products } = useMarketplace();
  const navigate = useNavigate();

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
  const [streamLoading, setStreamLoading] = useState(false);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedProduct = ownedProducts.find((product) => product.id === selectedProductId);
  const primaryVendor = ownedVendors[0];

  const refreshSessions = useCallback(async () => {
    const sessions = await getLiveSessionsForVendors(ownedVendorIds);
    setActiveSessions(sessions);
  }, [ownedVendorIds]);

  useEffect(() => {
    void refreshSessions();
    const interval = setInterval(() => void refreshSessions(), 5000);
    return () => clearInterval(interval);
  }, [refreshSessions]);

  useEffect(() => {
    if (!selectedProductId && ownedProducts[0]?.id) {
      setSelectedProductId(ownedProducts[0].id);
    }
  }, [ownedProducts, selectedProductId]);

  const handleStartLiveStream = async () => {
    setError(null);
    setStreamLoading(true);
    
    try {
      const hasPermissions = await requestCameraAndMicPermissions();
      if (!hasPermissions) {
        setStreamLoading(false);
        return;
      }

      if (!primaryVendor) {
        setError("No seller store found");
        setStreamLoading(false);
        return;
      }
      
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
      
      const session = await createLiveSession({
        vendorId: primaryVendor.id,
        vendorName: primaryVendor.name,
        sellerUserId: user?.id,
        product: placeholderProduct as any,
        auctionEnabled: false,
      });

      await refreshSessions();
      // Navigate to the live streaming interface
      navigate(`/live/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start stream");
    } finally {
      setStreamLoading(false);
    }
  };

  const handleCreateLiveAuction = async () => {
    setError(null);
    setAuctionLoading(true);
    
    try {
      const hasPermissions = await requestCameraAndMicPermissions();
      if (!hasPermissions) {
        setAuctionLoading(false);
        return;
      }

      if (!selectedProduct || !primaryVendor) {
        setError("Please select a product first");
        setAuctionLoading(false);
        return;
      }
      
      const session = await createLiveSession({
        vendorId: primaryVendor.id,
        vendorName: primaryVendor.name,
        sellerUserId: user?.id,
        product: selectedProduct,
        auctionEnabled: true,
      });

      await refreshSessions();
      // Navigate to the live auction interface
      navigate(`/live/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auction");
    } finally {
      setAuctionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Live Studio</h1>
              <p className="mt-1 text-sm text-gray-600">Stream and auction your products in real-time</p>
            </div>
            <Link to="/seller/dashboard">
              <Button variant="outline" className="rounded-lg">← Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {!primaryVendor ? (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-yellow-600 mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Seller Store Required</h3>
              <p className="text-sm text-gray-700 mb-4">You need an approved seller store before going live.</p>
              <Link to="/seller/onboarding">
                <Button className="rounded-lg">Start Seller Application</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Error Message */}
            {error && (
              <Card className="border-red-200 bg-red-50">
                <CardContent className="py-3 px-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Main Options Grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Live Streaming */}
              <Card className="border-2 border-blue-300 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-blue-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-blue-900 text-xl">
                        <Smartphone className="h-6 w-6" /> Live Stream
                      </CardTitle>
                      <p className="text-sm text-blue-700 mt-2">Broadcast your products live with instant purchases</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-blue-50 p-4 space-y-2">
                    <div className="text-sm font-semibold text-gray-900">What happens:</div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      <li>✓ Camera & mic enable → you're live</li>
                      <li>✓ Showcase multiple products</li>
                      <li>✓ Add items, set prices & inventory</li>
                      <li>✓ Buyers purchase in real-time</li>
                      <li>✓ Auto sold-out when inventory hits 0</li>
                    </ul>
                  </div>

                  <div className="rounded-lg bg-white border border-blue-200 p-3">
                    <div className="text-xs font-medium text-gray-500">Your Store</div>
                    <div className="text-sm font-semibold text-gray-900 mt-1">{primaryVendor.name}</div>
                  </div>

                  <Button 
                    onClick={handleStartLiveStream}
                    disabled={streamLoading}
                    size="lg" 
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                  >
                    {streamLoading ? "Starting..." : "Start Live Stream"}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">We'll request camera & mic access</p>
                </CardContent>
              </Card>

              {/* Live Auction */}
              <Card className="border-2 border-purple-300 overflow-hidden hover:shadow-lg transition-shadow">
                <div className="h-2 bg-gradient-to-r from-purple-500 to-purple-600" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-purple-900 text-xl">
                        <Hammer className="h-6 w-6" /> Live Auction
                      </CardTitle>
                      <p className="text-sm text-purple-700 mt-2">Run a real-time bidding auction on a single product</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="auction-product" className="text-sm font-semibold">Select Product</Label>
                    <select
                      id="auction-product"
                      className="mt-2 h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={selectedProductId}
                      onChange={(e) => setSelectedProductId(e.target.value)}
                    >
                      <option value="">Choose a product...</option>
                      {ownedProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedProduct && (
                    <div className="rounded-lg bg-white border border-purple-200 p-3 flex gap-3">
                      {selectedProduct.image && (
                        <img src={selectedProduct.image} alt={selectedProduct.title} className="h-14 w-14 rounded object-cover" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 line-clamp-2">{selectedProduct.title}</div>
                        <div className="text-xs text-purple-600 font-semibold mt-1">Starting bid: {formatMoney(selectedProduct.price)}</div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-lg bg-purple-50 p-4 space-y-2">
                    <div className="text-sm font-semibold text-gray-900">What happens:</div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      <li>✓ Buyers place real-time bids</li>
                      <li>✓ Starting bid = product price</li>
                      <li>✓ Highest bidder wins</li>
                      <li>✓ You manage auction duration</li>
                    </ul>
                  </div>

                  <Button 
                    onClick={handleCreateLiveAuction}
                    disabled={auctionLoading || !selectedProduct}
                    size="lg" 
                    className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                  >
                    {auctionLoading ? "Starting..." : "Start Live Auction"}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">We'll request camera & mic access</p>
                </CardContent>
              </Card>
            </div>

            {/* Currently Live */}
            <Card className="border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green-600" /> Currently Live
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeSessions.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-gray-600 mb-3">No live sessions yet</p>
                    <p className="text-sm text-gray-500">Start streaming or create an auction above to go live</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeSessions.map((session) => (
                      <div key={session.id} className="rounded-lg border border-gray-200 p-4 flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-semibold text-gray-900">{session.productTitle}</span>
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {session.auctionEnabled ? (
                              <>
                                <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded text-xs font-medium mr-2">Auction</span>
                                <span>Current bid: <span className="font-semibold text-purple-600">{formatMoney(session.currentBidRwf)}</span></span>
                              </>
                            ) : (
                              <>
                                <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium mr-2">Stream</span>
                                <span>{session.watchers} viewers</span>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={async () => {
                            await endLiveSession(session.id);
                            await refreshSessions();
                          }}
                        >
                          <StopCircle className="h-4 w-4 mr-1" /> End
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Info Box */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="py-4 px-4 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-900">
                  <strong>Pro tip:</strong> Make sure your camera and microphone work before going live. Test them in your browser settings first.
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

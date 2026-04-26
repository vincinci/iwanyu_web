import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Radio, Video, Gavel, StopCircle } from "lucide-react";
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

type DraftMode = "showcase" | "auction";

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
  const [mode, setMode] = useState<DraftMode>("showcase");
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

  const handleGoLive = async () => {
    if (!selectedProduct || !primaryVendor) return;
    await createLiveSession({
      vendorId: primaryVendor.id,
      vendorName: primaryVendor.name,
      sellerUserId: user?.id,
      product: selectedProduct,
      auctionEnabled: mode === "auction",
    });
    await refreshSessions();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Live Studio</h1>
            <p className="text-sm text-gray-600">Start live product sessions and live auctions on web.</p>
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
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Video className="h-5 w-5" /> Create Live Session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="product">Product</Label>
                  <select
                    id="product"
                    className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm"
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                  >
                    <option value="">Select product</option>
                    {ownedProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label>Mode</Label>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setMode("showcase")}
                      className={`rounded-xl border px-4 py-3 text-left text-sm ${
                        mode === "showcase" ? "border-black bg-gray-100" : "border-gray-200"
                      }`}
                    >
                      <div className="font-medium">Live Showcase</div>
                      <div className="text-xs text-gray-500">Go live to demo your product.</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMode("auction")}
                      className={`rounded-xl border px-4 py-3 text-left text-sm ${
                        mode === "auction" ? "border-black bg-gray-100" : "border-gray-200"
                      }`}
                    >
                      <div className="font-medium inline-flex items-center gap-1"><Gavel className="h-4 w-4" /> Live Auction</div>
                      <div className="text-xs text-gray-500">Let buyers place bids in real-time.</div>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-600">
                  <div className="font-medium text-gray-900">Preview</div>
                  <div className="mt-2">Store: {primaryVendor.name}</div>
                  <div>Product: {selectedProduct?.title || "Not selected"}</div>
                  <div>Starting price: {selectedProduct ? formatMoney(selectedProduct.price) : "-"}</div>
                  <div>Session type: {mode === "auction" ? "Auction" : "Showcase"}</div>
                </div>

                <Button onClick={handleGoLive} disabled={!selectedProduct} className="rounded-full">
                  <Radio className="mr-2 h-4 w-4" /> Go Live Now
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Current Live</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSessions.length === 0 ? (
                  <p className="text-sm text-gray-500">No active sessions yet.</p>
                ) : (
                  activeSessions.map((session) => (
                    <div key={session.id} className="rounded-xl border border-gray-200 p-3 text-sm">
                      <div className="font-medium text-gray-900 line-clamp-2">{session.productTitle}</div>
                      <div className="mt-1 text-xs text-gray-500">
                        {session.auctionEnabled ? "Auction live" : "Showcase live"} · {session.watchers} viewers
                      </div>
                      <div className="mt-2">
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
                <div className="pt-2">
                  <Label htmlFor="health">Stream note</Label>
                  <Input id="health" value="Camera and microphone access is browser-based." readOnly />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

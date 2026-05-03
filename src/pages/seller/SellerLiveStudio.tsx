import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Smartphone, Hammer, StopCircle, AlertCircle, CheckCircle2, Clock, ImagePlus, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/context/auth";
import { useMarketplace } from "@/context/marketplace";
import type { Product } from "@/types/product";
import {
  createLiveSession,
  endLiveSession,
  getLiveSessionsForVendors,
  type LiveSession,
} from "@/lib/liveSessions";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
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

  const [activeSessions, setActiveSessions] = useState<LiveSession[]>([]);
  const [streamLoading, setStreamLoading] = useState(false);
  const [auctionLoading, setAuctionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Live Auction new-product form ────────────────────────────────────────
  const [auctionProductName, setAuctionProductName] = useState("");
  const [auctionStartingBid, setAuctionStartingBid] = useState("");
  const [auctionDurationHours, setAuctionDurationHours] = useState<number>(5);
  const [auctionSizesRaw, setAuctionSizesRaw] = useState(""); // comma-separated
  const [auctionColors, setAuctionColors] = useState(""); // comma-separated
  const [auctionDescription, setAuctionDescription] = useState("");
  const [auctionImages, setAuctionImages] = useState<File[]>([]);
  const [auctionImagePreviews, setAuctionImagePreviews] = useState<string[]>([]);
  const [auctionUploadProgress, setAuctionUploadProgress] = useState(0);
  const auctionFileInputRef = useRef<HTMLInputElement>(null);
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

  // ── Image selection for auction product ──────────────────────────────────
  const handleAuctionImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((f) => f.type.startsWith("image/")).slice(0, 5);
    if (!files.length) return;
    setAuctionImages((prev) => [...prev, ...files].slice(0, 5));
    const previews = files.map((f) => URL.createObjectURL(f));
    setAuctionImagePreviews((prev) => [...prev, ...previews].slice(0, 5));
  };

  const removeAuctionImage = (index: number) => {
    setAuctionImages((prev) => prev.filter((_, i) => i !== index));
    setAuctionImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };
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
        product: placeholderProduct as Product,
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

    const productName = auctionProductName.trim();
    const startingBid = Math.round(Number(auctionStartingBid || 0));

    if (!productName) {
      setError("Please enter a product name.");
      return;
    }
    if (!startingBid || startingBid <= 0) {
      setError("Please set a starting bid greater than 0.");
      return;
    }
    if (!primaryVendor) {
      setError("No approved seller store found.");
      return;
    }

    const accessToken = (await (await import("@/lib/supabaseClient")).getSupabaseClient()?.auth.getSession())?.data.session?.access_token;

    setAuctionLoading(true);

    try {
      // Upload first image (if any)
      let imageUrl = "";
      if (auctionImages.length > 0 && accessToken) {
        setAuctionUploadProgress(1);
        const result = await uploadMediaToCloudinary(auctionImages[0], {
          kind: "image",
          folder: "live-auctions",
          accessToken,
          onProgress: (p) => setAuctionUploadProgress(Math.round(p * 0.9)),
        });
        imageUrl = result.url;
        setAuctionUploadProgress(100);
      }

      const normalizedHours = Math.min(24, Math.max(1, Math.round(auctionDurationHours)));
      const sizes = auctionSizesRaw.split(",").map((s) => s.trim()).filter(Boolean);
      const colors = auctionColors.split(",").map((s) => s.trim()).filter(Boolean);

      const syntheticProduct = {
        id: `auction-new-${Date.now()}`,
        title: productName,
        price: startingBid,
        image: imageUrl,
        vendorId: primaryVendor.id,
        description: "",
        category: "",
        variants: [],
      };

      const session = await createLiveSession({
        vendorId: primaryVendor.id,
        vendorName: primaryVendor.name,
        sellerUserId: user?.id,
        product: syntheticProduct as Product,
        auctionEnabled: true,
        auctionDurationHours: normalizedHours,
        productVariants: { sizes, colors },
        description: auctionDescription.trim(),
      });

      await refreshSessions();
      navigate(`/live/view/${session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create auction");
    } finally {
      setAuctionLoading(false);
      setAuctionUploadProgress(0);
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
            <Link to="/seller">
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
                      <p className="text-sm text-purple-700 mt-2">
                        Got one item you want to sell fast? Set it up right here — no listing needed.
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">

                  {/* Product Name */}
                  <div>
                    <Label htmlFor="auction-name" className="text-sm font-semibold">
                      Product Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="auction-name"
                      className="mt-2"
                      placeholder="e.g. Vintage leather jacket"
                      value={auctionProductName}
                      onChange={(e) => setAuctionProductName(e.target.value)}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <Label htmlFor="auction-description" className="text-sm font-semibold">Description</Label>
                    <Textarea
                      id="auction-description"
                      className="mt-2 resize-none"
                      rows={3}
                      placeholder="Describe what you're auctioning — condition, material, size details…"
                      value={auctionDescription}
                      onChange={(e) => setAuctionDescription(e.target.value)}
                    />
                  </div>

                  {/* Images */}
                  <div>
                    <Label className="text-sm font-semibold">Photos (up to 5)</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {auctionImagePreviews.map((src, i) => (
                        <div key={i} className="relative h-20 w-20 rounded-lg overflow-hidden border border-gray-200">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAuctionImage(i)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {auctionImagePreviews.length < 5 && (
                        <button
                          type="button"
                          onClick={() => auctionFileInputRef.current?.click()}
                          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-purple-300 text-purple-500 hover:border-purple-500 hover:bg-purple-50 transition-colors"
                        >
                          <ImagePlus className="h-5 w-5" />
                          <span className="text-[10px]">Add photo</span>
                        </button>
                      )}
                    </div>
                    <input
                      ref={auctionFileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleAuctionImageSelect}
                    />
                  </div>

                  {/* Variants row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="auction-sizes" className="text-sm font-semibold">Sizes</Label>
                      <Input
                        id="auction-sizes"
                        className="mt-2"
                        placeholder="S, M, L, XL"
                        value={auctionSizesRaw}
                        onChange={(e) => setAuctionSizesRaw(e.target.value)}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Comma-separated</p>
                    </div>
                    <div>
                      <Label htmlFor="auction-colors" className="text-sm font-semibold">Colors</Label>
                      <Input
                        id="auction-colors"
                        className="mt-2"
                        placeholder="Black, Red"
                        value={auctionColors}
                        onChange={(e) => setAuctionColors(e.target.value)}
                      />
                      <p className="text-[11px] text-gray-400 mt-1">Comma-separated</p>
                    </div>
                  </div>

                  {/* Starting bid + duration */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="auction-bid" className="text-sm font-semibold">
                        Starting Bid (RWF) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="auction-bid"
                        type="number"
                        min={1}
                        className="mt-2"
                        placeholder="e.g. 15000"
                        value={auctionStartingBid}
                        onChange={(e) => setAuctionStartingBid(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor="auction-duration" className="text-sm font-semibold">Duration (hours)</Label>
                      <Input
                        id="auction-duration"
                        type="number"
                        min={1}
                        max={24}
                        value={auctionDurationHours}
                        onChange={(e) => setAuctionDurationHours(Math.min(24, Math.max(1, Number(e.target.value || 1))))}
                        className="mt-2"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-purple-50 p-4 space-y-1.5">
                    <div className="text-sm font-semibold text-gray-900">How it works:</div>
                    <ul className="space-y-1 text-xs text-gray-700">
                      <li>✓ Buyers' bid amounts are <strong>locked</strong> from their wallet instantly</li>
                      <li>✓ When outbid, the previous bidder's funds are <strong>released</strong> automatically</li>
                      <li>✓ Highest bidder at the end wins — their locked funds are charged</li>
                      <li>✓ Auction runs for the selected hours then closes automatically</li>
                    </ul>
                  </div>

                  {auctionLoading && auctionUploadProgress > 0 && (
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">Uploading image… {auctionUploadProgress}%</div>
                      <div className="h-1.5 w-full rounded-full bg-gray-200">
                        <div
                          className="h-1.5 rounded-full bg-purple-500 transition-all"
                          style={{ width: `${auctionUploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleCreateLiveAuction}
                    disabled={auctionLoading || !auctionProductName.trim() || !auctionStartingBid}
                    size="lg"
                    className="w-full rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-semibold disabled:opacity-50"
                  >
                    {auctionLoading ? (
                      <><span className="animate-spin mr-2">⏳</span> {auctionUploadProgress > 0 ? "Uploading…" : "Creating…"}</>
                    ) : (
                      <><Plus className="h-4 w-4 mr-2" /> Go Live with Auction</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 text-center">No camera needed — buyers bid directly on your product</p>
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
                                {session.auctionDurationHours ? <span className="ml-2">· {session.auctionDurationHours}h duration</span> : null}
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

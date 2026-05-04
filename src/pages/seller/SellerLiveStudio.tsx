import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Video, Gavel, StopCircle, AlertCircle, ImagePlus, X, ArrowLeft, Radio, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase">Live Studio</span>
            </div>
          </div>
          <Link to="/seller">
            <button className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {/* Page title */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight">Go Live</h1>
          <p className="mt-1.5 text-gray-400">Stream your products or run a live auction — your choice.</p>
        </div>

        {!primaryVendor ? (
          <div className="rounded-2xl border border-yellow-900/60 bg-yellow-950/30 p-10 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold mb-2">Seller Store Required</h3>
            <p className="text-sm text-gray-400 mb-5">You need an approved seller store before going live.</p>
            <Link to="/seller/onboarding">
              <Button className="rounded-full bg-white text-gray-900 hover:bg-gray-100 font-semibold px-6">
                Start Seller Application
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Two panels */}
            <div className="grid gap-4 lg:grid-cols-2">
              {/* ── Live Stream ── */}
              <div className="rounded-2xl bg-gray-900 p-7 flex flex-col gap-6 border border-gray-800 hover:border-gray-700 transition-colors">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-950 px-3 py-1 text-[11px] font-semibold tracking-wider text-blue-400 uppercase mb-4">
                    <Video className="h-3 w-3" /> Live Stream
                  </div>
                  <h2 className="text-xl font-bold">Broadcast your store</h2>
                  <p className="mt-1 text-sm text-gray-400">Camera on, products visible, buyers purchase instantly.</p>
                </div>

                <ul className="space-y-2 text-sm text-gray-400">
                  {["Camera & mic enable — you're live", "Showcase multiple products", "Set prices & inventory live", "Buyers purchase in real-time", "Auto sold-out when stock hits 0"].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-blue-500 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-3">
                  <div className="rounded-xl border border-gray-800 bg-gray-950/60 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-gray-500">Your store</span>
                    <span className="text-sm font-medium">{primaryVendor.name}</span>
                  </div>
                  <Button
                    onClick={handleStartLiveStream}
                    disabled={streamLoading}
                    size="lg"
                    className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold h-12 disabled:opacity-50"
                  >
                    {streamLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
                    {streamLoading ? "Starting…" : "Start Live Stream"}
                  </Button>
                  <p className="text-center text-xs text-gray-600">Camera & mic access required</p>
                </div>
              </div>

              {/* ── Live Auction ── */}
              <div className="rounded-2xl bg-gray-900 p-7 flex flex-col gap-5 border border-gray-800 hover:border-gray-700 transition-colors">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-violet-950 px-3 py-1 text-[11px] font-semibold tracking-wider text-violet-400 uppercase mb-4">
                    <Gavel className="h-3 w-3" /> Live Auction
                  </div>
                  <h2 className="text-xl font-bold">Sell one item fast</h2>
                  <p className="mt-1 text-sm text-gray-400">No listing needed. Buyers bid, highest bidder wins.</p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label htmlFor="auction-name" className="text-xs font-medium text-gray-400 mb-1.5 block">
                        Product Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="auction-name"
                        placeholder="e.g. Vintage leather jacket"
                        value={auctionProductName}
                        onChange={(e) => setAuctionProductName(e.target.value)}
                        className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500 rounded-xl h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="auction-bid" className="text-xs font-medium text-gray-400 mb-1.5 block">
                        Starting Bid (RWF) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="auction-bid"
                        type="number"
                        min={1}
                        placeholder="15000"
                        value={auctionStartingBid}
                        onChange={(e) => setAuctionStartingBid(e.target.value)}
                        className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500 rounded-xl h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="auction-duration" className="text-xs font-medium text-gray-400 mb-1.5 block">Duration (hrs)</Label>
                      <Input
                        id="auction-duration"
                        type="number"
                        min={1}
                        max={24}
                        value={auctionDurationHours}
                        onChange={(e) => setAuctionDurationHours(Math.min(24, Math.max(1, Number(e.target.value || 1))))}
                        className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500 rounded-xl h-10"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="auction-description" className="text-xs font-medium text-gray-400 mb-1.5 block">Description</Label>
                    <Textarea
                      id="auction-description"
                      rows={2}
                      placeholder="Condition, material, size details…"
                      value={auctionDescription}
                      onChange={(e) => setAuctionDescription(e.target.value)}
                      className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500 rounded-xl resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="auction-sizes" className="text-xs font-medium text-gray-400 mb-1.5 block">Sizes</Label>
                      <Input
                        id="auction-sizes"
                        placeholder="S, M, L, XL"
                        value={auctionSizesRaw}
                        onChange={(e) => setAuctionSizesRaw(e.target.value)}
                        className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500 rounded-xl h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="auction-colors" className="text-xs font-medium text-gray-400 mb-1.5 block">Colors</Label>
                      <Input
                        id="auction-colors"
                        placeholder="Black, Red"
                        value={auctionColors}
                        onChange={(e) => setAuctionColors(e.target.value)}
                        className="bg-gray-950 border-gray-800 text-white placeholder:text-gray-600 focus:border-violet-500 rounded-xl h-10"
                      />
                    </div>
                  </div>

                  {/* Photos */}
                  <div>
                    <Label className="text-xs font-medium text-gray-400 mb-1.5 block">Photos (up to 5)</Label>
                    <div className="flex flex-wrap gap-2">
                      {auctionImagePreviews.map((src, i) => (
                        <div key={i} className="relative h-16 w-16 rounded-lg overflow-hidden border border-gray-700">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAuctionImage(i)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {auctionImagePreviews.length < 5 && (
                        <button
                          type="button"
                          onClick={() => auctionFileInputRef.current?.click()}
                          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-gray-700 text-gray-500 hover:border-violet-600 hover:text-violet-400 transition-colors"
                        >
                          <ImagePlus className="h-4 w-4" />
                          <span className="text-[9px]">Add</span>
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
                </div>

                {/* Upload progress */}
                {auctionLoading && auctionUploadProgress > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Uploading image…</span><span>{auctionUploadProgress}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-gray-800">
                      <div className="h-1 rounded-full bg-violet-500 transition-all" style={{ width: `${auctionUploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="mt-auto space-y-3">
                  <Button
                    onClick={handleCreateLiveAuction}
                    disabled={auctionLoading || !auctionProductName.trim() || !auctionStartingBid}
                    size="lg"
                    className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold h-12 disabled:opacity-40"
                  >
                    {auctionLoading
                      ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{auctionUploadProgress > 0 ? "Uploading…" : "Creating…"}</>
                      : <><Gavel className="h-4 w-4 mr-2" /> Go Live with Auction</>
                    }
                  </Button>
                  <p className="text-center text-xs text-gray-600">No camera needed</p>
                </div>
              </div>
            </div>

            {/* Currently Live */}
            {activeSessions.length > 0 && (
              <div className="rounded-2xl bg-gray-900 border border-gray-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-800 flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-semibold">Live Now</span>
                  <span className="ml-auto text-xs text-gray-500">{activeSessions.length} session{activeSessions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-gray-800">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${session.auctionEnabled ? "bg-violet-950 text-violet-400" : "bg-blue-950 text-blue-400"}`}>
                          {session.auctionEnabled ? "Auction" : "Stream"}
                        </div>
                        <span className="font-medium text-sm truncate">{session.productTitle}</span>
                        <span className="text-xs text-gray-500 shrink-0">
                          {session.auctionEnabled
                            ? `Bid: ${formatMoney(session.currentBidRwf)}`
                            : `${session.watchers} watching`}
                        </span>
                      </div>
                      <button
                        onClick={async () => { await endLiveSession(session.id); await refreshSessions(); }}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-900/50 hover:border-red-800"
                      >
                        <StopCircle className="h-3.5 w-3.5" /> End
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How auctions work — minimal */}
            <div className="rounded-2xl border border-gray-800 px-6 py-5 grid sm:grid-cols-4 gap-4 text-center">
              {[
                { step: "01", text: "Buyer bids — funds locked instantly" },
                { step: "02", text: "Outbid? Funds released automatically" },
                { step: "03", text: "Auction closes after set duration" },
                { step: "04", text: "Winner charged, item is theirs" },
              ].map(({ step, text }) => (
                <div key={step} className="space-y-1">
                  <div className="text-xs font-bold text-gray-700">{step}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

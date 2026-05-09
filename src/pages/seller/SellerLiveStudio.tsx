import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { StopCircle, AlertCircle, ImagePlus, X, ArrowLeft, Loader2 } from "lucide-react";
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
  const [auctionPrimaryImageUrl, setAuctionPrimaryImageUrl] = useState("");
  const [auctionImageUploading, setAuctionImageUploading] = useState(false);
  const auctionFileInputRef = useRef<HTMLInputElement>(null);
  const primaryVendor = ownedVendors[0];

  const uploadAuctionPrimaryImage = useCallback(async (file: File) => {
    const accessToken = (await (await import("@/lib/supabaseClient")).getSupabaseClient()?.auth.getSession())?.data.session?.access_token;
    if (!accessToken) {
      setError("Please sign in again to upload images.");
      return;
    }

    setAuctionImageUploading(true);
    setAuctionUploadProgress(1);
    try {
      const result = await uploadMediaToCloudinary(file, {
        kind: "image",
        folder: "live-auctions",
        accessToken,
        onProgress: (p) => setAuctionUploadProgress(Math.max(1, Math.round(p))),
      });
      setAuctionPrimaryImageUrl(result.url);
      setAuctionUploadProgress(100);
    } catch (err) {
      setAuctionPrimaryImageUrl("");
      setAuctionUploadProgress(0);
      setError(err instanceof Error ? err.message : "Image upload failed.");
    } finally {
      setAuctionImageUploading(false);
    }
  }, []);

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
    const hadNoImages = auctionImages.length === 0;
    setAuctionImages((prev) => [...prev, ...files].slice(0, 5));
    const previews = files.map((f) => URL.createObjectURL(f));
    setAuctionImagePreviews((prev) => [...prev, ...previews].slice(0, 5));
    if (hadNoImages) {
      void uploadAuctionPrimaryImage(files[0]);
    }
  };

  const removeAuctionImage = (index: number) => {
    const nextImages = auctionImages.filter((_, i) => i !== index);
    setAuctionImages(nextImages);
    setAuctionImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
    if (index === 0) {
      setAuctionPrimaryImageUrl("");
      setAuctionUploadProgress(0);
      if (nextImages[0]) {
        void uploadAuctionPrimaryImage(nextImages[0]);
      }
    }
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

    setAuctionLoading(true);

    try {
      let imageUrl = auctionPrimaryImageUrl;
      if (auctionImages.length > 0) {
        if (auctionImageUploading) {
          setError("Image is still uploading. Please wait a moment.");
          setAuctionLoading(false);
          return;
        }
        if (!imageUrl) {
          setError("Please re-select the image so it can finish uploading.");
          setAuctionLoading(false);
          return;
        }
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
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <h1 className="text-base font-semibold text-gray-900">Live Studio</h1>
          <Link to="/seller">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-900">Go Live</h2>
          <p className="mt-1 text-sm text-gray-500">Stream your products or run a timed auction — no setup needed.</p>
        </div>

        {!primaryVendor ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-gray-400 mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">Seller Store Required</h3>
            <p className="text-sm text-gray-500 mb-5">You need an approved seller store before going live.</p>
            <Link to="/seller/onboarding">
              <Button className="rounded-full bg-black text-white hover:bg-gray-800 font-medium px-6">
                Start Seller Application
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Two panels */}
            <div className="grid gap-4 lg:grid-cols-2 items-start">

              {/* ── Live Stream ── */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-6">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Live Stream</p>
                  <h3 className="text-lg font-semibold text-gray-900">Broadcast your store</h3>
                  <p className="mt-1 text-sm text-gray-500">Camera on, products visible — buyers shop in real-time.</p>
                </div>

                <ul className="space-y-2.5">
                  {[
                    "Camera & mic enable — you're live instantly",
                    "Showcase multiple products",
                    "Set prices & inventory on the fly",
                    "Buyers purchase in real-time",
                    "Auto sold-out when inventory hits 0",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-gray-600">
                      <span className="shrink-0 h-1.5 w-1.5 rounded-full bg-gray-400" />
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 mt-auto">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-gray-400">Broadcasting as</span>
                    <span className="text-sm font-medium text-gray-900">{primaryVendor.name}</span>
                  </div>
                  <Button
                    onClick={handleStartLiveStream}
                    disabled={streamLoading}
                    size="lg"
                    className="w-full rounded-xl bg-black hover:bg-gray-800 text-white font-medium h-11 disabled:opacity-50"
                  >
                    {streamLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {streamLoading ? "Requesting permissions…" : "Start Live Stream"}
                  </Button>
                  <p className="text-center text-xs text-gray-400">Camera & mic access required</p>
                </div>
              </div>

              {/* ── Live Auction ── */}
              <div className="rounded-xl border border-gray-200 bg-white p-6 flex flex-col gap-5">
                <div>
                  <p className="text-[11px] font-semibold tracking-widest text-gray-400 uppercase mb-3">Live Auction</p>
                  <h3 className="text-lg font-semibold text-gray-900">Sell one item fast</h3>
                  <p className="mt-1 text-sm text-gray-500">No listing needed. Set a starting bid — highest bidder wins.</p>
                </div>

                {/* Form */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="auction-name" className="text-xs font-medium text-gray-600 mb-1.5 block">
                      Product Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="auction-name"
                      placeholder="e.g. Vintage leather jacket"
                      value={auctionProductName}
                      onChange={(e) => setAuctionProductName(e.target.value)}
                      className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 rounded-xl h-10"
                    />
                  </div>

                  <div>
                    <Label htmlFor="auction-description" className="text-xs font-medium text-gray-600 mb-1.5 block">Description</Label>
                    <Textarea
                      id="auction-description"
                      rows={2}
                      placeholder="Condition, material, size details…"
                      value={auctionDescription}
                      onChange={(e) => setAuctionDescription(e.target.value)}
                      className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 rounded-xl resize-none"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Photos (up to 5)</Label>
                    <div className="flex flex-wrap gap-2">
                      {auctionImagePreviews.map((src, i) => (
                        <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-gray-200">
                          <img src={src} alt="" className="h-full w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removeAuctionImage(i)}
                            className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white hover:bg-black transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {auctionImagePreviews.length < 5 && (
                        <button
                          type="button"
                          onClick={() => auctionFileInputRef.current?.click()}
                          className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-gray-500 hover:text-gray-600 transition-all"
                        >
                          <ImagePlus className="h-4 w-4" />
                          <span className="text-[9px] font-medium">Add</span>
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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="auction-sizes" className="text-xs font-medium text-gray-600 mb-1.5 block">Sizes</Label>
                      <Input
                        id="auction-sizes"
                        placeholder="S, M, L, XL"
                        value={auctionSizesRaw}
                        onChange={(e) => setAuctionSizesRaw(e.target.value)}
                        className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 rounded-xl h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="auction-colors" className="text-xs font-medium text-gray-600 mb-1.5 block">Colors</Label>
                      <Input
                        id="auction-colors"
                        placeholder="Black, Red"
                        value={auctionColors}
                        onChange={(e) => setAuctionColors(e.target.value)}
                        className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 rounded-xl h-10"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="auction-bid" className="text-xs font-medium text-gray-600 mb-1.5 block">
                        Starting Bid (RWF) <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="auction-bid"
                        type="number"
                        min={1}
                        placeholder="15000"
                        value={auctionStartingBid}
                        onChange={(e) => setAuctionStartingBid(e.target.value)}
                        className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 rounded-xl h-10"
                      />
                    </div>
                    <div>
                      <Label htmlFor="auction-duration" className="text-xs font-medium text-gray-600 mb-1.5 block">Duration (hrs)</Label>
                      <Input
                        id="auction-duration"
                        type="number"
                        min={1}
                        max={24}
                        value={auctionDurationHours}
                        onChange={(e) => setAuctionDurationHours(Math.min(24, Math.max(1, Number(e.target.value || 1))))}
                        className="border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-400 rounded-xl h-10"
                      />
                    </div>
                  </div>
                </div>

                {/* Upload progress */}
                {(auctionImageUploading || (auctionLoading && auctionUploadProgress > 0)) && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{auctionImageUploading ? "Uploading image now…" : "Uploading image…"}</span>
                      <span>{auctionUploadProgress}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-gray-100">
                      <div className="h-1 rounded-full bg-gray-900 transition-all" style={{ width: `${auctionUploadProgress}%` }} />
                    </div>
                  </div>
                )}

                <div className="space-y-3 mt-auto">
                  <Button
                    onClick={handleCreateLiveAuction}
                    disabled={auctionLoading || auctionImageUploading || !auctionProductName.trim() || !auctionStartingBid}
                    size="lg"
                    className="w-full rounded-xl bg-black hover:bg-gray-800 text-white font-medium h-11 disabled:opacity-40"
                  >
                    {auctionLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {auctionLoading
                      ? (auctionUploadProgress > 0 ? "Uploading…" : "Creating…")
                      : "Go Live with Auction"
                    }
                  </Button>
                  <p className="text-center text-xs text-gray-400">No camera needed</p>
                </div>
              </div>
            </div>

            {/* Currently Live */}
            {activeSessions.length > 0 && (
              <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-900">Live Now</span>
                  <span className="ml-auto text-xs text-gray-400">{activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-gray-100">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] font-semibold text-gray-500 uppercase">
                          {session.auctionEnabled ? "Auction" : "Stream"}
                        </span>
                        <span className="font-medium text-sm text-gray-900 truncate">{session.productTitle}</span>
                        <span className="text-xs text-gray-400 shrink-0">
                          {session.auctionEnabled
                            ? `Bid: ${formatMoney(session.currentBidRwf)}`
                            : `${session.watchers} watching`}
                        </span>
                      </div>
                      <button
                        onClick={async () => { await endLiveSession(session.id); await refreshSessions(); }}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700 transition-colors px-3 py-1.5 rounded-lg border border-red-200 hover:bg-red-50"
                      >
                        <StopCircle className="h-3.5 w-3.5" /> End
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How auctions work */}
            <div className="rounded-xl border border-gray-200 bg-white px-6 py-5">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">How Live Auctions Work</p>
              <div className="grid sm:grid-cols-4 gap-5">
                {[
                  { step: "01", text: "Buyer bids — funds locked instantly" },
                  { step: "02", text: "Outbid? Funds released automatically" },
                  { step: "03", text: "Auction closes after set duration" },
                  { step: "04", text: "Winner charged, item is theirs" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                    <div className="shrink-0 h-7 w-7 rounded-full border border-gray-200 bg-gray-50 flex items-center justify-center text-[11px] font-bold text-gray-500">
                      {step}
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

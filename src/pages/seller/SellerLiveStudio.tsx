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
    <div className="min-h-screen bg-[#070709] text-white">
      {/* Ambient glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden>
        <div className="absolute -top-48 -left-48 h-96 w-96 rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-1/2 -right-48 h-96 w-96 rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#070709]/80 backdrop-blur-sm sticky top-0">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5 rounded-full border border-red-500/25 bg-red-500/8 px-3.5 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-[11px] font-bold tracking-[0.15em] text-red-400 uppercase">Live Studio</span>
          </div>
          <Link to="/seller">
            <button className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6 py-12">
        {/* Hero */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight bg-gradient-to-b from-white to-gray-500 bg-clip-text text-transparent">
            Go Live
          </h1>
          <p className="mt-3 text-base text-gray-500">
            Stream your products or run a timed auction — no setup needed.
          </p>
        </div>

        {!primaryVendor ? (
          <div className="rounded-2xl border border-yellow-900/40 bg-yellow-950/15 p-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-900/30 border border-yellow-800/40">
              <AlertCircle className="h-6 w-6 text-yellow-500" />
            </div>
            <h3 className="text-lg font-bold mb-2">Seller Store Required</h3>
            <p className="text-sm text-gray-500 mb-6">You need an approved seller store before going live.</p>
            <Link to="/seller/onboarding">
              <Button className="rounded-full bg-white text-gray-900 hover:bg-gray-100 font-bold px-8 h-11">
                Start Seller Application
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-3 rounded-xl border border-red-900/40 bg-red-950/25 px-4 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            {/* Two panels */}
            <div className="grid gap-4 lg:grid-cols-2 items-start">

              {/* ── Live Stream ── */}
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-b from-[#0f1117] to-[#0a0b0e] transition-all duration-300 hover:border-blue-500/30">
                {/* top accent line */}
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/70 to-transparent" />
                {/* top glow fill */}
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-blue-600/8 to-transparent pointer-events-none" />

                <div className="relative p-7 flex flex-col gap-7">
                  {/* Badge + heading */}
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-blue-400 uppercase mb-4">
                      <Video className="h-3 w-3" /> Live Stream
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">Broadcast your store</h2>
                    <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                      Camera on, products visible — buyers shop in real-time.
                    </p>
                  </div>

                  {/* Feature list */}
                  <ul className="space-y-3">
                    {[
                      "Camera & mic enable — you're live instantly",
                      "Showcase multiple products",
                      "Set prices & inventory on the fly",
                      "Buyers purchase in real-time",
                      "Auto sold-out when inventory hits 0",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm text-gray-400">
                        <span className="shrink-0 h-5 w-5 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
                          <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>

                  {/* Store chip + CTA */}
                  <div className="space-y-3 pt-1">
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 flex items-center justify-between">
                      <span className="text-xs text-gray-600">Broadcasting as</span>
                      <div className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-sm font-semibold text-white">{primaryVendor.name}</span>
                      </div>
                    </div>
                    <Button
                      onClick={handleStartLiveStream}
                      disabled={streamLoading}
                      size="lg"
                      className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold h-12 text-[15px] disabled:opacity-50 shadow-[0_4px_24px_rgba(59,130,246,0.25)] transition-all"
                    >
                      {streamLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Radio className="h-4 w-4 mr-2" />}
                      {streamLoading ? "Requesting permissions…" : "Start Live Stream"}
                    </Button>
                    <p className="text-center text-xs text-gray-700">Camera & mic access required</p>
                  </div>
                </div>
              </div>

              {/* ── Live Auction ── */}
              <div className="relative rounded-2xl overflow-hidden border border-white/[0.07] bg-gradient-to-b from-[#0f1117] to-[#0a0b0e] transition-all duration-300 hover:border-violet-500/30">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/70 to-transparent" />
                <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-violet-600/8 to-transparent pointer-events-none" />

                <div className="relative p-7 flex flex-col gap-5">
                  {/* Badge + heading */}
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/25 bg-violet-500/10 px-3 py-1 text-[11px] font-bold tracking-[0.12em] text-violet-400 uppercase mb-4">
                      <Gavel className="h-3 w-3" /> Live Auction
                    </div>
                    <h2 className="text-2xl font-extrabold text-white">Sell one item fast</h2>
                    <p className="mt-1.5 text-sm text-gray-500 leading-relaxed">
                      No listing needed. Set a starting bid — highest bidder wins.
                    </p>
                  </div>

                  {/* Form */}
                  <div className="space-y-4">
                    {/* Product name */}
                    <div>
                      <Label htmlFor="auction-name" className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">
                        Product Name <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="auction-name"
                        placeholder="e.g. Vintage leather jacket"
                        value={auctionProductName}
                        onChange={(e) => setAuctionProductName(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-violet-500/50 focus:bg-white/[0.06] rounded-xl h-10 transition-all"
                      />
                    </div>

                    {/* Description */}
                    <div>
                      <Label htmlFor="auction-description" className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">
                        Description
                      </Label>
                      <Textarea
                        id="auction-description"
                        rows={2}
                        placeholder="Condition, material, size details…"
                        value={auctionDescription}
                        onChange={(e) => setAuctionDescription(e.target.value)}
                        className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-violet-500/50 focus:bg-white/[0.06] rounded-xl resize-none transition-all"
                      />
                    </div>

                    {/* Photos */}
                    <div>
                      <Label className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">
                        Photos (up to 5)
                      </Label>
                      <div className="flex flex-wrap gap-2">
                        {auctionImagePreviews.map((src, i) => (
                          <div key={i} className="relative h-16 w-16 rounded-xl overflow-hidden border border-white/10">
                            <img src={src} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeAuctionImage(i)}
                              className="absolute top-0.5 right-0.5 rounded-full bg-black/75 p-0.5 text-white hover:bg-black transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                        {auctionImagePreviews.length < 5 && (
                          <button
                            type="button"
                            onClick={() => auctionFileInputRef.current?.click()}
                            className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/10 text-gray-600 hover:border-violet-500/50 hover:text-violet-400 hover:bg-violet-500/5 transition-all"
                          >
                            <ImagePlus className="h-4 w-4" />
                            <span className="text-[9px] font-semibold">Add</span>
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

                    {/* Sizes + Colors */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="auction-sizes" className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">Sizes</Label>
                        <Input
                          id="auction-sizes"
                          placeholder="S, M, L, XL"
                          value={auctionSizesRaw}
                          onChange={(e) => setAuctionSizesRaw(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-violet-500/50 rounded-xl h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="auction-colors" className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">Colors</Label>
                        <Input
                          id="auction-colors"
                          placeholder="Black, Red"
                          value={auctionColors}
                          onChange={(e) => setAuctionColors(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-violet-500/50 rounded-xl h-10"
                        />
                      </div>
                    </div>

                    {/* Bid + Duration */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="auction-bid" className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">
                          Starting Bid (RWF) <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="auction-bid"
                          type="number"
                          min={1}
                          placeholder="15000"
                          value={auctionStartingBid}
                          onChange={(e) => setAuctionStartingBid(e.target.value)}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-violet-500/50 rounded-xl h-10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="auction-duration" className="text-[11px] font-bold text-gray-500 mb-1.5 block tracking-[0.08em] uppercase">Duration (hrs)</Label>
                        <Input
                          id="auction-duration"
                          type="number"
                          min={1}
                          max={24}
                          value={auctionDurationHours}
                          onChange={(e) => setAuctionDurationHours(Math.min(24, Math.max(1, Number(e.target.value || 1))))}
                          className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-gray-700 focus:border-violet-500/50 rounded-xl h-10"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Upload progress */}
                  {auctionLoading && auctionUploadProgress > 0 && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Uploading image…</span>
                        <span>{auctionUploadProgress}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-white/[0.06]">
                        <div className="h-1 rounded-full bg-gradient-to-r from-violet-600 to-violet-400 transition-all" style={{ width: `${auctionUploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {/* CTA */}
                  <div className="space-y-3 pt-1">
                    <Button
                      onClick={handleCreateLiveAuction}
                      disabled={auctionLoading || !auctionProductName.trim() || !auctionStartingBid}
                      size="lg"
                      className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white font-bold h-12 text-[15px] disabled:opacity-40 shadow-[0_4px_24px_rgba(139,92,246,0.25)] transition-all"
                    >
                      {auctionLoading
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{auctionUploadProgress > 0 ? "Uploading…" : "Creating…"}</>
                        : <><Gavel className="h-4 w-4 mr-2" /> Go Live with Auction</>
                      }
                    </Button>
                    <p className="text-center text-xs text-gray-700">No camera needed</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Currently Live */}
            {activeSessions.length > 0 && (
              <div className="relative rounded-2xl overflow-hidden border border-green-500/20 bg-gradient-to-b from-[#0a110d] to-[#070709]">
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
                <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-2.5">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  <span className="text-sm font-bold text-green-400">Live Now</span>
                  <span className="ml-auto text-xs text-gray-600">{activeSessions.length} active session{activeSessions.length !== 1 ? "s" : ""}</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="px-6 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase border ${session.auctionEnabled ? "bg-violet-500/15 text-violet-400 border-violet-500/25" : "bg-blue-500/15 text-blue-400 border-blue-500/25"}`}>
                          {session.auctionEnabled ? "Auction" : "Stream"}
                        </div>
                        <span className="font-semibold text-sm text-white truncate">{session.productTitle}</span>
                        <span className="text-xs text-gray-600 shrink-0">
                          {session.auctionEnabled
                            ? `Bid: ${formatMoney(session.currentBidRwf)}`
                            : `${session.watchers} watching`}
                        </span>
                      </div>
                      <button
                        onClick={async () => { await endLiveSession(session.id); await refreshSessions(); }}
                        className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg border border-red-900/40 hover:border-red-800/60 hover:bg-red-950/25"
                      >
                        <StopCircle className="h-3.5 w-3.5" /> End
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* How auctions work */}
            <div className="rounded-2xl border border-white/[0.05] bg-white/[0.015] px-6 py-6">
              <p className="text-[11px] font-bold tracking-[0.15em] text-gray-700 uppercase mb-5">How Live Auctions Work</p>
              <div className="grid sm:grid-cols-4 gap-5">
                {[
                  { step: "01", text: "Buyer bids — funds locked instantly" },
                  { step: "02", text: "Outbid? Funds released automatically" },
                  { step: "03", text: "Auction closes after set duration" },
                  { step: "04", text: "Winner charged, item is theirs" },
                ].map(({ step, text }) => (
                  <div key={step} className="flex items-start gap-3 sm:flex-col sm:items-center sm:text-center">
                    <div className="shrink-0 h-8 w-8 rounded-full bg-white/[0.04] border border-white/[0.07] flex items-center justify-center text-[11px] font-black text-gray-600">
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

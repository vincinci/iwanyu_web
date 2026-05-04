import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, StopCircle, Users, Gavel, Package, Camera, Plus, TrendingUp, Minus, Send, ImagePlus, X, Trash2, ChevronUp } from "lucide-react";
import { uploadMediaToCloudinary } from "@/lib/cloudinary";
import { getLiveSessions, endLiveSession, updateStreamProducts, type LiveSession, type StreamProduct } from "@/lib/liveSessions";
import { fetchRecentComments, subscribeToComments, trackViewerPresence, postComment, type LiveComment } from "@/lib/liveComments";
import { LiveBroadcaster } from "@/lib/liveWebRTC";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";

type PostedStreamProduct = StreamProduct & { soldCount: number };

function productsStorageKey(sessionId: string) {
  return `iwanyu:live-session-products:${sessionId}`;
}

export default function LiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const broadcasterRef = useRef<LiveBroadcaster | null>(null);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  
  const [session, setSession] = useState<LiveSession | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [mobileSheetTab, setMobileSheetTab] = useState<'product' | 'sales' | 'end'>('product');
  const [viewerCount, setViewerCount] = useState(1);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [sellerComment, setSellerComment] = useState("");
  const [sellerPosting, setSellerPosting] = useState(false);

  const [title, setTitle] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [productImageFile, setProductImageFile] = useState<File | null>(null);
  const [productImagePreview, setProductImagePreview] = useState<string | null>(null);
  const [productImageUrl, setProductImageUrl] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const [postedProducts, setPostedProducts] = useState<PostedStreamProduct[]>([]);
  const [postingProduct, setPostingProduct] = useState(false);

  // Load session data
  useEffect(() => {
    const loadSession = () => {
      if (!sessionId) return;
      
      const allSessions = getLiveSessions();
      const foundSession = allSessions.find(s => s.id === sessionId);
      
      if (!foundSession) {
        setError("Session not found");
        setLoading(false);
        return;
      }
      
      setSession(foundSession);
      setLoading(false);
    };

    loadSession();
    const interval = setInterval(loadSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Subscribe to live comments
  useEffect(() => {
    if (!sessionId) return;
    void fetchRecentComments(sessionId).then(setComments);
    const unsub = subscribeToComments(sessionId, (comment) => {
      setComments((prev) => [...prev.slice(-99), comment]);
    });
    return unsub;
  }, [sessionId]);

  // Auto-scroll comments
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // Track seller as a viewer in presence channel (contributes to viewer count)
  useEffect(() => {
    if (!sessionId) return;
    const key = user?.id ?? `seller-${Math.random().toString(36).slice(2, 10)}`;
    const unsub = trackViewerPresence(sessionId, key, setViewerCount);
    return unsub;
  }, [sessionId, user?.id]);

  // Post a comment as the seller
  const handleSellerComment = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!sellerComment.trim() || !sessionId) return;
    setSellerPosting(true);
    const name = session?.vendorName ?? user?.name ?? "Seller";
    await postComment(sessionId, user?.id ?? null, name, sellerComment);
    setSellerComment("");
    setSellerPosting(false);
  }, [sellerComment, sessionId, session?.vendorName, user]);

  // Load previously posted stream products for this session.
  useEffect(() => {
    if (!sessionId) return;
    try {
      const raw = window.localStorage.getItem(productsStorageKey(sessionId));
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const normalized = parsed.filter((item): item is PostedStreamProduct => {
        return (
          item &&
          typeof item.id === "string" &&
          typeof item.title === "string" &&
          typeof item.color === "string" &&
          typeof item.size === "string" &&
          typeof item.priceRwf === "number" &&
          typeof item.quantityAvailable === "number" &&
          typeof item.soldCount === "number"
        );
      });
      setPostedProducts(normalized);
    } catch {
      // Ignore malformed local storage
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    window.localStorage.setItem(productsStorageKey(sessionId), JSON.stringify(postedProducts));
  }, [postedProducts, sessionId]);

  // Start camera stream + WebRTC broadcast
  useEffect(() => {
    if (!cameraEnabled || !sessionId) return;

    const startCamera = async () => {
      setCameraStatus("starting");
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
          audio: true,
        });

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.muted = true;
          try { await videoRef.current.play(); } catch { /* autoplay blocked */ }
        }
        setCameraStatus("live");

        // Start (or update) WebRTC broadcast
        if (!broadcasterRef.current) {
          const bc = new LiveBroadcaster(sessionId);
          bc.setStream(stream);
          await bc.start();
          broadcasterRef.current = bc;
        } else {
          broadcasterRef.current.setStream(stream);
        }
      } catch {
        setCameraStatus("error");
        setError("Camera or microphone could not start. Please allow permissions and click Resume Camera.");
      }
    };

    void startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [cameraEnabled, sessionId]);

  const totals = useMemo(() => {
    const totalListed = postedProducts.reduce((sum, p) => sum + Math.max(0, p.quantityAvailable), 0);
    const totalSold = postedProducts.reduce((sum, p) => sum + Math.max(0, p.soldCount), 0);
    const totalRevenue = postedProducts.reduce((sum, p) => sum + Math.max(0, p.soldCount) * Math.max(0, p.priceRwf), 0);
    return { totalListed, totalSold, totalRevenue };
  }, [postedProducts]);

  const handleProductImageSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProductImageFile(file);
    setProductImagePreview(URL.createObjectURL(file));
    setProductImageUrl("");
    // Upload immediately in background
    setImageUploading(true);
    try {
      const accessToken = (await (await import("@/lib/supabaseClient")).getSupabaseClient()?.auth.getSession())?.data.session?.access_token;
      const result = await uploadMediaToCloudinary(file, {
        kind: "image",
        folder: "live-stream-products",
        accessToken: accessToken ?? "",
      });
      setProductImageUrl(result.url);
    } catch {
      setError("Image upload failed. You can still post without an image.");
    } finally {
      setImageUploading(false);
    }
  }, []);

  const handlePostProduct = async () => {
    const normalizedTitle = title.trim();
    const normalizedColor = color.trim();
    const normalizedSize = size.trim();
    const priceRwf = Math.max(0, Math.round(Number(price || 0)));
    const quantityAvailable = Math.max(1, Math.round(Number(quantity || 0)));

    if (!normalizedTitle) { setError("Enter a product title before posting."); return; }
    if (!priceRwf) { setError("Enter a valid product price."); return; }
    if (imageUploading) { setError("Image is still uploading, please wait."); return; }

    setError(null);
    setPostingProduct(true);

    const newProduct: PostedStreamProduct = {
      id: `posted_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: normalizedTitle,
      color: normalizedColor,
      size: normalizedSize,
      priceRwf,
      quantityAvailable,
      imageUrl: productImageUrl || undefined,
      soldCount: 0,
    };

    setPostedProducts((prev) => {
      const next = [newProduct, ...prev];
      if (sessionId) {
        void updateStreamProducts(
          sessionId,
          next.map(({ soldCount: _s, ...p }) => p)
        );
      }
      return next;
    });

    setPostingProduct(false);
    setTitle(""); setColor(""); setSize(""); setPrice(""); setQuantity("");
    setProductImageFile(null); setProductImagePreview(null); setProductImageUrl("");
    if (productImageInputRef.current) productImageInputRef.current.value = "";
  };

  const handleRecordSale = (productId: string, delta: 1 | -1) => {
    setPostedProducts((prev) =>
      prev.map((product) => {
        if (product.id !== productId) return product;
        const nextSold = Math.max(0, Math.min(product.quantityAvailable, product.soldCount + delta));
        return { ...product, soldCount: nextSold };
      })
    );
  };

  const handleDeleteProduct = (productId: string) => {
    setPostedProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      if (sessionId) {
        void updateStreamProducts(
          sessionId,
          next.map(({ soldCount: _s, ...p }) => p)
        );
      }
      return next;
    });
  };

  const handleEndSession = async () => {
    if (!sessionId) return;
    // Stop WebRTC broadcast
    broadcasterRef.current?.stop();
    broadcasterRef.current = null;
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    await endLiveSession(sessionId);
    navigate("/seller/live-studio");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-700 border-t-white mx-auto mb-4" />
          <p className="text-white">Starting your live session...</p>
        </div>
      </div>
    );
  }

  if (!session || error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <Card className="max-w-md bg-gray-800 border-gray-700">
          <CardContent className="py-8 px-6">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mx-auto mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-center text-lg font-semibold text-white mb-2">Session Error</h3>
            <p className="text-center text-gray-300 text-sm mb-6">{error || "Could not load session"}</p>
            <Button onClick={() => navigate("/seller/live-studio")} className="w-full rounded-lg">
              Back to Live Studio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-dvh bg-black flex flex-col overflow-hidden">

      {/* ── Main area: camera + desktop sidebar ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── Camera column — phone frame on mobile, full-area on desktop ── */}
        <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">

          {/* Camera frame: full-screen on mobile, 9/16 centered on desktop */}
          <div className="absolute inset-0 overflow-hidden lg:relative lg:inset-auto lg:h-full lg:aspect-[9/16]">

          {/* Video / paused state */}
          {cameraEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900">
              <div className="text-center">
                <Camera className="mx-auto h-14 w-14 text-slate-500" />
                <p className="mt-3 text-slate-400 text-sm">Camera paused</p>
              </div>
            </div>
          )}

          {/* Top gradient */}
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/70 to-transparent pointer-events-none" />

          {/* Bottom gradient */}
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />

          {/* ── TOP BAR overlay ── */}
          <div
            className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 py-3"
            style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
          >
            <div className="flex items-center gap-1.5 bg-red-600 rounded-full px-2.5 py-1 shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
              <span className="text-[11px] font-bold text-white uppercase tracking-wide">Live</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold truncate leading-tight">
                {session.auctionEnabled ? "Live Auction" : "Live Stream"}
              </p>
              <p className="text-white/60 text-[11px] truncate">{session.vendorName}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-black/40 rounded-full px-2.5 py-1 backdrop-blur">
                <Users className="h-3 w-3 text-white" />
                <span className="text-xs text-white font-semibold">{viewerCount}</span>
              </div>
              <Button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                size="sm"
                className="hidden lg:flex rounded-full bg-white/20 hover:bg-white/30 text-white border-0 h-8 px-3 text-xs backdrop-blur"
              >
                <Camera className="h-3.5 w-3.5 mr-1" />
                {cameraEnabled ? "Pause" : "Resume"}
              </Button>
              <Button
                onClick={() => setConfirmEnd(true)}
                size="sm"
                className="hidden lg:flex rounded-full bg-red-600 hover:bg-red-700 text-white border-0 h-8 px-3 text-xs"
              >
                <StopCircle className="h-3.5 w-3.5 mr-1" /> End Live
              </Button>
            </div>
          </div>

          {/* ── TWITCH-STYLE CHAT OVERLAY ── */}
          <div className="absolute left-3 right-16 bottom-20 flex flex-col justify-end gap-1.5 max-h-48 overflow-hidden pointer-events-none">
            {comments.slice(-6).map((c) => (
              <div key={c.id} className="flex items-start gap-1.5 w-fit max-w-[85%]">
                <span className="inline-flex h-5 w-5 rounded-full bg-amber-400 text-[10px] font-bold text-amber-900 items-center justify-center shrink-0 mt-0.5">
                  {c.userName.charAt(0).toUpperCase()}
                </span>
                <div className="rounded-xl bg-black/60 backdrop-blur-sm px-2.5 py-1 text-xs leading-snug">
                  <span className="font-semibold text-amber-300 mr-1">{c.userName}</span>
                  <span className="text-white">{c.text}</span>
                </div>
              </div>
            ))}
            <div ref={commentsEndRef} />
          </div>

          {/* ── BOTTOM STATUS BAR (desktop only) ── */}
          <div className="absolute bottom-0 left-0 right-0 hidden lg:flex items-center gap-2 px-4 py-3">
            <span className={`rounded-full text-[11px] font-medium px-2.5 py-1 ${
              cameraStatus === "live" ? "bg-green-600 text-white" :
              cameraStatus === "error" ? "bg-red-600 text-white" :
              "bg-white/20 text-white backdrop-blur"
            }`}>
              {cameraStatus === "starting" ? "Starting…" :
               cameraStatus === "live" ? "● Camera Live" :
               cameraStatus === "error" ? "⚠ Camera Error" : "Camera Idle"}
            </span>
            {session.auctionEnabled && (
              <span className="rounded-full bg-purple-600/80 backdrop-blur text-[11px] font-medium px-2.5 py-1 text-white flex items-center gap-1">
                <Gavel className="h-3 w-3" /> {formatMoney(session.currentBidRwf)}
              </span>
            )}
            {/* desktop stats */}
            <span className="hidden lg:inline rounded-full bg-white/20 backdrop-blur text-[11px] text-white px-2.5 py-1">
              Listed: {totals.totalListed}
            </span>
            <span className="hidden lg:inline rounded-full bg-white/20 backdrop-blur text-[11px] text-white px-2.5 py-1">
              Revenue: {formatMoney(totals.totalRevenue)}
            </span>
          </div>

          {/* ── MOBILE RIGHT-SIDE ACTIONS (TikTok style) ── */}
          <div className="absolute right-3 bottom-24 z-30 lg:hidden flex flex-col gap-5">
            <button onClick={() => { setMobileSheetTab('product'); setMobileSheetOpen(true); }} className="flex flex-col items-center gap-1">
              <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white font-medium drop-shadow">Products</span>
            </button>
            <button onClick={() => setCameraEnabled(!cameraEnabled)} className="flex flex-col items-center gap-1">
              <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center">
                <Camera className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white font-medium drop-shadow">{cameraEnabled ? "Pause" : "Resume"}</span>
            </button>
            <button onClick={() => { setMobileSheetTab('sales'); setMobileSheetOpen(true); }} className="flex flex-col items-center gap-1">
              <div className="h-11 w-11 rounded-full bg-black/50 backdrop-blur border border-white/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <span className="text-[10px] text-white font-medium drop-shadow">Sales</span>
            </button>
          </div>

          {/* ── MOBILE BOTTOM BAR (chat input + sheet trigger) ── */}
          <div className="absolute bottom-0 left-0 right-0 z-30 lg:hidden flex items-center gap-2 px-3" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <form onSubmit={handleSellerComment} className="flex-1 flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2.5 border border-white/20">
              <input
                placeholder="Reply to viewers…"
                value={sellerComment}
                onChange={(e) => setSellerComment(e.target.value)}
                className="flex-1 bg-transparent text-white placeholder:text-white/60 text-sm outline-none min-w-0"
                maxLength={500}
                disabled={sellerPosting}
              />
              {sellerComment.trim() && (
                <button type="submit" disabled={sellerPosting} className="text-amber-400 shrink-0">
                  <Send className="h-4 w-4" />
                </button>
              )}
            </form>
            <button
              onClick={() => setMobileSheetOpen(true)}
              className="h-10 w-10 rounded-full bg-white/20 backdrop-blur border border-white/30 flex items-center justify-center text-white shrink-0"
            >
              <ChevronUp className="h-5 w-5" />
            </button>
          </div>

          {/* ── END LIVE CONFIRMATION OVERLAY ── */}
          {confirmEnd && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="bg-white rounded-2xl p-6 mx-4 text-center shadow-2xl max-w-xs w-full">
                <div className="h-14 w-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                  <StopCircle className="h-7 w-7 text-red-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-1">End your live?</h3>
                <p className="text-gray-500 text-sm mb-6">Your viewers will be disconnected and the stream will end.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setConfirmEnd(false)}
                    className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleEndSession}
                    className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white py-3 text-sm font-bold transition-colors"
                  >
                    End Live
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>{/* end camera frame */}
        </div>{/* end camera column */}

        {/* ── DESKTOP RIGHT SIDEBAR ── */}
        <div className="hidden lg:flex flex-col w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {/* Error */}
            {error && (
              <div className="mx-4 mt-4 rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Product Details */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" /> Product Details
              </h3>
              <div className="space-y-3">
                {/* Photo */}
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Product Photo</Label>
                  <div className="flex items-center gap-2">
                    {productImagePreview ? (
                      <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img src={productImagePreview} alt="" className="h-full w-full object-cover" />
                        {imageUploading && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            <span className="text-[10px] text-white">↑</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => { setProductImageFile(null); setProductImagePreview(null); setProductImageUrl(""); if (productImageInputRef.current) productImageInputRef.current.value = ""; }}
                          className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"
                        ><X className="h-2.5 w-2.5" /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => productImageInputRef.current?.click()}
                        className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:bg-slate-50 shrink-0"
                      >
                        <ImagePlus className="h-5 w-5" />
                        <span className="text-[9px] mt-0.5">Add</span>
                      </button>
                    )}
                    <p className="text-[11px] text-slate-400">{imageUploading ? "Uploading…" : productImageUrl ? "✓ Ready" : "Optional product image shown to viewers"}</p>
                  </div>
                  <input ref={productImageInputRef} type="file" accept="image/*" className="hidden" onChange={handleProductImageSelect} />
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">Product Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg" placeholder="Product name" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Color</Label>
                    <Input value={color} onChange={(e) => setColor(e.target.value)} className="rounded-lg" placeholder="Black" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Size</Label>
                    <Input value={size} onChange={(e) => setSize(e.target.value)} className="rounded-lg" placeholder="M / 42" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Price (RWF)</Label>
                    <Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg" placeholder="0" />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Quantity</Label>
                    <Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg" placeholder="0" />
                  </div>
                </div>
                <Button className="w-full rounded-lg" onClick={handlePostProduct} disabled={postingProduct || imageUploading}>
                  <Plus className="mr-2 h-4 w-4" /> {postingProduct ? "Posting…" : "Post Product"}
                </Button>
                <p className="text-[11px] text-slate-400 text-center">Posted products appear below with live sales tracking.</p>
              </div>
            </div>

            {/* Pause camera */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                variant={cameraEnabled ? "outline" : "default"}
                className="w-full rounded-lg"
                size="sm"
              >
                <Camera className="mr-2 h-4 w-4" />
                {cameraEnabled ? "Pause Camera" : "Resume Camera"}
              </Button>
            </div>

            {/* Stream Sales */}
            <div className="p-4">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4" /> Stream Sales
              </h3>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                  <div className="text-[10px] text-slate-500">Listed</div>
                  <div className="font-semibold text-sm">{totals.totalListed}</div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                  <div className="text-[10px] text-slate-500">Sold</div>
                  <div className="font-semibold text-sm">{totals.totalSold}</div>
                </div>
                <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-2">
                  <div className="text-[10px] text-slate-500">Revenue</div>
                  <div className="font-semibold text-[11px]">{formatMoney(totals.totalRevenue)}</div>
                </div>
              </div>
              {postedProducts.length === 0 ? (
                <p className="text-xs text-slate-400">No products posted in this stream yet.</p>
              ) : (
                <div className="space-y-2">
                  {postedProducts.map((product) => {
                    const remaining = Math.max(0, product.quantityAvailable - product.soldCount);
                    const revenue = product.priceRwf * product.soldCount;
                    return (
                      <div key={product.id} className="rounded-lg border border-slate-200 dark:border-slate-700 p-2">
                        <div className="text-xs font-semibold">{product.title}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          {product.color || "—"} · {product.size || "—"} · {formatMoney(product.priceRwf)}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          Sold: {product.soldCount}/{product.quantityAvailable} · {formatMoney(revenue)}
                        </div>
                        <div className="mt-1.5 flex items-center justify-end gap-1">
                          <Button size="sm" variant="outline" className="h-7 px-2 text-red-500 hover:text-red-600 hover:border-red-300" onClick={() => handleDeleteProduct(product.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleRecordSale(product.id, -1)} disabled={product.soldCount === 0}>
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" className="h-7 px-2" onClick={() => handleRecordSale(product.id, 1)} disabled={remaining <= 0}>
                            <Plus className="h-3.5 w-3.5" /> Sale
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop chat input (messages show in Twitch overlay on video) */}
          <form
            onSubmit={handleSellerComment}
            className="flex gap-1.5 border-t border-slate-200 dark:border-slate-800 px-3 py-3 shrink-0"
          >
            <Input
              placeholder="Reply to viewers…"
              value={sellerComment}
              onChange={(e) => setSellerComment(e.target.value)}
              className="h-8 text-xs rounded-lg"
              maxLength={500}
              disabled={sellerPosting}
            />
            <Button type="submit" size="sm" className="h-8 px-2 rounded-lg shrink-0" disabled={sellerPosting || !sellerComment.trim()}>
              <Send className="h-3.5 w-3.5" />
            </Button>
          </form>
        </div>
      </div>

      {/* ── MOBILE BOTTOM SHEET ── */}
      {mobileSheetOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileSheetOpen(false)} />
          <div className="relative bg-white rounded-t-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-gray-300" />
            </div>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 shrink-0 px-2">
              <button
                onClick={() => setMobileSheetTab('product')}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors ${mobileSheetTab === 'product' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent'}`}
              >
                <Package className="h-4 w-4" />Post Product
              </button>
              <button
                onClick={() => setMobileSheetTab('sales')}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors ${mobileSheetTab === 'sales' ? 'text-gray-900 border-gray-900' : 'text-gray-400 border-transparent'}`}
              >
                <TrendingUp className="h-4 w-4" />Sales
              </button>
              <button
                onClick={() => setMobileSheetTab('end')}
                className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium border-b-2 transition-colors ${mobileSheetTab === 'end' ? 'text-red-600 border-red-600' : 'text-gray-400 border-transparent'}`}
              >
                <StopCircle className="h-4 w-4" />End Live
              </button>
            </div>
            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {mobileSheetTab === 'product' && (
                <div className="space-y-3">
                  {error && (
                    <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-red-700">{error}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Product Photo</Label>
                    <div className="flex items-center gap-2">
                      {productImagePreview ? (
                        <div className="relative h-14 w-14 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                          <img src={productImagePreview} alt="" className="h-full w-full object-cover" />
                          {imageUploading && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="text-[10px] text-white">↑</span></div>}
                          <button type="button" onClick={() => { setProductImageFile(null); setProductImagePreview(null); setProductImageUrl(""); if (productImageInputRef.current) productImageInputRef.current.value = ""; }} className="absolute top-0.5 right-0.5 rounded-full bg-black/60 p-0.5 text-white"><X className="h-2.5 w-2.5" /></button>
                        </div>
                      ) : (
                        <button type="button" onClick={() => productImageInputRef.current?.click()} className="flex h-14 w-14 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 text-slate-400 hover:border-slate-400 hover:bg-slate-50 shrink-0">
                          <ImagePlus className="h-5 w-5" /><span className="text-[9px] mt-0.5">Add</span>
                        </button>
                      )}
                      <p className="text-[11px] text-slate-400">{imageUploading ? "Uploading…" : productImageUrl ? "✓ Ready" : "Optional product image"}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block">Product Title</Label>
                    <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-lg" placeholder="Product name" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs text-slate-500 mb-1 block">Color</Label><Input value={color} onChange={(e) => setColor(e.target.value)} className="rounded-lg" placeholder="Black" /></div>
                    <div><Label className="text-xs text-slate-500 mb-1 block">Size</Label><Input value={size} onChange={(e) => setSize(e.target.value)} className="rounded-lg" placeholder="M / 42" /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs text-slate-500 mb-1 block">Price (RWF)</Label><Input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className="rounded-lg" placeholder="0" /></div>
                    <div><Label className="text-xs text-slate-500 mb-1 block">Quantity</Label><Input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-lg" placeholder="0" /></div>
                  </div>
                  <Button className="w-full rounded-lg" onClick={async () => { await handlePostProduct(); setMobileSheetOpen(false); }} disabled={postingProduct || imageUploading}>
                    <Plus className="mr-2 h-4 w-4" /> {postingProduct ? "Posting…" : "Post Product"}
                  </Button>
                </div>
              )}
              {mobileSheetTab === 'sales' && (
                <div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-4">
                    <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] text-slate-500">Listed</div><div className="font-semibold text-sm mt-0.5">{totals.totalListed}</div></div>
                    <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] text-slate-500">Sold</div><div className="font-semibold text-sm mt-0.5">{totals.totalSold}</div></div>
                    <div className="rounded-lg bg-slate-50 p-3"><div className="text-[10px] text-slate-500">Revenue</div><div className="font-semibold text-[11px] mt-0.5">{formatMoney(totals.totalRevenue)}</div></div>
                  </div>
                  {postedProducts.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">No products posted yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {postedProducts.map((product) => {
                        const remaining = Math.max(0, product.quantityAvailable - product.soldCount);
                        const revenue = product.priceRwf * product.soldCount;
                        return (
                          <div key={product.id} className="rounded-lg border border-slate-200 p-3">
                            <div className="text-xs font-semibold">{product.title}</div>
                            <div className="text-[11px] text-slate-500 mt-0.5">{product.color || "—"} · {product.size || "—"} · {formatMoney(product.priceRwf)}</div>
                            <div className="text-[11px] text-slate-500">Sold: {product.soldCount}/{product.quantityAvailable} · {formatMoney(revenue)}</div>
                            <div className="mt-2 flex items-center justify-end gap-1">
                              <Button size="sm" variant="outline" className="h-7 px-2 text-red-500" onClick={() => handleDeleteProduct(product.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" variant="outline" className="h-7 px-2" onClick={() => handleRecordSale(product.id, -1)} disabled={product.soldCount === 0}><Minus className="h-3.5 w-3.5" /></Button>
                              <Button size="sm" className="h-7 px-2" onClick={() => handleRecordSale(product.id, 1)} disabled={remaining <= 0}><Plus className="h-3.5 w-3.5" /> Sale</Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
              {mobileSheetTab === 'end' && (
                <div className="py-8 text-center">
                  <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                    <StopCircle className="h-8 w-8 text-red-600" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-xl mb-2">End your live?</h3>
                  <p className="text-gray-500 text-sm mb-8">Your viewers will be disconnected and the stream will end permanently.</p>
                  <Button onClick={handleEndSession} className="w-full rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold py-4 text-base h-auto">
                    <StopCircle className="h-5 w-5 mr-2" /> End Live Now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

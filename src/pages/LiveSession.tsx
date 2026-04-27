import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, StopCircle, Users, Gavel, Package, Camera, Mic, Plus, TrendingUp, Minus, MessageCircle, Send } from "lucide-react";
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
  const [viewerCount, setViewerCount] = useState(1);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [sellerComment, setSellerComment] = useState("");
  const [sellerPosting, setSellerPosting] = useState(false);

  const [title, setTitle] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");
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

  const handlePostProduct = () => {
    const normalizedTitle = title.trim();
    const normalizedColor = color.trim();
    const normalizedSize = size.trim();
    const priceRwf = Math.max(0, Math.round(Number(price || 0)));
    const quantityAvailable = Math.max(1, Math.round(Number(quantity || 0)));

    if (!normalizedTitle) { setError("Enter a product title before posting."); return; }
    if (!priceRwf) { setError("Enter a valid product price."); return; }

    setError(null);
    setPostingProduct(true);

    const newProduct: PostedStreamProduct = {
      id: `posted_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
      title: normalizedTitle,
      color: normalizedColor,
      size: normalizedSize,
      priceRwf,
      quantityAvailable,
      soldCount: 0,
    };

    setPostedProducts((prev) => {
      const next = [newProduct, ...prev];
      // Sync to Supabase so viewers can see it
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
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white/85 backdrop-blur px-6 py-4 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex items-center gap-2 shrink-0">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-500">Live</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-bold tracking-tight truncate">{session.auctionEnabled ? "Live Auction" : "Live Stream"}</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{session.vendorName}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 rounded-full bg-slate-900/10 px-2.5 py-1 dark:bg-white/10">
              <Users className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{viewerCount}</span>
            </div>
            <Button
              onClick={() => setCameraEnabled(!cameraEnabled)}
              variant={cameraEnabled ? "outline" : "default"}
              size="sm"
              className="rounded-full"
            >
              <Camera className="h-4 w-4 mr-1" />
              {cameraEnabled ? "Pause" : "Resume"}
            </Button>
            <Button
              onClick={handleEndSession}
              variant="destructive"
              size="sm"
              className="rounded-full"
            >
              <StopCircle className="h-4 w-4 mr-1" /> End
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Video Feed */}
          <div className="flex-1 flex flex-col">
            <div className="relative rounded-2xl overflow-hidden flex-1 mb-4 border border-slate-200 bg-black shadow-xl dark:border-slate-800">
              {cameraEnabled ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <Camera className="mx-auto h-12 w-12 text-slate-400" />
                    <p className="mt-3 text-slate-300">Camera paused</p>
                  </div>
                </div>
              )}
              
              {/* Live indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-2 rounded-full text-white">
                <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-semibold">LIVE</span>
              </div>

              <div className="absolute bottom-4 left-4 right-4 rounded-xl bg-black/45 p-3 text-white backdrop-blur">
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-200">Camera</div>
                    <div className="mt-1 text-sm font-semibold">
                      {cameraStatus === "starting" ? "Starting" : cameraStatus === "live" ? "Live" : cameraStatus === "error" ? "Error" : "Idle"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-200">Products Listed</div>
                    <div className="mt-1 text-sm font-semibold">{totals.totalListed}</div>
                  </div>
                  <div className="rounded-lg bg-white/10 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-slate-200">Revenue</div>
                    <div className="mt-1 text-sm font-semibold">{formatMoney(totals.totalRevenue)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats — only shown for auction (bid info) */}
            {session.auctionEnabled && (
              <div className="mt-4">
                <Card className="border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-1 dark:text-slate-400">
                      <Gavel className="h-3 w-3" /> Current Bid
                    </div>
                    <div className="text-lg font-bold">{formatMoney(session.currentBidRwf)}</div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Sidebar - Product Info */}
          <div className="w-80 flex flex-col gap-4">
            <Card className="border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90 flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block dark:text-slate-400">Product Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="rounded-lg"
                    placeholder="Product name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block dark:text-slate-400">Color</Label>
                    <Input
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="rounded-lg"
                      placeholder="Black"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block dark:text-slate-400">Size</Label>
                    <Input
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="rounded-lg"
                      placeholder="M / 42"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block dark:text-slate-400">Price (RWF)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500 mb-1 block dark:text-slate-400">Quantity</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full rounded-lg" onClick={handlePostProduct} disabled={postingProduct}>
                    <Plus className="mr-2 h-4 w-4" /> {postingProduct ? "Posting..." : "Post Product"}
                  </Button>
                  <p className="text-xs text-slate-500 mt-2 text-center dark:text-slate-400">Posted products appear below with live sales tracking.</p>
                </div>
              </CardContent>
            </Card>

            {/* Controls — only Pause/Resume camera, End Session is in header */}
            <div>
              <Button
                onClick={() => setCameraEnabled(!cameraEnabled)}
                variant={cameraEnabled ? "outline" : "default"}
                className="w-full rounded-lg"
              >
                {cameraEnabled ? (
                  <><Camera className="mr-2 h-4 w-4" /> Pause Camera</>
                ) : (
                  <><Mic className="mr-2 h-4 w-4" /> Resume Camera</>
                )}
              </Button>
            </div>

            <Card className="border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm inline-flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" /> Stream Sales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Listed</div>
                    <div className="font-semibold">{totals.totalListed}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Sold</div>
                    <div className="font-semibold">{totals.totalSold}</div>
                  </div>
                  <div className="rounded-lg bg-slate-100 p-2 dark:bg-slate-800">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400">Revenue</div>
                    <div className="font-semibold text-[12px]">{formatMoney(totals.totalRevenue)}</div>
                  </div>
                </div>

                {postedProducts.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">No products posted in this stream yet.</p>
                ) : (
                  <div className="max-h-52 space-y-2 overflow-auto pr-1">
                    {postedProducts.map((product) => {
                      const remaining = Math.max(0, product.quantityAvailable - product.soldCount);
                      const revenue = product.priceRwf * product.soldCount;
                      return (
                        <div key={product.id} className="rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                          <div className="text-xs font-semibold">{product.title}</div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                            {product.color ? `Color: ${product.color}` : "Color: -"} · {product.size ? `Size: ${product.size}` : "Size: -"}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-600 dark:text-slate-300">
                            Price: {formatMoney(product.priceRwf)} · Sold: {product.soldCount}/{product.quantityAvailable} · Revenue: {formatMoney(revenue)}
                          </div>
                          <div className="mt-2 flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              onClick={() => handleRecordSale(product.id, -1)}
                              disabled={product.soldCount === 0}
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 px-2"
                              onClick={() => handleRecordSale(product.id, 1)}
                              disabled={remaining <= 0}
                            >
                              <Plus className="h-3.5 w-3.5" /> Sale
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Chat (seller view) */}
            <Card className="border-slate-200 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm inline-flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" /> Live Chat
                  <span className="ml-auto text-xs text-slate-400 font-normal">{comments.length} msgs</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {/* Comment list */}
                <div className="h-48 overflow-y-auto px-3 pb-2 space-y-2">
                  {comments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center pt-4">No messages yet.</p>
                  ) : (
                    comments.map((c) => (
                      <div key={c.id} className="flex gap-1.5">
                        <div className="h-5 w-5 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0 mt-0.5">
                          {c.userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-200">{c.userName} </span>
                          <span className="text-xs text-slate-600 dark:text-slate-300 break-words">{c.text}</span>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>
                {/* Seller can reply */}
                <form onSubmit={handleSellerComment} className="flex gap-1.5 border-t border-slate-100 dark:border-slate-800 px-3 py-2">
                  <Input
                    placeholder="Reply to viewers…"
                    value={sellerComment}
                    onChange={(e) => setSellerComment(e.target.value)}
                    className="h-8 text-xs rounded-lg"
                    maxLength={500}
                    disabled={sellerPosting}
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 px-2 rounded-lg shrink-0"
                    disabled={sellerPosting || !sellerComment.trim()}
                  >
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

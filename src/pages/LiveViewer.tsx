import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Eye,
  Gavel,
  Send,
  Radio,
  MessageCircle,
  ArrowLeft,
  Clock,
  TrendingUp,
  Wallet,
  Lock,
  ShoppingBag,
  Wifi,
  WifiOff,
  Loader2,
  ShoppingCart,
  CheckCircle2,
} from "lucide-react";
import {
  fetchActiveLiveSessions,
  placeBidOnLiveAuction,
  getUserWalletBalance,
  getUserLockedBid,
  purchaseLiveStreamProduct,
  type LiveSession,
  type StreamProduct,
} from "@/lib/liveSessions";
import {
  fetchRecentComments,
  postComment,
  subscribeToComments,
  trackViewerPresence,
  type LiveComment,
} from "@/lib/liveComments";
import { LiveStreamViewer, type StreamConnectionState } from "@/lib/liveWebRTC";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function StreamProductCard({
  p,
  sessionId,
  session,
  user,
  onPurchased,
}: {
  p: StreamProduct;
  sessionId: string;
  session: LiveSession;
  user: { id: string; name?: string } | null;
  onPurchased?: () => void;
}) {
  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);

  const handleBuy = async () => {
    if (!user) { setMsg({ type: "error", text: "Log in to purchase." }); return; }
    if (p.quantityAvailable <= 0) { setMsg({ type: "error", text: "Sold out." }); return; }
    setBuying(true);
    setMsg(null);
    const result = await purchaseLiveStreamProduct({
      sessionId,
      product: p,
      sellerUserId: session.vendorId,
      vendorName: session.vendorName,
    });
    setBuying(false);
    setMsg({ type: result.ok ? "ok" : "error", text: result.message });
    if (result.ok) onPurchased?.();
  };

  const soldOut = p.quantityAvailable <= 0;

  return (
    <div className="flex gap-3 rounded-xl border border-gray-100 bg-white p-3">
      {p.imageUrl ? (
        <img
          src={p.imageUrl}
          alt={p.title}
          className="h-16 w-16 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="h-16 w-16 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
          <ShoppingBag className="h-6 w-6 text-gray-300" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900 truncate">{p.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          {[p.color, p.size].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center justify-between mt-1 gap-2">
          <p className="text-sm font-bold text-amber-600">{formatMoney(p.priceRwf)}</p>
          <p className="text-xs text-gray-400">{soldOut ? "Sold out" : `Qty: ${p.quantityAvailable}`}</p>
        </div>
        {user ? (
          <button
            onClick={handleBuy}
            disabled={buying || soldOut || msg?.type === "ok"}
            className={`mt-2 w-full rounded-full py-1.5 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors
              ${
                msg?.type === "ok"
                  ? "bg-green-100 text-green-700 cursor-default"
                  : soldOut
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-amber-500 hover:bg-amber-600 text-white"
              }`}
          >
            {buying ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : msg?.type === "ok" ? (
              <><CheckCircle2 className="h-3.5 w-3.5" /> Purchased!</>
            ) : (
              <><ShoppingCart className="h-3.5 w-3.5" /> Buy Now · {formatMoney(p.priceRwf)}</>
            )}
          </button>
        ) : (
          <p className="mt-2 text-[11px] text-center text-gray-400">Log in to buy</p>
        )}
        {msg && msg.type === "error" && (
          <p className="mt-1 text-[11px] text-red-600">{msg.text}</p>
        )}
      </div>
    </div>
  );
}

function StreamStateBadge({ state }: { state: StreamConnectionState }) {
  if (state === "connected") return null;
  const labels: Record<StreamConnectionState, string> = {
    idle: "Waiting for stream…",
    connecting: "Connecting…",
    connected: "",
    failed: "Stream unavailable",
    disconnected: "Reconnecting…",
  };
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm z-10">
      <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
      <p className="text-white text-sm font-medium">{labels[state]}</p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AUCTION VIEW
// ─────────────────────────────────────────────────────────────────────────────
interface AuctionViewProps {
  session: LiveSession;
  viewerCount: number;
  comments: LiveComment[];
  commentsEndRef: React.RefObject<HTMLDivElement>;
  commentText: string;
  setCommentText: (v: string) => void;
  posting: boolean;
  handleComment: (e?: React.FormEvent) => void;
  guestName: string;
  setGuestName: (v: string) => void;
  user: { id: string; name?: string } | null;
  walletAvailable: number | null;
  myLockedBid: number;
  bidAmount: string;
  setBidAmount: (v: string) => void;
  bidding: boolean;
  bidMsg: { type: "ok" | "error"; text: string } | null;
  setBidMsg: (v: { type: "ok" | "error"; text: string } | null) => void;
  handleBid: () => void;
}

function AuctionView({
  session, viewerCount, comments, commentsEndRef, commentText, setCommentText,
  posting, handleComment, guestName, setGuestName, user, walletAvailable,
  myLockedBid, bidAmount, setBidAmount, bidding, bidMsg, setBidMsg, handleBid,
}: AuctionViewProps) {
  const overBudget =
    walletAvailable !== null && bidAmount !== "" && Number(bidAmount) > walletAvailable;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 pb-3 flex items-center gap-3" style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}>
        <Link to="/live" className="text-gray-500 hover:text-gray-800">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-gray-900 truncate">{session.productTitle}</h1>
          <p className="text-xs text-gray-500">{session.vendorName}</p>
        </div>
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Eye className="h-3.5 w-3.5" /> {viewerCount}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Product image */}
        {session.productImage ? (
          <div className="w-full aspect-square max-h-80 overflow-hidden bg-gray-100">
            <img src={session.productImage} alt={session.productTitle} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-full aspect-square max-h-80 bg-gray-100 flex items-center justify-center">
            <ShoppingBag className="h-16 w-16 text-gray-300" />
          </div>
        )}

        {/* Badges */}
        <div className="px-4 pt-4 flex items-center gap-2 flex-wrap">
          <Badge className="bg-red-500 text-white rounded-full text-xs px-2 py-0.5 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
          </Badge>
          <Badge variant="outline" className="rounded-full text-xs border-purple-300 text-purple-700">
            <Gavel className="h-3 w-3 mr-1" /> Auction
          </Badge>
          {session.auctionDurationHours && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {session.auctionDurationHours}h
            </span>
          )}
        </div>

        {/* Description */}
        {session.description && (
          <div className="mx-4 mt-3 rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{session.description}</p>
          </div>
        )}

        {/* Bid panel */}
        <div className="mx-4 mt-4 rounded-2xl bg-purple-50 border border-purple-200 p-4 space-y-3">
          <div>
            <div className="text-xs text-purple-600 font-medium uppercase tracking-wide mb-0.5">Current Bid</div>
            <div className="text-2xl font-bold text-purple-900">{formatMoney(session.currentBidRwf)}</div>
          </div>

          {user ? (
            <>
              {walletAvailable !== null && (
                <div className="rounded-lg bg-white border border-purple-100 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-gray-600">
                    <Wallet className="h-3.5 w-3.5 text-purple-500" /> Wallet available
                  </span>
                  <span className="font-semibold text-gray-900">{formatMoney(walletAvailable)}</span>
                </div>
              )}
              {myLockedBid > 0 && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1 text-amber-700">
                    <Lock className="h-3.5 w-3.5" /> Your current bid (locked)
                  </span>
                  <span className="font-semibold text-amber-800">{formatMoney(myLockedBid)}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder={`More than ${formatMoney(session.currentBidRwf)}`}
                  value={bidAmount}
                  onChange={(e) => { setBidAmount(e.target.value); setBidMsg(null); }}
                  className={`rounded-lg ${overBudget ? "border-red-400" : ""}`}
                  min={session.currentBidRwf + 1}
                />
                <Button
                  onClick={handleBid}
                  disabled={bidding || overBudget || !bidAmount}
                  className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                >
                  <TrendingUp className="h-4 w-4 mr-1" />
                  {bidding ? "Placing…" : "Bid"}
                </Button>
              </div>
              {overBudget && (
                <p className="text-xs text-red-600">
                  Bid exceeds your available balance ({formatMoney(walletAvailable!)}).
                </p>
              )}
              {walletAvailable === 0 && (
                <p className="text-xs text-amber-600">Your wallet is empty. Top up to place bids.</p>
              )}
            </>
          ) : (
            <div className="text-center py-2">
              <p className="text-sm text-purple-700 mb-2">Log in to place a bid</p>
              <Link to="/login">
                <Button size="sm" className="rounded-full bg-purple-600 hover:bg-purple-700 text-white">
                  Log In to Bid
                </Button>
              </Link>
            </div>
          )}

          {bidMsg && (
            <p className={`text-sm font-medium ${bidMsg.type === "ok" ? "text-green-600" : "text-red-600"}`}>
              {bidMsg.text}
            </p>
          )}
        </div>

        {/* Chat */}
        <div className="mx-4 mt-4 mb-4 rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            <MessageCircle className="h-4 w-4 text-gray-500" />
            <span className="font-semibold text-sm text-gray-900">Live Chat</span>
            <span className="text-xs text-gray-400 ml-auto">{comments.length} messages</span>
          </div>
          <div className="h-52 overflow-y-auto p-3 space-y-2.5">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <MessageCircle className="h-7 w-7 mb-1 opacity-40" />
                <p className="text-xs">No messages yet</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                    {c.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-800 mr-1">{c.userName}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                    <p className="text-sm text-gray-700 break-words">{c.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>
          <div className="border-t border-gray-100 p-3 space-y-2">
            {!user && (
              <Input
                placeholder="Your name (optional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-lg text-sm h-8"
                maxLength={60}
              />
            )}
            <form onSubmit={handleComment} className="flex gap-2">
              <Input
                placeholder={user ? "Say something…" : "Comment as guest…"}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                className="rounded-lg"
                maxLength={500}
                disabled={posting}
              />
              <Button type="submit" size="sm" disabled={posting || !commentText.trim()} className="rounded-lg shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STREAM VIEW  — TikTok mobile, two-col desktop
// ─────────────────────────────────────────────────────────────────────────────
interface StreamViewProps {
  session: LiveSession;
  sessionId: string;
  viewerCount: number;
  comments: LiveComment[];
  commentsEndRef: React.RefObject<HTMLDivElement>;
  commentText: string;
  setCommentText: (v: string) => void;
  posting: boolean;
  handleComment: (e?: React.FormEvent) => void;
  guestName: string;
  setGuestName: (v: string) => void;
  user: { id: string; name?: string } | null;
}

function StreamView({
  session, sessionId, viewerCount, comments, commentsEndRef, commentText, setCommentText,
  posting, handleComment, guestName, setGuestName, user,
}: StreamViewProps) {
  const mobileVideoRef = useRef<HTMLVideoElement>(null);
  const desktopVideoRef = useRef<HTMLVideoElement>(null);
  const [streamState, setStreamState] = useState<StreamConnectionState>("idle");
  const viewerRef = useRef<LiveStreamViewer | null>(null);

  const [viewerId] = useState(() => {
    const key = `iwanyu:viewer-id:${sessionId}`;
    let id = sessionStorage.getItem(key);
    if (!id) { id = `v-${Math.random().toString(36).slice(2, 14)}`; sessionStorage.setItem(key, id); }
    return id;
  });

  useEffect(() => {
    const viewer = new LiveStreamViewer(sessionId, viewerId);
    viewerRef.current = viewer;
    viewer.onStream = (stream) => {
      [mobileVideoRef.current, desktopVideoRef.current].forEach((el) => {
        if (el) { el.srcObject = stream; void el.play().catch(() => null); }
      });
    };
    viewer.onState = setStreamState;
    void viewer.connect();
    return () => { viewer.disconnect(); viewerRef.current = null; };
  }, [sessionId, viewerId]);

  const [localProducts, setLocalProducts] = useState<StreamProduct[]>([]);

  // Sync local products when session updates
  useEffect(() => {
    setLocalProducts(session.streamProducts ?? []);
  }, [session.streamProducts]);

  const handlePurchased = (productId: string) => {
    setLocalProducts((prev) =>
      prev.map((p) =>
        p.id === productId
          ? { ...p, quantityAvailable: Math.max(0, p.quantityAvailable - 1) }
          : p
      )
    );
  };

  const ProductsList = (
    <div className="space-y-3">
      {localProducts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <ShoppingBag className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No products posted yet</p>
        </div>
      ) : (
        localProducts.map((p) => (
          <StreamProductCard
            key={p.id}
            p={p}
            sessionId={sessionId}
            session={session}
            user={user}
            onPurchased={() => handlePurchased(p.id)}
          />
        ))
      )}
    </div>
  );

  const ChatPanel = (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-0">
        {comments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center pt-4">No messages yet</p>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="flex gap-2">
              <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700 shrink-0">
                {c.userName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-gray-800 mr-1">{c.userName}</span>
                <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                <p className="text-sm text-gray-700 break-words">{c.text}</p>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>
      <div className="border-t border-gray-100 p-3 space-y-1.5">
        {!user && (
          <Input
            placeholder="Your name (optional)"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="rounded-lg text-sm h-8"
            maxLength={60}
          />
        )}
        <form onSubmit={handleComment} className="flex gap-2">
          <Input
            placeholder={user ? "Say something…" : "Comment as guest…"}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="rounded-lg"
            maxLength={500}
            disabled={posting}
          />
          <Button type="submit" size="sm" disabled={posting || !commentText.trim()} className="rounded-lg shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );

  return (
    <>
      {/* ── MOBILE: full-screen TikTok ── */}
      <div className="fixed inset-0 bg-black flex flex-col md:hidden">
        <div className="relative flex-1 overflow-hidden">
          <video ref={mobileVideoRef} autoPlay playsInline className="absolute inset-0 w-full h-full object-cover" />
          <StreamStateBadge state={streamState} />

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-4 pb-6 bg-gradient-to-b from-black/70 to-transparent z-20" style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}>
            <Link to="/live" className="text-white">
              <ArrowLeft className="h-6 w-6 drop-shadow" />
            </Link>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate drop-shadow">{session.productTitle}</p>
              <p className="text-white/70 text-xs">{session.vendorName}</p>
            </div>
            <Badge className="bg-red-500/90 text-white rounded-full text-xs px-2 py-0.5 flex items-center gap-1 backdrop-blur shrink-0">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </Badge>
            <span className="text-white/80 text-xs flex items-center gap-1 shrink-0">
              <Eye className="h-3.5 w-3.5" /> {viewerCount}
            </span>
            <span className="shrink-0">
              {streamState === "connected"
                ? <Wifi className="h-4 w-4 text-green-400 drop-shadow" />
                : <WifiOff className="h-4 w-4 text-red-400 drop-shadow" />}
            </span>
          </div>

          {/* Products button */}
          <div className="absolute bottom-32 right-4 z-30">
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  size="sm"
                  className="rounded-full bg-white/20 backdrop-blur border border-white/40 text-white hover:bg-white/30 gap-1.5"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Products{products.length > 0 ? ` (${products.length})` : ""}
                </Button>
              </SheetTrigger>
              <SheetContent side="bottom" className="max-h-[70vh] rounded-t-2xl overflow-y-auto">
                <SheetHeader className="mb-4">
                  <SheetTitle className="flex items-center gap-2">
                    <ShoppingBag className="h-5 w-5 text-amber-500" />
                    Products from {session.vendorName}
                  </SheetTitle>
                </SheetHeader>
                {ProductsList}
              </SheetContent>
            </Sheet>
          </div>

          {/* Chat overlay */}
          <div className="absolute bottom-0 left-0 right-0 z-20 px-3 bg-gradient-to-t from-black/70 via-black/30 to-transparent" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
            <div className="max-h-40 overflow-y-auto flex flex-col-reverse space-y-reverse space-y-1 mb-3">
              {[...comments].reverse().slice(0, 15).map((c) => (
                <div key={c.id} className="flex items-start gap-1.5">
                  <div className="h-5 w-5 rounded-full bg-amber-400 flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5">
                    {c.userName.charAt(0).toUpperCase()}
                  </div>
                  <p className="text-xs text-white drop-shadow">
                    <span className="font-semibold">{c.userName}:</span> {c.text}
                  </p>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
            <div className="space-y-1.5">
              {!user && (
                <Input
                  placeholder="Your name (optional)"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-full text-sm h-8 backdrop-blur"
                  maxLength={60}
                />
              )}
              <form onSubmit={handleComment} className="flex gap-2">
                <Input
                  placeholder="Say something…"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="bg-white/20 border-white/30 text-white placeholder:text-white/60 rounded-full flex-1 backdrop-blur"
                  maxLength={500}
                  disabled={posting}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={posting || !commentText.trim()}
                  className="rounded-full bg-amber-400 hover:bg-amber-500 text-black shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: two-column ── */}
      <div className="hidden md:flex min-h-screen bg-gray-950 text-white overflow-hidden">
        {/* Left: Video */}
        <div className="flex-1 relative">
          <video ref={desktopVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          <StreamStateBadge state={streamState} />
          <div className="absolute top-0 left-0 right-0 flex items-center gap-3 px-6 pt-6 pb-8 bg-gradient-to-b from-black/70 to-transparent z-20">
            <Link to="/live" className="text-white hover:text-gray-300"><ArrowLeft className="h-5 w-5" /></Link>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold truncate">{session.productTitle}</h1>
              <p className="text-sm text-white/70">{session.vendorName}</p>
            </div>
            <Badge className="bg-red-500 text-white rounded-full text-xs px-2 py-1 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> LIVE
            </Badge>
            <Badge variant="outline" className="rounded-full text-xs border-blue-300 text-blue-300">
              <Radio className="h-3 w-3 mr-1" /> Stream
            </Badge>
            <span className="text-white/70 text-xs flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" /> {viewerCount}
            </span>
            {streamState === "connected"
              ? <Wifi className="h-4 w-4 text-green-400" />
              : <WifiOff className="h-4 w-4 text-red-400" />}
          </div>
        </div>

        {/* Right: Products + Chat */}
        <div className="w-80 xl:w-96 bg-white text-gray-900 flex flex-col">
          <div className="border-b border-gray-100 px-4 py-3 flex items-center gap-2 shrink-0">
            <ShoppingBag className="h-4 w-4 text-amber-500" />
            <span className="font-semibold text-sm">Products</span>
            {products.length > 0 && <span className="ml-auto text-xs text-gray-400">{products.length} items</span>}
          </div>
          <div className="overflow-y-auto p-3 space-y-3" style={{ flex: "1 1 0", minHeight: 0 }}>
            {ProductsList}
          </div>
          <div className="border-t border-gray-200 flex flex-col shrink-0" style={{ maxHeight: "45%" }}>
            <div className="px-4 py-2 flex items-center gap-2 border-b border-gray-100 shrink-0">
              <MessageCircle className="h-4 w-4 text-gray-500" />
              <span className="font-semibold text-sm">Live Chat</span>
              <span className="ml-auto text-xs text-gray-400">{comments.length}</span>
            </div>
            {ChatPanel}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function LiveViewerPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useAuth();

  const [session, setSession] = useState<LiveSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewerCount, setViewerCount] = useState(1);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [bidAmount, setBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [bidMsg, setBidMsg] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [walletAvailable, setWalletAvailable] = useState<number | null>(null);
  const [myLockedBid, setMyLockedBid] = useState<number>(0);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    const sessions = await fetchActiveLiveSessions();
    const found = sessions.find((s) => s.id === sessionId) ?? null;
    setSession(found);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
    const id = window.setInterval(() => void loadSession(), 5000);
    return () => window.clearInterval(id);
  }, [loadSession]);

  const refreshWallet = useCallback(async () => {
    if (!user?.id || !sessionId) return;
    const [bal, locked] = await Promise.all([
      getUserWalletBalance(user.id),
      getUserLockedBid(sessionId, user.id),
    ]);
    if (bal) setWalletAvailable(bal.availableRwf);
    setMyLockedBid(locked);
  }, [user?.id, sessionId]);

  useEffect(() => {
    if (session?.auctionEnabled) void refreshWallet();
  }, [session?.auctionEnabled, refreshWallet]);

  useEffect(() => {
    if (!sessionId) return;
    void fetchRecentComments(sessionId).then(setComments);
    const unsub = subscribeToComments(sessionId, (c) => {
      setComments((prev) => [...prev.slice(-99), c]);
    });
    return unsub;
  }, [sessionId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  useEffect(() => {
    if (!sessionId) return;
    let presenceKey = user?.id;
    if (!presenceKey) {
      const storageKey = `iwanyu:guest-presence:${sessionId}`;
      let existing = window.sessionStorage.getItem(storageKey);
      if (!existing) {
        existing = `guest-${Math.random().toString(36).slice(2, 10)}`;
        window.sessionStorage.setItem(storageKey, existing);
      }
      presenceKey = existing;
    }
    return trackViewerPresence(sessionId, presenceKey, setViewerCount);
  }, [sessionId, user?.id]);

  const handleBid = async () => {
    if (!user) { setBidMsg({ type: "error", text: "Please log in to place a bid." }); return; }
    if (!session || !sessionId) return;
    const amount = Math.round(Number(bidAmount));
    if (!amount || amount <= (session.currentBidRwf ?? 0)) {
      setBidMsg({ type: "error", text: `Bid must be above ${formatMoney(session.currentBidRwf)}.` });
      return;
    }
    if (walletAvailable !== null && amount > walletAvailable) {
      setBidMsg({ type: "error", text: `Bid exceeds your available balance (${formatMoney(walletAvailable)}).` });
      return;
    }
    setBidding(true);
    setBidMsg(null);
    const result = await placeBidOnLiveAuction({ auctionId: sessionId, userId: user.id, amountRwf: amount });
    setBidMsg({ type: result.ok ? "ok" : "error", text: result.message });
    if (result.ok) { setBidAmount(""); void loadSession(); void refreshWallet(); }
    setBidding(false);
  };

  const handleComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commentText.trim() || !sessionId) return;
    setPosting(true);
    const name = (user?.name ?? guestName.trim()) || "Guest";
    const result = await postComment(sessionId, user?.id ?? null, name, commentText);
    if (result.ok) setCommentText("");
    setPosting(false);
  };

  if (loading) {
    return (
      <>
        <Helmet><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" /></Helmet>
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent mx-auto mb-4" />
          <p className="text-white">Loading live session…</p>
        </div>
      </div>
      </>
    );
  }

  if (!session) {
    return (
      <>
        <Helmet><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" /></Helmet>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
        <Radio className="h-12 w-12 text-gray-300 mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Session ended or not found</h2>
        <p className="text-sm text-gray-500 mb-6">This live session is no longer active.</p>
        <Link to="/live">
          <Button className="rounded-full">Browse Live Sessions</Button>
        </Link>
      </div>
      </>
    );
  }

  const commonProps = {
    session,
    sessionId: sessionId!,
    viewerCount,
    comments,
    commentsEndRef,
    commentText,
    setCommentText,
    posting,
    handleComment,
    guestName,
    setGuestName,
    user: user as { id: string; name?: string } | null,
  };

  const helmet = <Helmet><meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" /></Helmet>;

  if (session.auctionEnabled) {
    return (
      <>{helmet}<AuctionView
        {...commonProps}
        walletAvailable={walletAvailable}
        myLockedBid={myLockedBid}
        bidAmount={bidAmount}
        setBidAmount={setBidAmount}
        bidding={bidding}
        bidMsg={bidMsg}
        setBidMsg={setBidMsg}
        handleBid={handleBid}
      /></>);
  }

  return <>{helmet}<StreamView {...commonProps} /></>;
}

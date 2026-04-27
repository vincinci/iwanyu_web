import { useEffect, useRef, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye,
  Gavel,
  Send,
  Radio,
  Store,
  MessageCircle,
  ArrowLeft,
  Clock,
  TrendingUp,
  Wallet,
  Lock,
} from "lucide-react";
import {
  fetchActiveLiveSessions,
  placeBidOnLiveAuction,
  getUserWalletBalance,
  getUserLockedBid,
  type LiveSession,
} from "@/lib/liveSessions";
import {
  fetchRecentComments,
  postComment,
  subscribeToComments,
  trackViewerPresence,
  type LiveComment,
} from "@/lib/liveComments";
import { useAuth } from "@/context/auth";
import { formatMoney } from "@/lib/money";

function timeAgo(iso: string) {
  const diff = Math.floor((Date.now() - Date.parse(iso)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

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

  // Wallet state
  const [walletAvailable, setWalletAvailable] = useState<number | null>(null);
  const [walletLocked, setWalletLocked] = useState<number | null>(null);
  const [myLockedBid, setMyLockedBid] = useState<number>(0);

  const commentsEndRef = useRef<HTMLDivElement>(null);

  // ─── Load session (poll every 5 s) ───────────────────────────────────────
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

  // ─── Load wallet balance + locked bid ────────────────────────────────────
  const refreshWallet = useCallback(async () => {
    if (!user?.id || !sessionId) return;
    const [bal, locked] = await Promise.all([
      getUserWalletBalance(user.id),
      getUserLockedBid(sessionId, user.id),
    ]);
    if (bal) {
      setWalletAvailable(bal.availableRwf);
      setWalletLocked(bal.lockedBalanceRwf);
    }
    setMyLockedBid(locked);
  }, [user?.id, sessionId]);

  useEffect(() => {
    void refreshWallet();
  }, [refreshWallet]);

  // ─── Load recent comments + subscribe to new ones ────────────────────────
  useEffect(() => {
    if (!sessionId) return;
    void fetchRecentComments(sessionId).then(setComments);
    const unsub = subscribeToComments(sessionId, (comment) => {
      setComments((prev) => [...prev.slice(-99), comment]);
    });
    return unsub;
  }, [sessionId]);

  // ─── Auto-scroll comments to bottom ──────────────────────────────────────
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  // ─── Track viewer presence (real-time viewer count) ───────────────────────
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
    const unsub = trackViewerPresence(sessionId, presenceKey, setViewerCount);
    return unsub;
  }, [sessionId, user?.id]);

  // ─── Bid submission ───────────────────────────────────────────────────────
  const handleBid = async () => {
    if (!user) {
      setBidMsg({ type: "error", text: "Please log in to place a bid." });
      return;
    }
    if (!session || !sessionId) return;
    const amount = Math.round(Number(bidAmount));
    if (!amount || amount <= (session.currentBidRwf ?? 0)) {
      setBidMsg({
        type: "error",
        text: `Bid must be above ${formatMoney(session.currentBidRwf)}.`,
      });
      return;
    }
    setBidding(true);
    setBidMsg(null);
    const result = await placeBidOnLiveAuction({
      auctionId: sessionId,
      userId: user.id,
      amountRwf: amount,
    });
    setBidMsg({ type: result.ok ? "ok" : "error", text: result.message });
    if (result.ok) {
      setBidAmount("");
      void loadSession();
      void refreshWallet(); // refresh wallet display
    }
    setBidding(false);
  };

  // ─── Comment submission ───────────────────────────────────────────────────
  const handleComment = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!commentText.trim() || !sessionId) return;
    setPosting(true);
    const name = (user?.name ?? guestName.trim()) || "Guest";
    const result = await postComment(
      sessionId,
      user?.id ?? null,
      name,
      commentText
    );
    if (result.ok) {
      setCommentText("");
    }
    setPosting(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-400 border-t-transparent mx-auto mb-4" />
            <p className="text-gray-600">Loading live session…</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-sm w-full">
            <CardContent className="py-10 text-center">
              <Radio className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-gray-900 mb-1">
                Session ended or not found
              </h2>
              <p className="text-sm text-gray-500 mb-6">
                This live session is no longer active.
              </p>
              <Link to="/live">
                <Button className="w-full rounded-full">Browse Live Sessions</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const isAuction = session.auctionEnabled;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="flex-1 container max-w-4xl py-6 px-4 space-y-4">
        {/* Back */}
        <Link
          to="/live"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Live
        </Link>

        {/* Product preview card */}
        <Card className="overflow-hidden border border-gray-200">
          {session.productImage && (
            <div className="aspect-video max-h-72 w-full overflow-hidden bg-gray-100">
              <img
                src={session.productImage}
                alt={session.productTitle}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <CardContent className="p-4">
            {/* Status row */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-500 text-white rounded-full flex items-center gap-1 text-xs px-2 py-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                  LIVE
                </Badge>
                {isAuction ? (
                  <Badge variant="outline" className="rounded-full text-xs border-purple-300 text-purple-700">
                    <Gavel className="h-3 w-3 mr-1" />
                    Auction
                  </Badge>
                ) : (
                  <Badge variant="outline" className="rounded-full text-xs border-blue-300 text-blue-700">
                    <Radio className="h-3 w-3 mr-1" />
                    Stream
                  </Badge>
                )}
              </div>
              <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                <Eye className="h-3.5 w-3.5" />
                {viewerCount} watching
              </span>
            </div>

            {/* Title + seller */}
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {session.productTitle}
            </h1>
            <p className="text-sm text-gray-500 flex items-center gap-1 mb-4">
              <Store className="h-3.5 w-3.5" />
              {session.vendorName}
            </p>

            {/* Auction bid section */}
            {isAuction && (
              <div className="rounded-xl bg-purple-50 border border-purple-200 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-purple-600 font-medium uppercase tracking-wide mb-0.5">
                      Current Bid
                    </div>
                    <div className="text-2xl font-bold text-purple-900">
                      {formatMoney(session.currentBidRwf)}
                    </div>
                  </div>
                  {session.auctionDurationHours && (
                    <div className="text-right">
                      <div className="text-xs text-purple-600 font-medium uppercase tracking-wide mb-0.5">
                        Duration
                      </div>
                      <div className="text-sm font-semibold text-purple-900 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {session.auctionDurationHours}h
                      </div>
                    </div>
                  )}
                </div>

                {user ? (
                  <>
                    {/* Wallet balance row */}
                    {walletAvailable !== null && (
                      <div className="rounded-lg bg-white border border-purple-100 px-3 py-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-gray-600">
                          <Wallet className="h-3.5 w-3.5 text-purple-500" />
                          Wallet available
                        </span>
                        <span className="font-semibold text-gray-900">{formatMoney(walletAvailable)}</span>
                      </div>
                    )}
                    {myLockedBid > 0 && (
                      <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-amber-700">
                          <Lock className="h-3.5 w-3.5" />
                          Your current bid (locked)
                        </span>
                        <span className="font-semibold text-amber-800">{formatMoney(myLockedBid)}</span>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder={`More than ${formatMoney(session.currentBidRwf)}`}
                        value={bidAmount}
                        onChange={(e) => {
                          setBidAmount(e.target.value);
                          setBidMsg(null);
                        }}
                        className="rounded-lg"
                        min={session.currentBidRwf + 1}
                      />
                      <Button
                        onClick={handleBid}
                        disabled={bidding}
                        className="rounded-lg bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                      >
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {bidding ? "Placing…" : "Bid"}
                      </Button>
                    </div>
                    {walletAvailable !== null && walletAvailable === 0 && (
                      <p className="text-xs text-amber-600">
                        Your wallet is empty. Top up your balance to place bids.
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-center">
                    <p className="text-sm text-purple-700 mb-2">
                      Log in to place a bid
                    </p>
                    <Link to="/login">
                      <Button size="sm" className="rounded-full bg-purple-600 hover:bg-purple-700 text-white">
                        Log In to Bid
                      </Button>
                    </Link>
                  </div>
                )}

                {bidMsg && (
                  <p
                    className={`text-sm font-medium ${
                      bidMsg.type === "ok" ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {bidMsg.text}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Live Chat / Comments */}
        <Card className="border border-gray-200">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3 border-b border-gray-100">
            <MessageCircle className="h-4 w-4 text-gray-600" />
            <span className="font-semibold text-gray-900 text-sm">Live Chat</span>
            <span className="text-xs text-gray-400 ml-auto">
              {comments.length} messages
            </span>
          </div>

          {/* Comment list */}
          <div className="h-72 overflow-y-auto p-4 space-y-3">
            {comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
                <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
                <p className="text-sm">No messages yet. Be the first!</p>
              </div>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="flex gap-2">
                  <div className="h-7 w-7 rounded-full bg-amber-100 flex items-center justify-center text-xs font-bold text-amber-700 shrink-0">
                    {c.userName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-semibold text-gray-800">
                        {c.userName}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {timeAgo(c.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 break-words">{c.text}</p>
                  </div>
                </div>
              ))
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment input */}
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
              <Button
                type="submit"
                size="sm"
                disabled={posting || !commentText.trim()}
                className="rounded-lg shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </Card>
      </main>

      <Footer />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, StopCircle, Users, Gavel, Package } from "lucide-react";
import { getLiveSessions, endLiveSession, type LiveSession } from "@/lib/liveSessions";
import { formatMoney } from "@/lib/money";

export default function LiveSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLive, setIsLive] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("");

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
      setTitle(foundSession.productTitle);
      setPrice(String(foundSession.currentBidRwf));
      setLoading(false);
    };

    loadSession();
    const interval = setInterval(loadSession, 2000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Start camera stream
  useEffect(() => {
    if (!isLive || !videoRef.current) return;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        streamRef.current = stream;
        videoRef.current!.srcObject = stream;
      } catch (err) {
        setError("Failed to access camera. Check permissions and try again.");
      }
    };

    void startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isLive]);

  const handleEndSession = async () => {
    if (!sessionId) return;
    
    // Stop camera
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    // End session in database
    await endLiveSession(sessionId);
    
    // Redirect back to studio
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
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-800 px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">{session.auctionEnabled ? "Live Auction" : "Live Stream"}</h1>
            <p className="text-sm text-gray-400 mt-1">{session.productTitle}</p>
          </div>
          <Button
            onClick={handleEndSession}
            variant="destructive"
            className="rounded-lg"
          >
            <StopCircle className="h-4 w-4 mr-2" /> End Session
          </Button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-6 p-6 overflow-hidden">
          {/* Video Feed */}
          <div className="flex-1 flex flex-col">
            <div className="relative bg-black rounded-lg overflow-hidden flex-1 mb-4">
              {isLive ? (
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
                    <div className="text-6xl mb-4">📹</div>
                    <p className="text-gray-400">Camera paused</p>
                  </div>
                </div>
              )}
              
              {/* Live indicator */}
              <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 px-3 py-2 rounded-full">
                <span className="h-2 w-2 bg-white rounded-full animate-pulse" />
                <span className="text-xs font-semibold">LIVE</span>
              </div>

              {/* Viewers count */}
              <div className="absolute top-4 right-4 flex items-center gap-2 bg-gray-800/80 px-3 py-2 rounded-full">
                <Users className="h-4 w-4" />
                <span className="text-sm font-semibold">{session.watchers}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="text-xs text-gray-400 mb-1">Store</div>
                  <div className="text-sm font-semibold text-white">{session.vendorName}</div>
                </CardContent>
              </Card>
              {session.auctionEnabled && (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-1 text-xs text-gray-400 mb-1">
                      <Gavel className="h-3 w-3" /> Current Bid
                    </div>
                    <div className="text-sm font-semibold text-white">{formatMoney(session.currentBidRwf)}</div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Sidebar - Product Info */}
          <div className="w-80 flex flex-col gap-4">
            <Card className="bg-gray-800 border-gray-700 flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4" /> Product Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-gray-400 mb-1 block">Product Title</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 rounded-lg"
                    placeholder="Product name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Price (RWF)</Label>
                    <Input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-gray-400 mb-1 block">Quantity</Label>
                    <Input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 rounded-lg"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <Button className="w-full rounded-lg" disabled>
                    + Add Product
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">Coming soon - add products during stream</p>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="space-y-2">
              <Button
                onClick={() => setIsLive(!isLive)}
                variant={isLive ? "destructive" : "default"}
                className="w-full rounded-lg"
              >
                {isLive ? "Pause Camera" : "Resume Camera"}
              </Button>
              <Button
                onClick={handleEndSession}
                variant="outline"
                className="w-full rounded-lg border-red-600 text-red-400 hover:bg-red-900/20"
              >
                <StopCircle className="h-4 w-4 mr-2" /> End Session
              </Button>
            </div>

            {/* Info */}
            <Card className="bg-blue-900/20 border-blue-800">
              <CardContent className="p-3 text-xs text-blue-200 space-y-1">
                <p>✓ Your stream is live</p>
                <p>✓ Viewers can see your camera</p>
                <p>✓ Products will appear as you add them</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

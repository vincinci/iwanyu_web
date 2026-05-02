/**
 * WebRTC Configuration
 * Includes TURN server settings for NAT traversal
 */

// TURN server configuration for production
// Using Twilio's TURN service (recommended) or you can use your own Coturn server
export const TURN_CONFIG = {
  // Primary TURN servers (Twilio recommended)
  iceServers: [
    {
      urls: "stun:stun.l.google.com:19302",
    },
    {
      urls: "stun:stun1.l.google.com:19302",
    },
    // Add your TURN server credentials here
    // You can get these from Twilio (https://www.twilio.com/stun-turn)
    // or set up your own Coturn server
    {
      urls: import.meta.env.VITE_TURN_SERVER_URL || "",
      username: import.meta.env.VITE_TURN_USERNAME || "",
      credential: import.meta.env.VITE_TURN_CREDENTIAL || "",
    },
  ],
  iceCandidatePoolSize: 10,
  iceTransportPolicy: "all" as const,
  bundlePolicy: "balanced" as const,
  rtcpMuxPolicy: "require" as const,
};

// Fallback configuration for local development
export const FALLBACK_RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

// Get the appropriate configuration based on environment
export function getRTCConfiguration(): RTCConfiguration {
  // In production, use TURN servers
  if (import.meta.env.PROD) {
    // Check if TURN credentials are configured
    if (
      import.meta.env.VITE_TURN_SERVER_URL &&
      import.meta.env.VITE_TURN_USERNAME &&
      import.meta.env.VITE_TURN_CREDENTIAL
    ) {
      return TURN_CONFIG;
    }
    
    console.warn(
      "[WebRTC] TURN server not configured. Users behind strict NAT may experience connection issues."
    );
  }
  
  return FALLBACK_RTC_CONFIG;
}

// Connection quality monitoring
export interface ConnectionQuality {
  bitrate: number;
  packetLoss: number;
  latency: number;
  jitter: number;
}

export function monitorConnectionQuality(
  pc: RTCPeerConnection,
  onQualityUpdate: (quality: ConnectionQuality) => void
): () => void {
  const interval = setInterval(async () => {
    try {
      const stats = await pc.getStats();
      let bitrate = 0;
      let packetLoss = 0;
      let latency = 0;
      let jitter = 0;
      
      stats.forEach((report) => {
        if (report.type === "inbound-rtp" && report.kind === "video") {
          bitrate = report.bytesReceived || 0;
          packetLoss = report.packetsLost || 0;
          jitter = report.jitter || 0;
        }
        if (report.type === "candidate-pair" && report.state === "succeeded") {
          latency = report.currentRoundTripTime || 0;
        }
      });
      
      onQualityUpdate({ bitrate, packetLoss, latency, jitter });
    } catch (error) {
      console.error("[WebRTC] Failed to get stats:", error);
    }
  }, 5000);
  
  return () => clearInterval(interval);
}

// Reconnection logic
export function setupReconnection(
  pc: RTCPeerConnection,
  onReconnect: () => void,
  maxRetries: number = 3
): { disconnect: () => void } {
  let retryCount = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  const handleConnectionStateChange = () => {
    if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
      if (retryCount < maxRetries) {
        retryCount++;
        console.log(`[WebRTC] Connection lost. Attempting reconnect ${retryCount}/${maxRetries}...`);
        
        reconnectTimer = setTimeout(() => {
          onReconnect();
        }, 2000 * retryCount); // Exponential backoff
      }
    } else if (pc.connectionState === "connected") {
      retryCount = 0;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }
  };
  
  pc.addEventListener("connectionstatechange", handleConnectionStateChange);
  
  return {
    disconnect: () => {
      pc.removeEventListener("connectionstatechange", handleConnectionStateChange);
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    },
  };
}

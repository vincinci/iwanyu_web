/**
 * WebRTC broadcasting for live streams.
 *
 * Uses Supabase Realtime Broadcast as the signaling channel so no extra
 * infrastructure is needed.
 *
 * Seller  → LiveBroadcaster.start()  — one broadcaster per live session
 * Viewer  → LiveStreamViewer.connect() — one per viewer tab
 */

import { getPublicSupabaseClient, getSupabaseClient } from "@/lib/supabaseClient";

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

type SignalMsg = {
  type:
    | "viewer-join"
    | "offer"
    | "answer"
    | "ice-seller"
    | "ice-viewer"
    | "viewer-leave";
  viewerId: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
};

function getClient() {
  return getPublicSupabaseClient() ?? getSupabaseClient();
}

// ─────────────────────────────────────────────────────────────
//  SELLER SIDE
// ─────────────────────────────────────────────────────────────

/**
 * Manages the seller's outgoing broadcast.
 * Call setStream() whenever the MediaStream is (re)started, and
 * call stop() when the session ends.
 */
export class LiveBroadcaster {
  private peers = new Map<string, RTCPeerConnection>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any = null;
  private localStream: MediaStream | null = null;

  constructor(private sessionId: string) {}

  /** Attach (or swap) the local camera/mic stream. */
  setStream(stream: MediaStream) {
    this.localStream = stream;
    // Re-add tracks to any already-connected peers
    this.peers.forEach((pc) => {
      const existing = new Set(pc.getSenders().map((s) => s.track?.id));
      stream.getTracks().forEach((t) => {
        if (!existing.has(t.id)) pc.addTrack(t, stream);
      });
    });
  }

  /** Open the signaling channel. Call after setStream(). */
  async start() {
    const supabase = getClient();
    if (!supabase) return;

    this.channel = supabase.channel(`live-signal:${this.sessionId}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    this.channel
      .on(
        "broadcast",
        { event: "signal" },
        ({ payload }: { payload: SignalMsg }) => {
          void this.handleIncoming(payload);
        }
      )
      .subscribe();
  }

  private async handleIncoming(msg: SignalMsg) {
    if (msg.type === "viewer-join") {
      await this.connectViewer(msg.viewerId);
    } else if (msg.type === "answer") {
      const pc = this.peers.get(msg.viewerId);
      if (pc && msg.sdp) await pc.setRemoteDescription(msg.sdp).catch(() => null);
    } else if (msg.type === "ice-viewer") {
      const pc = this.peers.get(msg.viewerId);
      if (pc && msg.candidate)
        await pc.addIceCandidate(msg.candidate).catch(() => null);
    } else if (msg.type === "viewer-leave") {
      this.peers.get(msg.viewerId)?.close();
      this.peers.delete(msg.viewerId);
    }
  }

  private async connectViewer(viewerId: string) {
    // Close any stale connection for this viewer
    this.peers.get(viewerId)?.close();

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.peers.set(viewerId, pc);

    if (this.localStream) {
      this.localStream.getTracks().forEach((t) =>
        pc.addTrack(t, this.localStream!)
      );
    }

    pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      void this.send({
        type: "ice-seller",
        viewerId,
        candidate: candidate.toJSON(),
      });
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    void this.send({ type: "offer", viewerId, sdp: offer });
  }

  private send(msg: SignalMsg) {
    return this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: msg,
    });
  }

  stop() {
    this.peers.forEach((pc) => pc.close());
    this.peers.clear();
    void this.channel?.unsubscribe();
    this.channel = null;
  }
}

// ─────────────────────────────────────────────────────────────
//  VIEWER SIDE
// ─────────────────────────────────────────────────────────────

export type StreamConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "failed"
  | "disconnected";

/**
 * Manages a viewer's WebRTC connection to the seller's stream.
 * Usage:
 *   const viewer = new LiveStreamViewer(sessionId);
 *   viewer.onStream = (stream) => { videoEl.srcObject = stream; };
 *   viewer.onState = (state) => setUiState(state);
 *   await viewer.connect();
 *   // on cleanup:
 *   viewer.disconnect();
 */
export class LiveStreamViewer {
  private pc: RTCPeerConnection | null = null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private channel: any = null;
  private vid: string;

  public onStream?: (stream: MediaStream) => void;
  public onState?: (state: StreamConnectionState) => void;

  constructor(
    private sessionId: string,
    viewerIdOverride?: string
  ) {
    this.vid =
      viewerIdOverride ??
      `v-${Math.random().toString(36).slice(2, 14)}`;
  }

  get viewerId() {
    return this.vid;
  }

  async connect() {
    const supabase = getClient();
    if (!supabase) return;

    this.onState?.("connecting");

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.pc.ontrack = ({ streams }) => {
      if (streams[0]) {
        this.onState?.("connected");
        this.onStream?.(streams[0]);
      }
    };

    this.pc.onconnectionstatechange = () => {
      const s = this.pc?.connectionState;
      if (s === "connected") this.onState?.("connected");
      else if (s === "failed" || s === "closed")
        this.onState?.("failed");
      else if (s === "disconnected") this.onState?.("disconnected");
    };

    this.pc.onicecandidate = ({ candidate }) => {
      if (!candidate) return;
      void this.send({
        type: "ice-viewer",
        viewerId: this.vid,
        candidate: candidate.toJSON(),
      });
    };

    this.channel = supabase.channel(`live-signal:${this.sessionId}`, {
      config: { broadcast: { ack: false, self: false } },
    });

    this.channel
      .on(
        "broadcast",
        { event: "signal" },
        ({ payload }: { payload: SignalMsg }) => {
          if (payload.viewerId !== this.vid) return;
          void this.handleIncoming(payload);
        }
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          void this.send({ type: "viewer-join", viewerId: this.vid });
        }
      });
  }

  private async handleIncoming(msg: SignalMsg) {
    if (!this.pc) return;
    if (msg.type === "offer" && msg.sdp) {
      await this.pc.setRemoteDescription(msg.sdp);
      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      void this.send({ type: "answer", viewerId: this.vid, sdp: answer });
    } else if (msg.type === "ice-seller" && msg.candidate) {
      await this.pc.addIceCandidate(msg.candidate).catch(() => null);
    }
  }

  private send(msg: SignalMsg) {
    return this.channel?.send({
      type: "broadcast",
      event: "signal",
      payload: msg,
    });
  }

  disconnect() {
    void this.send({ type: "viewer-leave", viewerId: this.vid });
    this.pc?.close();
    this.pc = null;
    void this.channel?.unsubscribe();
    this.channel = null;
    this.onState?.("disconnected");
  }
}

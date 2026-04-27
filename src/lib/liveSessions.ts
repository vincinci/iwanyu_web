import type { Product } from "@/types/product";
import type { Vendor } from "@/types/vendor";
import { getPublicSupabaseClient, getSupabaseClient } from "@/lib/supabaseClient";

export type LiveSession = {
  id: string;
  vendorId: string;
  vendorName: string;
  productId: string;
  productTitle: string;
  productImage: string;
  auctionEnabled: boolean;
  auctionDurationHours?: number;
  startedAt: string;
  watchers: number;
  currentBidRwf: number;
  status: "live" | "ended";
};

const LIVE_SESSIONS_KEY = "iwanyu:live-sessions:v1";

type DbLiveAuctionRow = {
  id: string;
  seller_user_id: string | null;
  vendor: string | null;
  title: string | null;
  image_url: string | null;
  current_bid: number | null;
  ends_in: string | null;
  created_at: string | null;
  is_live: boolean | null;
  live_room: string | null;
  stream_url: string | null;
};

function parseAuctionDurationHours(value: string | null | undefined) {
  if (!value) return undefined;
  const trimmed = value.trim().toLowerCase();
  if (trimmed === "live-showcase") return undefined;
  const match = trimmed.match(/^(\d+)h$/);
  if (!match) return undefined;
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours <= 0) return undefined;
  return hours;
}

function parseProductIdFromLiveRoom(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  if (value.startsWith("product:")) {
    const [, productId] = value.split(":");
    if (productId?.trim()) return productId.trim();
  }
  return fallback;
}

function isAuctionFromStreamUrl(value: string | null | undefined) {
  if (!value) return true;
  return value !== "mode:showcase";
}

function readRawSessions(): LiveSession[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LIVE_SESSIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is LiveSession => {
      return (
        item &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.vendorId === "string" &&
        typeof item.vendorName === "string" &&
        typeof item.productId === "string" &&
        typeof item.productTitle === "string" &&
        typeof item.productImage === "string" &&
        typeof item.auctionEnabled === "boolean" &&
        typeof item.startedAt === "string" &&
        typeof item.watchers === "number" &&
        typeof item.currentBidRwf === "number" &&
        (item.status === "live" || item.status === "ended")
      );
    });
  } catch {
    return [];
  }
}

function writeRawSessions(sessions: LiveSession[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LIVE_SESSIONS_KEY, JSON.stringify(sessions));
}

export function getLiveSessions(): LiveSession[] {
  return readRawSessions().sort((a, b) => {
    const aTime = Date.parse(a.startedAt);
    const bTime = Date.parse(b.startedAt);
    return Number.isNaN(bTime) || Number.isNaN(aTime) ? 0 : bTime - aTime;
  });
}

export function getActiveLiveSessions(): LiveSession[] {
  return getLiveSessions().filter((session) => session.status === "live");
}

export async function fetchActiveLiveSessions(): Promise<LiveSession[]> {
  const supabase = getPublicSupabaseClient() ?? getSupabaseClient();
  if (!supabase) return getActiveLiveSessions();

  const { data, error } = await supabase
    .from("auctions")
    .select("id, seller_user_id, vendor, title, image_url, current_bid, ends_in, created_at, is_live, live_room, stream_url")
    .eq("is_live", true)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error || !Array.isArray(data)) {
    return getActiveLiveSessions();
  }

  const rows = (data ?? []) as DbLiveAuctionRow[];
  const auctionIds = rows.map((row) => String(row.id));
  const bestBidByAuction = new Map<string, number>();
  const bidCountByAuction = new Map<string, number>();

  if (auctionIds.length > 0) {
    const { data: bidRows, error: bidError } = await supabase
      .from("bids")
      .select("auction_id, amount")
      .in("auction_id", auctionIds)
      .order("created_at", { ascending: false })
      .limit(1200);

    if (!bidError && Array.isArray(bidRows)) {
      bidRows.forEach((bid) => {
        const auctionId = String((bid as { auction_id: string }).auction_id || "");
        const amount = Number((bid as { amount: number }).amount ?? 0);
        if (!auctionId || !Number.isFinite(amount)) return;

        const previousBest = bestBidByAuction.get(auctionId) ?? 0;
        if (amount > previousBest) bestBidByAuction.set(auctionId, amount);

        bidCountByAuction.set(auctionId, (bidCountByAuction.get(auctionId) ?? 0) + 1);
      });
    }
  }

  const normalized: LiveSession[] = rows
    .filter((row) => Boolean(row.is_live))
    .map((row) => {
      const auctionId = String(row.id);
      const auctionEnabled = isAuctionFromStreamUrl(row.stream_url);
      const dbCurrentBid = Math.max(0, Math.round(Number(row.current_bid ?? 0)));
      const derivedBestBid = bestBidByAuction.get(auctionId) ?? 0;
      const liveBid = auctionEnabled ? Math.max(dbCurrentBid, derivedBestBid) : 0;

      return {
        id: auctionId,
        vendorId: row.seller_user_id ?? "",
        vendorName: row.vendor || "Seller",
        productId: parseProductIdFromLiveRoom(row.live_room, auctionId),
        productTitle: row.title || "Live product",
        productImage: row.image_url || "",
        auctionEnabled,
        auctionDurationHours: parseAuctionDurationHours(row.ends_in),
        startedAt: row.created_at || new Date().toISOString(),
        watchers: Math.max(1, bidCountByAuction.get(auctionId) ?? 1),
        currentBidRwf: liveBid,
        status: "live",
      };
    });

  writeRawSessions(normalized);
  return normalized;
}

export async function createLiveSession(input: {
  vendorId: string;
  vendorName: string;
  sellerUserId?: string;
  product: Product;
  auctionEnabled: boolean;
  auctionDurationHours?: number;
}): Promise<LiveSession> {
  const supabase = getSupabaseClient();
  const basePrice = Math.max(0, Math.round(Number(input.product.price || 0)));
  const normalizedAuctionHours = input.auctionEnabled
    ? Math.min(24, Math.max(1, Math.round(Number(input.auctionDurationHours ?? 2))))
    : undefined;

  if (supabase) {
    const { data, error } = await supabase
      .from("auctions")
      .insert({
        seller_user_id: input.sellerUserId ?? null,
        title: input.product.title,
        current_bid: input.auctionEnabled ? basePrice : 0,
        ends_in: input.auctionEnabled ? `${normalizedAuctionHours}h` : "live-showcase",
        vendor: input.vendorName,
        image_url: input.product.image || "",
        is_live: true,
        live_room: `product:${input.product.id}`,
        stream_url: input.auctionEnabled ? "mode:auction" : "mode:showcase",
      })
      .select("id, seller_user_id, vendor, title, image_url, current_bid, ends_in, created_at, is_live, live_room, stream_url")
      .single();

    if (!error && data) {
      const row = data as DbLiveAuctionRow;
      const liveSession: LiveSession = {
        id: String(row.id),
        vendorId: row.seller_user_id ?? input.vendorId,
        vendorName: row.vendor || input.vendorName,
        productId: parseProductIdFromLiveRoom(row.live_room, input.product.id),
        productTitle: row.title || input.product.title,
        productImage: row.image_url || input.product.image || "",
        auctionEnabled: isAuctionFromStreamUrl(row.stream_url),
        auctionDurationHours: parseAuctionDurationHours(row.ends_in),
        startedAt: row.created_at || new Date().toISOString(),
        watchers: 1,
        currentBidRwf: Math.max(0, Math.round(Number(row.current_bid ?? 0))),
        status: "live",
      };

      const localExisting = getLiveSessions().filter((session) => session.id !== liveSession.id);
      writeRawSessions([liveSession, ...localExisting]);
      return liveSession;
    }
  }

  const existing = getLiveSessions();

  const next: LiveSession = {
    id: `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    vendorId: input.vendorId,
    vendorName: input.vendorName,
    productId: input.product.id,
    productTitle: input.product.title,
    productImage: input.product.image,
    auctionEnabled: input.auctionEnabled,
    auctionDurationHours: normalizedAuctionHours,
    startedAt: new Date().toISOString(),
    watchers: 1,
    currentBidRwf: input.auctionEnabled ? basePrice : 0,
    status: "live",
  };

  writeRawSessions([next, ...existing.filter((session) => session.status === "live")]);
  return next;
}

export async function endLiveSession(sessionId: string) {
  const supabase = getSupabaseClient();
  if (supabase) {
    await supabase.from("auctions").update({ is_live: false }).eq("id", sessionId);
  }

  const next = getLiveSessions().map((session) =>
    session.id === sessionId ? { ...session, status: "ended" as const } : session
  );
  writeRawSessions(next);
}

export async function getLiveSessionsForVendors(vendorIds: string[]): Promise<LiveSession[]> {
  if (vendorIds.length === 0) return [];
  const set = new Set(vendorIds);
  const active = await fetchActiveLiveSessions();
  return active.filter((session) => set.has(session.vendorId));
}

export async function placeBidOnLiveAuction(input: {
  auctionId: string;
  userId: string;
  amountRwf: number;
}): Promise<{ ok: boolean; message: string }> {
  const amount = Math.max(0, Math.round(Number(input.amountRwf || 0)));
  if (!amount) {
    return { ok: false, message: "Invalid bid amount." };
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    const next = getLiveSessions().map((session) => {
      if (session.id !== input.auctionId) return session;
      return {
        ...session,
        currentBidRwf: Math.max(session.currentBidRwf, amount),
        watchers: Math.max(1, session.watchers + 1),
      };
    });
    writeRawSessions(next);
    return { ok: true, message: "Bid placed in local mode." };
  }

  const { error: bidError } = await supabase.from("bids").insert({
    auction_id: input.auctionId,
    user_id: input.userId,
    amount,
    status: "active",
  });

  if (bidError) {
    return { ok: false, message: bidError.message || "Failed to place bid." };
  }

  // Best-effort sync of the auction headline value; insert above is the source of truth.
  await supabase.from("auctions").update({ current_bid: amount }).eq("id", input.auctionId).lte("current_bid", amount);

  const next = getLiveSessions().map((session) => {
    if (session.id !== input.auctionId) return session;
    return {
      ...session,
      currentBidRwf: Math.max(session.currentBidRwf, amount),
      watchers: Math.max(1, session.watchers + 1),
    };
  });
  writeRawSessions(next);

  return { ok: true, message: "Bid placed successfully." };
}

export function summarizeLiveForHome(vendors: Vendor[], products: Product[], activeSessions?: LiveSession[]): {
  liveSellers: Array<{ vendorId: string; vendorName: string; watchers: number }>;
  liveAuctions: LiveSession[];
} {
  const active = activeSessions ?? getActiveLiveSessions();
  const vendorById = new Map(vendors.map((vendor) => [vendor.id, vendor]));
  const productById = new Map(products.map((product) => [product.id, product]));

  const normalized = active
    .map((session) => {
      const vendor = vendorById.get(session.vendorId);
      const product = productById.get(session.productId);
      return {
        ...session,
        vendorName: vendor?.name || session.vendorName,
        productTitle: product?.title || session.productTitle,
        productImage: product?.image || session.productImage,
      };
    })
    .filter((session) => session.status === "live");

  const watchersByVendor = new Map<string, number>();
  normalized.forEach((session) => {
    watchersByVendor.set(
      session.vendorId,
      (watchersByVendor.get(session.vendorId) ?? 0) + Math.max(0, Math.round(session.watchers))
    );
  });

  const liveSellers = Array.from(watchersByVendor.entries())
    .map(([vendorId, watchers]) => ({
      vendorId,
      vendorName: vendorById.get(vendorId)?.name || normalized.find((s) => s.vendorId === vendorId)?.vendorName || "Seller",
      watchers,
    }))
    .sort((a, b) => b.watchers - a.watchers);

  return {
    liveSellers,
    liveAuctions: normalized.filter((session) => session.auctionEnabled),
  };
}

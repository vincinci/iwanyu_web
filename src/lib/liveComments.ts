import { getPublicSupabaseClient, getSupabaseClient } from "@/lib/supabaseClient";

export type LiveComment = {
  id: string;
  auctionId: string;
  userId: string | null;
  userName: string;
  text: string;
  createdAt: string;
};

type DbRow = {
  id: string;
  auction_id: string;
  user_id: string | null;
  user_name: string;
  comment_text: string;
  created_at: string;
};

function mapRow(row: DbRow): LiveComment {
  return {
    id: row.id,
    auctionId: row.auction_id,
    userId: row.user_id ?? null,
    userName: row.user_name || "Guest",
    text: row.comment_text,
    createdAt: row.created_at,
  };
}

export async function fetchRecentComments(auctionId: string, limit = 80): Promise<LiveComment[]> {
  const supabase = getPublicSupabaseClient() ?? getSupabaseClient();
  if (!supabase || !auctionId) return [];

  const { data, error } = await supabase
    .from("live_comments")
    .select("id, auction_id, user_id, user_name, comment_text, created_at")
    .eq("auction_id", auctionId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];
  // Return oldest-first for display
  return (data as DbRow[]).map(mapRow).reverse();
}

export async function postComment(
  auctionId: string,
  userId: string | null,
  userName: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed || trimmed.length > 500) {
    return { ok: false, error: "Comment must be 1–500 characters." };
  }
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: "Not connected." };

  const { error } = await supabase.from("live_comments").insert({
    auction_id: auctionId,
    user_id: userId ?? null,
    user_name: (userName.trim() || "Guest").slice(0, 100),
    comment_text: trimmed,
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Subscribe to new comments for a live session.
 * Returns an unsubscribe function — call it on component cleanup.
 */
export function subscribeToComments(
  auctionId: string,
  onComment: (comment: LiveComment) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !auctionId) return () => {};

  const channel = supabase
    .channel(`live-comments:${auctionId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "live_comments",
        filter: `auction_id=eq.${auctionId}`,
      },
      (payload) => {
        if (payload.new) {
          onComment(mapRow(payload.new as DbRow));
        }
      }
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

/**
 * Subscribe to viewer presence for a live session.
 * Each page that calls this increments the viewer count.
 * Returns an unsubscribe function.
 */
export function trackViewerPresence(
  auctionId: string,
  userId: string,
  onCountChange: (count: number) => void
): () => void {
  const supabase = getSupabaseClient();
  if (!supabase || !auctionId) return () => {};

  const channel = supabase.channel(`live-viewers:${auctionId}`, {
    config: { presence: { key: userId } },
  });

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState();
      onCountChange(Math.max(1, Object.keys(state).length));
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ user_id: userId, ts: Date.now() });
      }
    });

  return () => {
    void supabase.removeChannel(channel);
  };
}

-- Real-time live session comments
-- Allows viewers to comment during live streams and auctions

create table if not exists public.live_comments (
  id uuid primary key default gen_random_uuid(),
  auction_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null default 'Guest',
  comment_text text not null,
  created_at timestamptz not null default now(),
  constraint live_comments_text_length check (
    char_length(trim(comment_text)) between 1 and 500
  ),
  constraint live_comments_name_length check (
    char_length(trim(user_name)) between 1 and 100
  )
);

create index if not exists idx_live_comments_auction_created
  on public.live_comments(auction_id, created_at desc);

alter table public.live_comments enable row level security;

-- Anyone can read comments (public live chat)
create policy "live_comments_select_public"
  on public.live_comments for select
  using (true);

-- Anyone can post a comment (guest or authenticated)
create policy "live_comments_insert_public"
  on public.live_comments for insert
  with check (
    char_length(trim(comment_text)) between 1 and 500
    and char_length(trim(user_name)) between 1 and 100
  );

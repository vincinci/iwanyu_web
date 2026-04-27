-- Enable Supabase Realtime for live_comments so INSERT events are broadcast
-- to subscribers via Postgres Changes.

-- REPLICA IDENTITY FULL ensures old + new row data is available in change events
alter table public.live_comments replica identity full;

-- Add live_comments to the realtime publication
alter publication supabase_realtime add table public.live_comments;

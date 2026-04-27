-- Add stream_products JSON column to auctions so viewers can see
-- the products a seller posts during a live stream session.
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS stream_products jsonb NOT NULL DEFAULT '[]'::jsonb;

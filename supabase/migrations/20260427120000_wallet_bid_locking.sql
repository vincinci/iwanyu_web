-- ============================================================
-- 1. Buyer wallet balance columns on profiles
-- ============================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS wallet_balance_rwf  integer NOT NULL DEFAULT 0 CHECK (wallet_balance_rwf  >= 0),
  ADD COLUMN IF NOT EXISTS locked_balance_rwf   integer NOT NULL DEFAULT 0 CHECK (locked_balance_rwf  >= 0);

COMMENT ON COLUMN public.profiles.wallet_balance_rwf
  IS 'Total funds loaded into this buyer wallet (RWF). Set by admin / payment webhook.';
COMMENT ON COLUMN public.profiles.locked_balance_rwf
  IS 'Sum of funds currently locked as active auction bids. Cannot exceed wallet_balance_rwf.';

-- ============================================================
-- 2. Ensure auctions & bids tables exist with correct shape
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auctions (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_user_id uuid       REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor        text,
  title         text,
  image_url     text,
  current_bid   integer     DEFAULT 0,
  ends_in       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  is_live       boolean     DEFAULT true,
  live_room     text,
  stream_url    text
);

CREATE TABLE IF NOT EXISTS public.bids (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id text        NOT NULL,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  amount     integer     NOT NULL CHECK (amount > 0),
  status     text        NOT NULL DEFAULT 'locked',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Add product_variants column to auctions (stores {sizes, colors} for live-auction products)
ALTER TABLE public.auctions
  ADD COLUMN IF NOT EXISTS product_variants jsonb;

-- ============================================================
-- 3. RLS on auctions and bids (idempotent)
-- ============================================================

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids     ENABLE ROW LEVEL SECURITY;

-- Anyone can read live auctions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='auctions' AND policyname='auctions_public_select'
  ) THEN
    CREATE POLICY auctions_public_select ON public.auctions
      FOR SELECT USING (true);
  END IF;
END $$;

-- Authenticated users can insert auctions (sellers)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='auctions' AND policyname='auctions_seller_insert'
  ) THEN
    CREATE POLICY auctions_seller_insert ON public.auctions
      FOR INSERT WITH CHECK (auth.uid() = seller_user_id);
  END IF;
END $$;

-- Sellers can update their own auctions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='auctions' AND policyname='auctions_seller_update'
  ) THEN
    CREATE POLICY auctions_seller_update ON public.auctions
      FOR UPDATE USING (auth.uid() = seller_user_id);
  END IF;
END $$;

-- Anyone can read bids (for current bid display)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename='bids' AND policyname='bids_public_select'
  ) THEN
    CREATE POLICY bids_public_select ON public.bids
      FOR SELECT USING (true);
  END IF;
END $$;

-- Users can only see their own bid status details via the lock_bid function
-- (We allow select above for the "current highest bid" query)

-- ============================================================
-- 4. lock_bid – atomic bid placement with wallet locking
-- ============================================================
-- Behaviour:
--   • Validates the bid is higher than the current best locked bid
--   • Checks the bidder has enough free balance (wallet - already locked)
--   • Releases the bidder's own previous locked bid for this auction
--   • Releases ALL other bidders' locked bids when they are outbid
--   • Inserts the new bid with status = 'locked'
--   • Updates profiles.locked_balance_rwf atomically
--   • Updates auctions.current_bid

CREATE OR REPLACE FUNCTION public.lock_bid(
  p_auction_id text,
  p_user_id    uuid,
  p_amount     integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_my_locked   integer := 0;
  v_wallet      integer;
  v_locked      integer;
  v_needed      integer;
  v_best        integer;
  v_auction_live boolean;
BEGIN
  -- Validate amount
  IF p_amount <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Bid must be greater than zero');
  END IF;

  -- Check auction is still live
  SELECT is_live INTO v_auction_live
  FROM public.auctions
  WHERE id::text = p_auction_id;

  IF NOT FOUND OR NOT v_auction_live THEN
    RETURN jsonb_build_object('ok', false, 'message', 'This auction has ended');
  END IF;

  -- Get current best locked bid from anyone on this auction
  SELECT COALESCE(MAX(amount), 0) INTO v_best
  FROM public.bids
  WHERE auction_id = p_auction_id
    AND status = 'locked';

  IF p_amount <= v_best THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', format('Bid must be above current highest bid of %s RWF', v_best)
    );
  END IF;

  -- Get user's currently locked amount for this auction
  SELECT COALESCE(SUM(amount), 0) INTO v_my_locked
  FROM public.bids
  WHERE auction_id = p_auction_id
    AND user_id = p_user_id
    AND status = 'locked';

  -- Additional balance needed (incremental lock)
  v_needed := p_amount - v_my_locked;

  -- Get user wallet state
  SELECT wallet_balance_rwf, locked_balance_rwf
  INTO v_wallet, v_locked
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'User profile not found. Please complete your profile.');
  END IF;

  -- Check available (free) balance
  IF (v_wallet - v_locked) < v_needed THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', format(
        'Insufficient wallet balance. Available: %s RWF, required: %s RWF. Top up your wallet to continue bidding.',
        (v_wallet - v_locked),
        v_needed
      )
    );
  END IF;

  -- ── Release this user's previous locked bids on this auction ──────────
  UPDATE public.bids
  SET status = 'outbid'
  WHERE auction_id = p_auction_id
    AND user_id = p_user_id
    AND status = 'locked';

  -- Adjust locked_balance for this user: release old, lock new amount
  UPDATE public.profiles
  SET locked_balance_rwf = locked_balance_rwf - v_my_locked + p_amount
  WHERE id = p_user_id;

  -- ── Release ALL other bidders' locked bids (they are now outbid) ──────
  -- First, update their locked_balance
  UPDATE public.profiles AS prof
  SET locked_balance_rwf = GREATEST(0, locked_balance_rwf - b.amount)
  FROM public.bids AS b
  WHERE b.auction_id = p_auction_id
    AND b.user_id != p_user_id
    AND b.status = 'locked'
    AND prof.id = b.user_id;

  -- Mark those bids as outbid
  UPDATE public.bids
  SET status = 'outbid'
  WHERE auction_id = p_auction_id
    AND user_id != p_user_id
    AND status = 'locked';

  -- ── Insert the new winning bid ────────────────────────────────────────
  INSERT INTO public.bids (auction_id, user_id, amount, status)
  VALUES (p_auction_id, p_user_id, p_amount, 'locked');

  -- ── Sync auction headline bid ─────────────────────────────────────────
  UPDATE public.auctions
  SET current_bid = p_amount
  WHERE id::text = p_auction_id
    AND (current_bid IS NULL OR current_bid < p_amount);

  RETURN jsonb_build_object('ok', true, 'message', 'Bid placed. Funds locked from your wallet.');
END;
$$;

REVOKE ALL ON FUNCTION public.lock_bid(text, uuid, integer) FROM public;
GRANT EXECUTE ON FUNCTION public.lock_bid(text, uuid, integer) TO authenticated;

-- ============================================================
-- 5. settle_auction – release losers' locks, charge winner
-- ============================================================
-- Called when auction timer expires (via edge function / admin action).
-- Returns: {ok, winner_user_id, winner_amount}

CREATE OR REPLACE FUNCTION public.settle_auction(p_auction_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_winner_id     uuid;
  v_winner_amount integer;
BEGIN
  -- Find the highest locked bid
  SELECT user_id, amount
  INTO v_winner_id, v_winner_amount
  FROM public.bids
  WHERE auction_id = p_auction_id
    AND status = 'locked'
  ORDER BY amount DESC
  LIMIT 1;

  -- Release all non-winner locked bids
  UPDATE public.profiles AS prof
  SET locked_balance_rwf = GREATEST(0, locked_balance_rwf - b.amount)
  FROM public.bids AS b
  WHERE b.auction_id = p_auction_id
    AND b.status = 'locked'
    AND (v_winner_id IS NULL OR b.user_id != v_winner_id)
    AND prof.id = b.user_id;

  UPDATE public.bids
  SET status = 'released'
  WHERE auction_id = p_auction_id
    AND status = 'locked'
    AND (v_winner_id IS NULL OR user_id != v_winner_id);

  -- Charge winner: deduct from both wallet and locked balance
  IF v_winner_id IS NOT NULL THEN
    UPDATE public.profiles
    SET
      wallet_balance_rwf  = GREATEST(0, wallet_balance_rwf  - v_winner_amount),
      locked_balance_rwf  = GREATEST(0, locked_balance_rwf  - v_winner_amount)
    WHERE id = v_winner_id;

    UPDATE public.bids
    SET status = 'won'
    WHERE auction_id = p_auction_id
      AND user_id = v_winner_id
      AND status = 'locked';
  END IF;

  -- Close the auction
  UPDATE public.auctions
  SET is_live = false
  WHERE id::text = p_auction_id;

  RETURN jsonb_build_object(
    'ok', true,
    'winner_user_id', v_winner_id,
    'winner_amount', v_winner_amount
  );
END;
$$;

REVOKE ALL ON FUNCTION public.settle_auction(text) FROM public;
GRANT EXECUTE ON FUNCTION public.settle_auction(text) TO service_role;

-- ============================================================
-- 6. RLS: profiles wallet columns — users can only read own
-- ============================================================
-- Existing profile policies cover SELECT/UPDATE for own row already.
-- No additional policies needed.

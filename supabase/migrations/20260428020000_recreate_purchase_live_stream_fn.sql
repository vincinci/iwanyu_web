-- Re-create the purchase_live_stream_product function
-- (original migration was marked applied without executing)

CREATE TABLE IF NOT EXISTS public.live_stream_purchases (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        text        NOT NULL,
  buyer_user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  seller_user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  vendor_name       text,
  product_id        text        NOT NULL,
  product_title     text        NOT NULL,
  product_image_url text,
  color             text,
  size              text,
  price_rwf         integer     NOT NULL CHECK (price_rwf > 0),
  status            text        NOT NULL DEFAULT 'Placed'
                                CHECK (status IN ('Placed','Processing','Shipped','Delivered','Cancelled')),
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_stream_purchases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_stream_purchases'
      AND policyname = 'buyers_view_own_live_purchases'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "buyers_view_own_live_purchases"
        ON public.live_stream_purchases FOR SELECT
        USING (auth.uid() = buyer_user_id)
    $p$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'live_stream_purchases'
      AND policyname = 'sellers_view_their_live_purchases'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "sellers_view_their_live_purchases"
        ON public.live_stream_purchases FOR SELECT
        USING (auth.uid() = seller_user_id)
    $p$;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.purchase_live_stream_product(
  p_session_id        text,
  p_product_id        text,
  p_product_title     text,
  p_product_image_url text,
  p_color             text,
  p_size              text,
  p_price_rwf         integer,
  p_seller_user_id    uuid,
  p_vendor_name       text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_buyer_id   uuid;
  v_wallet     integer;
  v_locked     integer;
  v_available  integer;
BEGIN
  v_buyer_id := auth.uid();
  IF v_buyer_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'message', 'You must be logged in to purchase.');
  END IF;

  IF p_price_rwf <= 0 THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Invalid product price.');
  END IF;

  -- Lock the buyer's profile row for update to prevent race conditions
  SELECT wallet_balance_rwf, locked_balance_rwf
    INTO v_wallet, v_locked
    FROM public.profiles
   WHERE id = v_buyer_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'message', 'Buyer profile not found.');
  END IF;

  v_available := GREATEST(0, v_wallet - v_locked);

  IF v_available < p_price_rwf THEN
    RETURN jsonb_build_object(
      'ok', false,
      'message', format(
        'Insufficient wallet balance. You have %s RWF available but this costs %s RWF.',
        v_available, p_price_rwf
      )
    );
  END IF;

  -- Immediately deduct from wallet
  UPDATE public.profiles
     SET wallet_balance_rwf = wallet_balance_rwf - p_price_rwf
   WHERE id = v_buyer_id;

  -- Record the purchase
  INSERT INTO public.live_stream_purchases (
    session_id, buyer_user_id, seller_user_id, vendor_name,
    product_id, product_title, product_image_url, color, size, price_rwf
  ) VALUES (
    p_session_id, v_buyer_id, p_seller_user_id, p_vendor_name,
    p_product_id, p_product_title, p_product_image_url, p_color, p_size, p_price_rwf
  );

  RETURN jsonb_build_object('ok', true, 'message', 'Purchase successful! Check your orders.');
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_live_stream_product TO authenticated;

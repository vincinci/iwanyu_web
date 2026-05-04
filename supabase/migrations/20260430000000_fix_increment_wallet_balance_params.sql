-- Fix increment_wallet_balance parameter order.
--
-- PostgREST resolves RPC functions by matching the alphabetically-sorted
-- parameter list.  The original definition had (p_user_id, p_amount) which
-- PostgREST cannot find when called with {p_user_id: ..., p_amount: ...}
-- because it searches for (p_amount, p_user_id) alphabetically.
--
-- This migration:
--   1. Drops the old function.
--   2. Re-creates it with parameters in alphabetical order (p_amount, p_user_id).
--   3. Uses COALESCE to handle any NULL wallet_balance_rwf values safely.
--   4. Re-applies the correct permission grants.

DROP FUNCTION IF EXISTS public.increment_wallet_balance(uuid, integer);

CREATE OR REPLACE FUNCTION public.increment_wallet_balance(
  p_amount   integer,
  p_user_id  uuid
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET wallet_balance_rwf = COALESCE(wallet_balance_rwf, 0) + p_amount,
      updated_at          = now()
  WHERE id = p_user_id;
$$;

-- Only service_role may call this (edge functions run as service_role).
REVOKE EXECUTE ON FUNCTION public.increment_wallet_balance(integer, uuid) FROM public, authenticated, anon;
GRANT  EXECUTE ON FUNCTION public.increment_wallet_balance(integer, uuid) TO service_role;

-- Notify PostgREST to reload its schema cache immediately.
NOTIFY pgrst, 'reload schema';

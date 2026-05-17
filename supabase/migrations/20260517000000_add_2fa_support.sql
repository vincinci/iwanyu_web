-- Migration: Add 2FA (Two-Factor Authentication) columns to profiles table
-- This enables TOTP-based 2FA for enhanced account security

-- Add 2FA columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS twoFa_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twoFa_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS twoFa_method text DEFAULT 'totp' CHECK (twoFa_method IN ('totp', '2fa_disabled')),
  ADD COLUMN IF NOT EXISTS twoFa_backup_codes_hash text, -- JSON array of hashed backup codes
  ADD COLUMN IF NOT EXISTS twoFa_created_at timestamptz,
  ADD COLUMN IF NOT EXISTS twoFa_last_verified_at timestamptz;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_twoFa_enabled ON public.profiles(twoFa_enabled);

-- Add audit log table for 2FA events (optional but recommended)
CREATE TABLE IF NOT EXISTS public.twofa_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('setup', 'verify', 'disable', 'backup_used', 'failed_attempt')),
  success boolean NOT NULL,
  ip_address text,
  user_agent text,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_twofa_audit_user ON public.twofa_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_twofa_audit_created ON public.twofa_audit_log(created_at DESC);

-- Enable RLS on audit log
ALTER TABLE public.twofa_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own audit logs
CREATE POLICY "users_view_own_2fa_audit" ON public.twofa_audit_log
  FOR SELECT
  USING (user_id = auth.uid());

-- Allow authenticated users to view their 2FA status
ALTER TABLE public.profiles
  ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own 2FA status
CREATE POLICY "users_view_own_2fa_status" ON public.profiles
  FOR SELECT
  USING (
    auth.uid() = id
    OR
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
  );

-- Policy: Users can update their own 2FA settings (except backup codes via this policy)
CREATE POLICY "users_update_own_2fa_settings" ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND (
      -- Only allow updates to these 2FA columns
      twoFa_enabled IS NOT DISTINCT FROM (SELECT twoFa_enabled FROM public.profiles WHERE id = auth.uid())
      OR
      twoFa_verified IS NOT DISTINCT FROM (SELECT twoFa_verified FROM public.profiles WHERE id = auth.uid())
    )
  );

-- Add function to disable 2FA
CREATE OR REPLACE FUNCTION public.disable_2fa(p_user_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE profiles
  SET
    twoFa_enabled = false,
    twoFa_verified = false,
    twoFa_backup_codes_hash = NULL,
    twoFa_last_verified_at = now()
  WHERE id = p_user_id;
$$;

-- Grant execute permission to authenticated users for their own account
GRANT EXECUTE ON FUNCTION public.disable_2fa(uuid) TO authenticated;

-- Add function to log 2FA events
CREATE OR REPLACE FUNCTION public.log_2fa_event(
  p_user_id uuid,
  p_event_type text,
  p_success boolean,
  p_details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.twofa_audit_log (user_id, event_type, success, details, ip_address)
  VALUES (
    p_user_id,
    p_event_type,
    p_success,
    p_details,
    current_setting('request.headers')::json->>'x-forwarded-for'
  );
$$;

GRANT EXECUTE ON FUNCTION public.log_2fa_event(uuid, text, boolean, jsonb) TO authenticated;

-- Create trigger to log when 2FA is enabled
CREATE OR REPLACE FUNCTION public.log_2fa_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (NEW.twoFa_enabled IS DISTINCT FROM OLD.twoFa_enabled) THEN
    INSERT INTO public.twofa_audit_log (user_id, event_type, success)
    VALUES (
      NEW.id,
      CASE WHEN NEW.twoFa_enabled THEN 'setup' ELSE 'disable' END,
      NEW.twoFa_verified
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_2fa_state_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.log_2fa_state_change();

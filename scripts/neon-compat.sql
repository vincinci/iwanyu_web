-- Neon Compatibility Layer for Supabase Migrations
CREATE SCHEMA IF NOT EXISTS auth;

-- Mock auth.users table
CREATE TABLE IF NOT EXISTS auth.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text UNIQUE,
    encrypted_password text,
    email_confirmed_at timestamptz DEFAULT now(),
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    raw_user_meta_data jsonb
);

-- Mock auth.uid() function (returns current user ID based on session - hard for pure SQL without context)
-- In a real app with RLS on Neon, you'd use `set_config` and `current_setting`.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid AS $$
BEGIN
  -- Attempt to get from session variable, or null
  RETURN nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
END;
$$ LANGUAGE plpgsql;

-- Mock other auth functions if needed
CREATE OR REPLACE FUNCTION auth.role() RETURNS text AS $$
BEGIN
  RETURN nullif(current_setting('request.jwt.claim.role', true), 'anon')::text;
END;
$$ LANGUAGE plpgsql;

-- Allow public access to auth schema for now (simplification)
GRANT USAGE ON SCHEMA auth TO public;
GRANT SELECT ON auth.users TO public;

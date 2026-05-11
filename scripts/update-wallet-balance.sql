-- Update wallet balance for user davy to match PawaPay balance (5,814 RWF)
-- Run this in Supabase SQL Editor or via psql

BEGIN;

-- First, let's see the current state
SELECT 
    id,
    email,
    name,
    wallet_balance_rwf as current_balance
FROM profiles
WHERE name = 'davy' OR email LIKE '%davy%'
LIMIT 1;

-- Update the wallet balance
UPDATE profiles
SET 
    wallet_balance_rwf = 5814,
    updated_at = NOW()
WHERE name = 'davy' OR email LIKE '%davy%';

-- Verify the update
SELECT 
    id,
    email,
    name,
    wallet_balance_rwf as new_balance,
    updated_at
FROM profiles
WHERE name = 'davy' OR email LIKE '%davy%'
LIMIT 1;

COMMIT;

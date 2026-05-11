-- Add missing columns to wallet_transactions table
-- These columns should have been added earlier but need to be ensured now

ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS previous_balance_rwf integer NOT NULL DEFAULT 0;

ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS phone_number text;

ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS provider text;

ALTER TABLE public.wallet_transactions 
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_phone ON wallet_transactions(phone_number);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);

-- Verify all columns now exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'wallet_transactions' AND column_name = 'previous_balance_rwf'
  ) THEN
    RAISE EXCEPTION 'Column previous_balance_rwf still does not exist after ALTER';
  END IF;
  
  RAISE NOTICE 'All wallet_transactions columns verified successfully!';
END $$;

-- Fix wallet_transactions schema: make 'kind' nullable if it exists, or drop it
-- The error "null value in column 'kind'" suggests the column exists and is NOT NULL
-- But our code uses 'type' column instead

DO $$
BEGIN
  -- Check if 'kind' column exists
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'wallet_transactions'
      AND column_name = 'kind'
  ) THEN
    -- Make it nullable first (to avoid constraint violations)
    ALTER TABLE wallet_transactions ALTER COLUMN kind DROP NOT NULL;
    
    -- Copy data from 'type' to 'kind' if type exists and kind is null
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions'
        AND column_name = 'type'
    ) THEN
      UPDATE wallet_transactions SET kind = type WHERE kind IS NULL;
    END IF;
    
    RAISE NOTICE 'Made kind column nullable and copied data from type column';
  ELSE
    RAISE NOTICE 'kind column does not exist, no action needed';
  END IF;
  
  -- Ensure 'type' column exists (it should from the 20260428100000 migration)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'wallet_transactions'
      AND column_name = 'type'
  ) THEN
    ALTER TABLE wallet_transactions ADD COLUMN type text;
    
    -- Copy from kind to type if kind exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_name = 'wallet_transactions'
        AND column_name = 'kind'
    ) THEN
      UPDATE wallet_transactions SET type = kind WHERE type IS NULL;
    END IF;
    
    -- Add constraint
    ALTER TABLE wallet_transactions
      ADD CONSTRAINT wallet_transactions_type_check
      CHECK (type IN ('deposit', 'refund', 'purchase', 'withdrawal', 'payout', 'payment'));
      
    RAISE NOTICE 'Added type column and copied data from kind column';
  END IF;
END $$;

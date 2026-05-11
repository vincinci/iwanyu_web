-- PawaPay Integration Database Setup
-- Extends existing wallet tables with PawaPay fields

-- Wallets table already exists from migration 20260427120000_wallet_bid_locking.sql
-- Just ensure it has the balance column
ALTER TABLE wallets 
ADD COLUMN IF NOT EXISTS balance INTEGER DEFAULT 0 CHECK (balance >= 0);

-- Update wallet_transactions table with PawaPay-specific columns
-- Table already exists from migration 20260428100000_wallet_transactions.sql
ALTER TABLE wallet_transactions
ADD COLUMN IF NOT EXISTS phone_number TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Create indexes for performance (some already exist from previous migrations)
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status ON wallet_transactions(status);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at DESC);

-- Add payment columns to orders table if they don't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_provider TEXT,
ADD COLUMN IF NOT EXISTS payment_phone TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Create index for order payments
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);

-- RLS and permissions are already set up from previous migrations
-- Just ensure service role can manage everything
GRANT ALL ON wallets TO service_role;
GRANT ALL ON wallet_transactions TO service_role;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE 'PawaPay database setup completed successfully!';
END $$;

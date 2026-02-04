-- Add revoked column to vendors table for admin to suspend vendors
ALTER TABLE vendors ADD COLUMN IF NOT EXISTS revoked boolean DEFAULT false;

-- Add index for faster filtering
CREATE INDEX IF NOT EXISTS idx_vendors_revoked ON vendors(revoked);

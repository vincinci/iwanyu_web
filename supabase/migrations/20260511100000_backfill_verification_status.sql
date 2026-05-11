-- Backfill verification_status for approved vendors
UPDATE public.vendors 
SET verification_status = 'verified'
WHERE status = 'approved' 
  AND (verification_status IS NULL OR verification_status = 'pending');

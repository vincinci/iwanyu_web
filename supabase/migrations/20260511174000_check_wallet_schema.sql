-- Check actual wallet_transactions schema
DO $$
DECLARE
  col_record RECORD;
BEGIN
  RAISE NOTICE '=== wallet_transactions columns ===';
  
  FOR col_record IN 
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'wallet_transactions'
    ORDER BY ordinal_position
  LOOP
    RAISE NOTICE 'Column: % | Type: % | Nullable: % | Default: %',
      col_record.column_name,
      col_record.data_type,
      col_record.is_nullable,
      col_record.column_default;
  END LOOP;
END $$;

-- Ensure wallet_transactions has a `type` column and extend its allowed values.
-- The table may have been created manually without the `type` column.

-- 1. Add `type` column if it doesn't exist
alter table public.wallet_transactions
  add column if not exists type text not null default 'deposit';

-- 2. Drop any existing check constraint on the type column (name may vary)
do $$
declare
  r record;
begin
  for r in
    select conname
    from pg_constraint
    where conrelid = 'public.wallet_transactions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%type%'
  loop
    execute 'alter table public.wallet_transactions drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;

-- 3. Add the updated check constraint
alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
    check (type in (
      'deposit',
      'refund',
      'purchase',
      'withdrawal',
      'sale_credit',
      'platform_fee'
    ));

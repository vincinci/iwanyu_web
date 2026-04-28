-- Create wallet_transactions table to track all wallet movements
create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('deposit', 'refund', 'purchase', 'withdrawal')),
  amount_rwf integer not null check (amount_rwf > 0),
  previous_balance_rwf integer not null default 0,
  new_balance_rwf integer not null default 0,
  external_transaction_id text,
  payment_method text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add missing columns if they don't exist
alter table if exists public.wallet_transactions
add column if not exists external_transaction_id text;

alter table if exists public.wallet_transactions
add column if not exists payment_method text;

-- Create index for user lookups
create index if not exists wallet_transactions_user_id_idx 
  on public.wallet_transactions(user_id);

-- Create index for external transaction ID (idempotency)
create index if not exists wallet_transactions_external_id_idx 
  on public.wallet_transactions(external_transaction_id);

-- RLS
alter table public.wallet_transactions enable row level security;

-- Users can view their own transactions
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='wallet_transactions' and policyname='wallet_transactions_select_own'
  ) then
    create policy wallet_transactions_select_own on public.wallet_transactions
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Service role can do everything
grant all on public.wallet_transactions to service_role;

-- Create sequence for wallet transaction IDs if needed
grant all on all sequences in schema public to service_role;

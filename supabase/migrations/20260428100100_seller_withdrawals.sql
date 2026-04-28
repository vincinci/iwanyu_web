-- Create seller_withdrawals table for withdrawal requests
create table if not exists public.seller_withdrawals (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references public.vendors(id) on delete cascade,
  amount_rwf integer not null check (amount_rwf > 0),
  mobile_network text not null check (mobile_network in ('MTN', 'Airtel', 'Orange')),
  phone_number text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  reason text,
  external_transaction_id text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

-- Create index for vendor lookups
create index if not exists seller_withdrawals_vendor_id_idx 
  on public.seller_withdrawals(vendor_id);

-- Create index for status lookups
create index if not exists seller_withdrawals_status_idx 
  on public.seller_withdrawals(status);

-- RLS
alter table public.seller_withdrawals enable row level security;

-- Vendors can view their own withdrawals (through vendors table)
-- Service role can do everything
grant all on public.seller_withdrawals to service_role;

-- Create seller_withdrawal_transactions table for detailed transaction history
create table if not exists public.seller_withdrawal_transactions (
  id uuid primary key default gen_random_uuid(),
  withdrawal_id uuid not null references public.seller_withdrawals(id) on delete cascade,
  vendor_id text not null references public.vendors(id) on delete cascade,
  amount_rwf integer not null check (amount_rwf > 0),
  previous_balance_rwf integer not null default 0,
  new_balance_rwf integer not null default 0,
  mobile_network text not null check (mobile_network in ('MTN', 'Airtel', 'Orange')),
  phone_number text not null,
  status text not null default 'initiated' check (status in ('initiated', 'processing', 'completed', 'failed', 'cancelled')),
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Create index for vendor lookups
create index if not exists seller_withdrawal_transactions_vendor_id_idx 
  on public.seller_withdrawal_transactions(vendor_id);

-- Create index for withdrawal lookups
create index if not exists seller_withdrawal_transactions_withdrawal_id_idx 
  on public.seller_withdrawal_transactions(withdrawal_id);

-- RLS
alter table public.seller_withdrawal_transactions enable row level security;

-- Service role can do everything
grant all on public.seller_withdrawal_transactions to service_role;

-- Add payout_balance_rwf column to vendors table if it doesn't exist
alter table if exists public.vendors add column if not exists payout_balance_rwf integer not null default 0;

grant all on all sequences in schema public to service_role;

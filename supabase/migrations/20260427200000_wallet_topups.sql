-- Create wallet_topups table for idempotent top-up tracking
create table if not exists public.wallet_topups (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_rwf integer not null check (amount_rwf > 0),
  flw_transaction_id text,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

-- Unique constraint: one credit per FLW transaction
create unique index if not exists wallet_topups_flw_tx_id_key
  on public.wallet_topups (flw_transaction_id)
  where flw_transaction_id is not null;

-- RLS
alter table public.wallet_topups enable row level security;

-- Users can insert their own pending topups
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='wallet_topups' and policyname='wallet_topups_insert_own'
  ) then
    create policy wallet_topups_insert_own on public.wallet_topups
      for insert with check (auth.uid() = user_id);
  end if;
end $$;

-- Users can select their own topups
do $$ begin
  if not exists (
    select 1 from pg_policies where tablename='wallet_topups' and policyname='wallet_topups_select_own'
  ) then
    create policy wallet_topups_select_own on public.wallet_topups
      for select using (auth.uid() = user_id);
  end if;
end $$;

-- Service role can do everything (edge functions use service_role)
grant all on public.wallet_topups to service_role;

-- ── RPC: increment_wallet_balance ────────────────────────────────────────────
-- Atomically credit p_amount to a user's wallet_balance_rwf.
-- Callable by service_role only (invoked from wallet-topup-verify edge function).
create or replace function public.increment_wallet_balance(
  p_user_id uuid,
  p_amount   integer
)
returns void
language sql
security definer
set search_path = public
as $$
  update profiles
  set wallet_balance_rwf = wallet_balance_rwf + p_amount,
      updated_at = now()
  where id = p_user_id;
$$;

-- Only service_role can call this (edge functions run as service_role)
revoke execute on function public.increment_wallet_balance(uuid, integer) from public, authenticated, anon;
grant  execute on function public.increment_wallet_balance(uuid, integer) to service_role;

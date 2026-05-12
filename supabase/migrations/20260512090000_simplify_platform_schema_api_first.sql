-- Simplify schema for API-first commerce.
-- Removes duplicate transaction tables and drops database functions used by legacy flows.

begin;

-- 1) Drop legacy database functions (API-only architecture).
drop function if exists public.handle_new_user() cascade;
drop function if exists public.compute_order_totals(jsonb, text, text) cascade;
drop function if exists public.decrement_stock(text, integer) cascade;
drop function if exists public.increment_wallet_balance(uuid, integer, text, text) cascade;
drop function if exists public.lock_bid(text, uuid, integer) cascade;
drop function if exists public.purchase_live_stream_product(text, text, text, text, text, integer, uuid, text) cascade;
drop function if exists public.settle_auction(text) cascade;

-- 2) Keep core commerce tables, normalize wallet into one table: transactions.
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('deposit', 'withdrawal', 'purchase', 'sale', 'refund', 'payment')),
  amount_rwf integer not null check (amount_rwf > 0),
  balance_after_rwf integer not null default 0,
  status text not null default 'pending' check (status in ('pending', 'completed', 'failed', 'cancelled')),
  reference text,
  provider text,
  phone text,
  metadata jsonb not null default '{}'::jsonb,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reference)
);

create index if not exists transactions_user_id_idx on public.transactions(user_id);
create index if not exists transactions_reference_idx on public.transactions(reference);
create index if not exists transactions_type_idx on public.transactions(type);
create index if not exists transactions_status_idx on public.transactions(status);

alter table public.transactions enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where schemaname='public' and tablename='transactions' and policyname='transactions_select_own'
  ) then
    create policy transactions_select_own on public.transactions
      for select using (auth.uid() = user_id);
  end if;
end $$;

grant all on public.transactions to service_role;

-- 3) Ensure profile wallet columns are present.
alter table if exists public.profiles
  add column if not exists wallet_balance_rwf integer not null default 0;

alter table if exists public.profiles
  add column if not exists locked_balance_rwf integer not null default 0;

-- 4) Migrate wallet transactions if legacy table exists.
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'wallet_transactions'
  ) then
    insert into public.transactions (
      user_id,
      type,
      amount_rwf,
      balance_after_rwf,
      status,
      reference,
      provider,
      phone,
      metadata,
      description,
      created_at,
      updated_at
    )
    select
      wt.user_id,
      case
        when wt.type in ('deposit', 'withdrawal', 'purchase', 'sale', 'refund', 'payment') then wt.type
        else 'payment'
      end,
      coalesce(wt.amount_rwf, 0),
      coalesce(wt.new_balance_rwf, coalesce(wt.previous_balance_rwf, 0)),
      coalesce(wt.status, 'pending'),
      wt.external_transaction_id,
      coalesce(wt.provider, wt.payment_method),
      wt.phone_number,
      coalesce(wt.metadata, '{}'::jsonb),
      wt.description,
      coalesce(wt.created_at, now()),
      coalesce(wt.created_at, now())
    from public.wallet_transactions wt
    where coalesce(wt.amount_rwf, 0) > 0
      and wt.user_id is not null
      and not exists (
        select 1 from public.transactions t where t.reference = wt.external_transaction_id
      );

    drop table public.wallet_transactions;
  end if;
end $$;

-- 5) Remove duplicate payout tables after migration.
drop table if exists public.seller_withdrawal_transactions;
drop table if exists public.seller_withdrawals;

-- 6) Remove non-core feature tables to keep schema minimal.
drop table if exists public.live_comments;
drop table if exists public.bids;

commit;

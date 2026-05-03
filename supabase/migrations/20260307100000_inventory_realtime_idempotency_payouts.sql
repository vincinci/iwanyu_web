-- ============================================================
-- 1. Inventory quantity tracking
-- ============================================================

-- Add quantity column to products (NULL = unlimited stock)
alter table public.products
  add column if not exists stock_quantity integer;

comment on column public.products.stock_quantity
  is 'Available units. NULL means unlimited / not tracked. 0 means out of stock.';

-- Function to atomically decrement stock on order placement.
-- Called from the create-order edge function within a service-role context.
create or replace function public.decrement_stock(p_product_id text, p_qty integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_remaining integer;
begin
  update public.products
  set stock_quantity = stock_quantity - p_qty,
      in_stock = (stock_quantity - p_qty) > 0,
      updated_at = now()
  where id = p_product_id
    and stock_quantity is not null
    and stock_quantity >= p_qty
  returning stock_quantity into v_remaining;

  if not found then
    -- Check if it's unlimited stock (stock_quantity IS NULL)
    select stock_quantity into v_remaining
    from public.products
    where id = p_product_id;

    if v_remaining is null then
      -- Unlimited stock – nothing to decrement
      return -1;
    end if;

    raise exception 'Insufficient stock for product %', p_product_id;
  end if;

  return v_remaining;
end;
$$;

revoke all on function public.decrement_stock(text, integer) from public;
grant execute on function public.decrement_stock(text, integer) to service_role;

-- Function to restore stock when an order is cancelled
create or replace function public.restore_stock(p_product_id text, p_qty integer)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.products
  set stock_quantity = stock_quantity + p_qty,
      in_stock = true,
      updated_at = now()
  where id = p_product_id
    and stock_quantity is not null;
end;
$$;

revoke all on function public.restore_stock(text, integer) from public;
grant execute on function public.restore_stock(text, integer) to service_role;

-- ============================================================
-- 2. Payment idempotency – prevent double-verification
-- ============================================================

alter table public.orders
  add column if not exists payment_verified_at timestamptz;

comment on column public.orders.payment_verified_at
  is 'Set once when payment is verified. Used as an idempotency guard.';

-- ============================================================
-- 3. Payout disbursement tracking
-- ============================================================

create table if not exists public.vendor_payouts (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references public.vendors(id) on delete restrict,
  order_id uuid not null references public.orders(id) on delete restrict,
  amount_rwf integer not null check (amount_rwf > 0),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'failed')),
  provider text,               -- e.g. 'pawapay_transfer', 'wave', 'manual'
  provider_reference text,     -- external transfer ID
  initiated_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(vendor_id, order_id)
);

alter table public.vendor_payouts enable row level security;

-- Sellers can view their own payouts
create policy "vendor_payouts_select_own" on public.vendor_payouts
for select using (
  exists (
    select 1 from public.vendors v
    where v.id = vendor_id
      and v.owner_user_id = auth.uid()
  )
);

-- Admins can manage all payouts
create policy "vendor_payouts_admin_all" on public.vendor_payouts
for all using (public.is_admin());

-- Index for faster lookups
create index if not exists idx_vendor_payouts_vendor on public.vendor_payouts(vendor_id);
create index if not exists idx_vendor_payouts_order on public.vendor_payouts(order_id);
create index if not exists idx_vendor_payouts_status on public.vendor_payouts(status);

-- ============================================================
-- 4. Transactional email log
-- ============================================================

create table if not exists public.email_log (
  id uuid primary key default gen_random_uuid(),
  recipient text not null,
  subject text not null,
  template text not null,          -- e.g. 'order_confirmation', 'order_shipped'
  payload jsonb,                   -- template variables
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'failed')),
  provider_id text,                -- external message ID from Resend
  error text,
  created_at timestamptz not null default now()
);

alter table public.email_log enable row level security;

create policy "email_log_admin_only" on public.email_log
for all using (public.is_admin());

-- ============================================================
-- 5. Enable Supabase Realtime on key tables
-- ============================================================

-- Enable realtime publications for order status updates, chat, and payouts.
-- Use guards so reruns do not fail when a table is already in the publication.
do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'order_items'
  ) then
    alter publication supabase_realtime add table public.order_items;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'support_chats'
  ) then
    alter publication supabase_realtime add table public.support_chats;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_publication p on p.oid = pr.prpubid
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'vendor_payouts'
  ) then
    alter publication supabase_realtime add table public.vendor_payouts;
  end if;
end
$$;

-- ============================================================
-- 6. Server-side order total calculation helper
-- ============================================================

-- RPC to compute and validate order totals server-side.
-- Returns the authoritative subtotal, service fee, vendor payout, and total.
create or replace function public.compute_order_totals(
  p_items jsonb, -- [{productId, quantity}]
  p_discount_code text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item jsonb;
  v_product record;
  v_subtotal integer := 0;
  v_discount_rwf integer := 0;
  v_effective_subtotal integer;
  v_service_fee integer;
  v_total integer;
  v_vendor_payout integer;
  v_discount record;
  v_line_items jsonb := '[]'::jsonb;
begin
  -- 1. Calculate subtotal from DB prices (not client-supplied)
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id, price_rwf, vendor_id, title, image_url, in_stock, stock_quantity
    into v_product
    from public.products
    where id = (v_item->>'productId')
      and deleted_at is null;

    if not found then
      raise exception 'Product % not found', (v_item->>'productId');
    end if;

    if not v_product.in_stock then
      raise exception 'Product % is out of stock', v_product.title;
    end if;

    if v_product.stock_quantity is not null
       and v_product.stock_quantity < (v_item->>'quantity')::int then
      raise exception 'Insufficient stock for %. Available: %, Requested: %',
        v_product.title, v_product.stock_quantity, (v_item->>'quantity')::int;
    end if;

    v_subtotal := v_subtotal + (v_product.price_rwf * (v_item->>'quantity')::int);

    v_line_items := v_line_items || jsonb_build_object(
      'productId', v_product.id,
      'vendorId', v_product.vendor_id,
      'title', v_product.title,
      'price_rwf', v_product.price_rwf,
      'quantity', (v_item->>'quantity')::int,
      'image_url', v_product.image_url
    );
  end loop;

  -- 2. Apply discount code if provided
  if p_discount_code is not null and p_discount_code <> '' then
    select * into v_discount
    from public.discount_codes
    where upper(code) = upper(p_discount_code)
      and active = true
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now())
      and (max_redemptions is null or redeemed_count < max_redemptions);

    if found then
      if v_subtotal >= coalesce(v_discount.min_subtotal_rwf, 0) then
        if v_discount.discount_type = 'fixed' then
          v_discount_rwf := least(v_subtotal, coalesce(v_discount.amount_rwf, 0));
        else
          v_discount_rwf := least(v_subtotal,
            round((v_subtotal * coalesce(v_discount.percentage, 0))::numeric / 100)::int);
        end if;
      end if;
    end if;
  end if;

  -- 3. Compute totals using same fee structure as lib/fees.ts
  v_effective_subtotal := greatest(0, v_subtotal - v_discount_rwf);
  v_service_fee := round(v_effective_subtotal * 0.03);      -- 3% guest service fee
  v_total := v_effective_subtotal + v_service_fee;
  v_vendor_payout := round(v_effective_subtotal * 0.93);     -- vendor gets 93% (7% host fee)

  return jsonb_build_object(
    'subtotal', v_subtotal,
    'discount_rwf', v_discount_rwf,
    'effective_subtotal', v_effective_subtotal,
    'service_fee', v_service_fee,
    'total', v_total,
    'vendor_payout', v_vendor_payout,
    'line_items', v_line_items
  );
end;
$$;

-- Anyone authenticated can call compute (read-only calculation)
grant execute on function public.compute_order_totals(jsonb, text) to authenticated;

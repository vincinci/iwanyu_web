-- Vendor payout settings: bank + mobile money with 14-day edit lock

create table if not exists public.vendor_payout_settings (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references public.vendors(id) on delete cascade,

  -- Bank account
  bank_name text,
  bank_account_number text,
  bank_account_holder text,
  bank_set_at timestamptz,

  -- Mobile money
  mobile_provider text,  -- e.g. "MTN", "Airtel"
  mobile_number text,
  mobile_account_name text,
  mobile_set_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (vendor_id)
);

create index if not exists idx_vendor_payout_settings_vendor
  on public.vendor_payout_settings(vendor_id);

alter table public.vendor_payout_settings enable row level security;

-- Sellers can read their own payout settings
create policy "payout_settings_select_own" on public.vendor_payout_settings
for select using (
  exists (
    select 1 from public.vendors v
    where v.id = vendor_id and v.owner_user_id = auth.uid()
  )
);

-- Sellers can insert their own payout settings
create policy "payout_settings_insert_own" on public.vendor_payout_settings
for insert with check (
  exists (
    select 1 from public.vendors v
    where v.id = vendor_id and v.owner_user_id = auth.uid()
  )
);

-- Sellers can update their own payout settings
create policy "payout_settings_update_own" on public.vendor_payout_settings
for update using (
  exists (
    select 1 from public.vendors v
    where v.id = vendor_id and v.owner_user_id = auth.uid()
  )
);

-- Admins can manage all
create policy "payout_settings_admin_all" on public.vendor_payout_settings
for all using (public.is_admin());

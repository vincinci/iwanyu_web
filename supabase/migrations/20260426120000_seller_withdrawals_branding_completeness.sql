-- Seller withdrawals, branding assets, and storefront completeness fields

-- 1) Add branding + profile completeness fields to vendors
alter table public.vendors
  add column if not exists logo_url text,
  add column if not exists logo_path text,
  add column if not exists banner_url text,
  add column if not exists banner_path text,
  add column if not exists description text,
  add column if not exists profile_completed boolean not null default false;

-- 2) Seller withdrawal requests table (request -> admin review -> completion)
create table if not exists public.vendor_withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  vendor_id text not null references public.vendors(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete cascade,
  amount_rwf integer not null check (amount_rwf > 0),
  payout_method text not null default 'bank_transfer',
  payout_destination text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'processing', 'paid', 'rejected')),
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  admin_note text,
  provider_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vendor_withdrawal_requests_vendor
  on public.vendor_withdrawal_requests(vendor_id, created_at desc);

create index if not exists idx_vendor_withdrawal_requests_status
  on public.vendor_withdrawal_requests(status, created_at desc);

alter table public.vendor_withdrawal_requests enable row level security;

-- Sellers can read and create only for their own vendor
create policy "vendor_withdrawal_requests_select_own" on public.vendor_withdrawal_requests
for select using (
  exists (
    select 1
    from public.vendors v
    where v.id = vendor_id
      and v.owner_user_id = auth.uid()
  )
);

create policy "vendor_withdrawal_requests_insert_own" on public.vendor_withdrawal_requests
for insert with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.vendors v
    where v.id = vendor_id
      and v.owner_user_id = auth.uid()
  )
);

-- Admins can fully manage requests
create policy "vendor_withdrawal_requests_admin_all" on public.vendor_withdrawal_requests
for all using (public.is_admin());

-- 3) Storage bucket + policies for seller branding
insert into storage.buckets (id, name, public)
values ('vendor-branding', 'vendor-branding', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Seller upload own branding" on storage.objects;
create policy "Seller upload own branding"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'vendor-branding'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Seller update own branding" on storage.objects;
create policy "Seller update own branding"
on storage.objects for update
to authenticated
using (
  bucket_id = 'vendor-branding'
  and split_part(name, '/', 1) = auth.uid()::text
)
with check (
  bucket_id = 'vendor-branding'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Seller delete own branding" on storage.objects;
create policy "Seller delete own branding"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'vendor-branding'
  and split_part(name, '/', 1) = auth.uid()::text
);

drop policy if exists "Public read branding" on storage.objects;
create policy "Public read branding"
on storage.objects for select
to public
using (bucket_id = 'vendor-branding');

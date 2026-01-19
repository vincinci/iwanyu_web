-- Add vendor applications table + minimal admin helpers/policies

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

create table if not exists public.vendor_applications (
  id text primary key,
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  store_name text not null,
  location text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  vendor_id text references public.vendors(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists vendor_applications_owner_user_id_idx on public.vendor_applications(owner_user_id);
create index if not exists vendor_applications_status_idx on public.vendor_applications(status);

alter table public.vendor_applications enable row level security;

-- Owners can read their own applications
create policy "vendor_applications_select_own" on public.vendor_applications
for select using (auth.uid() = owner_user_id);

-- Admin can read all applications
create policy "vendor_applications_select_admin" on public.vendor_applications
for select using (public.is_admin());

-- Owners can submit applications for themselves
create policy "vendor_applications_insert_own" on public.vendor_applications
for insert with check (auth.uid() = owner_user_id);

-- Admin can update application status/vendor assignment
create policy "vendor_applications_update_admin" on public.vendor_applications
for update using (public.is_admin());

-- Allow admin to create/update vendors (required to approve applications via client-side admin UI)
create policy "vendors_insert_admin" on public.vendors
for insert with check (public.is_admin());

create policy "vendors_update_admin" on public.vendors
for update using (public.is_admin());

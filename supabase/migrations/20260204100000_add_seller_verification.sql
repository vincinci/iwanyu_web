-- Add seller verification fields to vendor_applications and vendors

-- Add verification columns to vendor_applications
alter table public.vendor_applications 
add column if not exists selfie_url text,
add column if not exists id_front_url text,
add column if not exists id_back_url text,
add column if not exists phone text,
add column if not exists email text;

-- Add verification columns to vendors
alter table public.vendors
add column if not exists selfie_url text,
add column if not exists id_front_url text,
add column if not exists id_back_url text,
add column if not exists phone text,
add column if not exists email text,
add column if not exists verification_status text default 'pending' check (verification_status in ('pending','verified','rejected'));

-- Allow users to insert their own vendors (for instant store creation)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'vendors_insert_own' and tablename = 'vendors'
  ) then
    create policy "vendors_insert_own" on public.vendors
    for insert with check (auth.uid() = owner_user_id);
  end if;
end $$;

-- Allow users to update their own vendors
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'vendors_update_own' and tablename = 'vendors'
  ) then
    create policy "vendors_update_own" on public.vendors
    for update using (auth.uid() = owner_user_id);
  end if;
end $$;

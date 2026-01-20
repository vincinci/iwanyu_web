-- Allow vendor owners (and admins) to manage products + product media

create or replace function public.can_manage_vendor(vendor_id text)
returns boolean
language sql
stable
as $$
  select public.is_admin()
     or exists (
          select 1
          from public.vendors v
          where v.id = vendor_id
            and v.owner_user_id = auth.uid()
        );
$$;

-- Products write policies
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'products_insert_owner_or_admin'
  ) then
    execute 'create policy "products_insert_owner_or_admin" on public.products for insert with check (public.can_manage_vendor(vendor_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'products_update_owner_or_admin'
  ) then
    execute 'create policy "products_update_owner_or_admin" on public.products for update using (public.can_manage_vendor(vendor_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'products' and policyname = 'products_delete_owner_or_admin'
  ) then
    execute 'create policy "products_delete_owner_or_admin" on public.products for delete using (public.can_manage_vendor(vendor_id))';
  end if;
end $$;

-- Product media policies (table may already exist; just ensure RLS and policies)
create table if not exists public.product_media (
  id bigserial primary key,
  product_id text not null references public.products(id) on delete cascade,
  vendor_id text not null references public.vendors(id) on delete cascade,
  kind text not null check (kind in ('image','video')),
  url text not null,
  public_id text,
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists product_media_product_id_idx on public.product_media(product_id);
create index if not exists product_media_vendor_id_idx on public.product_media(vendor_id);

alter table public.product_media enable row level security;

do $$
begin
  if to_regclass('public.product_media') is null then
    return;
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_media' and policyname = 'product_media_select_all'
  ) then
    execute 'create policy "product_media_select_all" on public.product_media for select using (true)';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_media' and policyname = 'product_media_insert_owner_or_admin'
  ) then
    execute 'create policy "product_media_insert_owner_or_admin" on public.product_media for insert with check (public.can_manage_vendor(vendor_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_media' and policyname = 'product_media_update_owner_or_admin'
  ) then
    execute 'create policy "product_media_update_owner_or_admin" on public.product_media for update using (public.can_manage_vendor(vendor_id))';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_media' and policyname = 'product_media_delete_owner_or_admin'
  ) then
    execute 'create policy "product_media_delete_owner_or_admin" on public.product_media for delete using (public.can_manage_vendor(vendor_id))';
  end if;
end $$;

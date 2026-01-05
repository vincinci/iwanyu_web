-- Add categories table only (other tables already exist)
create table if not exists public.categories (
  id text primary key,
  name text not null unique,
  slug text not null unique,
  description text,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Insert default categories from the UI
insert into public.categories (id, name, slug, description) values
  ('cat_electronics', 'Electronics', 'electronics', 'Electronic devices and gadgets'),
  ('cat_fashion', 'Fashion', 'fashion', 'Clothing, shoes, and accessories'),
  ('cat_home', 'Home & Garden', 'home-garden', 'Home decor and garden supplies'),
  ('cat_beauty', 'Beauty', 'beauty', 'Cosmetics and personal care'),
  ('cat_sports', 'Sports', 'sports', 'Sports equipment and activewear'),
  ('cat_jewelry', 'Jewelry', 'jewelry', 'Jewelry and accessories'),
  ('cat_shoes', 'Shoes', 'shoes', 'Footwear for all occasions')
on conflict (id) do nothing;

-- Enable RLS
alter table public.categories enable row level security;

-- Categories are public (everyone can read)
drop policy if exists "categories_select_all" on public.categories;
create policy "categories_select_all" on public.categories
for select using (true);

-- Only admins can modify categories  
drop policy if exists "categories_insert_admin" on public.categories;
create policy "categories_insert_admin" on public.categories
for insert with check (public.is_admin(auth.uid()));

drop policy if exists "categories_update_admin" on public.categories;
create policy "categories_update_admin" on public.categories
for update using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

drop policy if exists "categories_delete_admin" on public.categories;
create policy "categories_delete_admin" on public.categories
for delete using (public.is_admin(auth.uid()));

-- Add status column to vendors table if missing
do $$
begin
  if not exists (
    select 1 from information_schema.columns 
    where table_schema = 'public' 
    and table_name = 'vendors' 
    and column_name = 'status'
  ) then
    alter table public.vendors add column status text not null default 'approved' check (status in ('pending', 'approved', 'revoked'));
    create index idx_vendors_status on public.vendors(status);
  end if;
end $$;

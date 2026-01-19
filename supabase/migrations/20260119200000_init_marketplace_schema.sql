-- Marketplace schema for Supabase

-- Vendors table
create table if not exists public.vendors (
    id text primary key,
    name text not null,
    location text,
    verified boolean not null default false,
    owner_user_id uuid references auth.users(id) on delete cascade,
    status text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Products table
create table if not exists public.products (
    id text primary key,
    vendor_id text not null references public.vendors(id) on delete cascade,
    title text not null,
    description text,
    category text,
    price_rwf integer not null check (price_rwf >= 0),
    image_url text,
    image_public_id text,
    in_stock boolean not null default true,
    free_shipping boolean not null default false,
    rating real not null default 0,
    review_count integer not null default 0,
    discount_percentage integer default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Profiles table
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text,
    full_name text,
    avatar_url text,
    role text not null default 'buyer' check (role in ('buyer','seller','admin')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Orders table
create table if not exists public.orders (
    id uuid primary key default gen_random_uuid(),
    buyer_user_id uuid not null references auth.users(id) on delete restrict,
    buyer_email text,
    shipping_address text not null,
    status text not null default 'Placed' check (status in ('Placed','Processing','Shipped','Delivered','Cancelled')),
    total_rwf integer not null check (total_rwf >= 0),
    payment jsonb not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Order items table
create table if not exists public.order_items (
    order_id uuid not null references public.orders(id) on delete cascade,
    product_id text not null references public.products(id) on delete restrict,
    vendor_id text not null references public.vendors(id) on delete restrict,
    title text not null,
    price_rwf integer not null check (price_rwf >= 0),
    quantity integer not null check (quantity > 0),
    image_url text,
    status text not null default 'Placed' check (status in ('Placed','Processing','Shipped','Delivered','Cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    primary key (order_id, product_id)
);

-- Trigger function for new user profiles
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
    insert into public.profiles (id, email, full_name, avatar_url)
    values (
        new.id,
        new.email,
        coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
        coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
    )
    on conflict (id) do update
        set email = excluded.email,
            full_name = excluded.full_name,
            avatar_url = excluded.avatar_url,
            updated_at = now();
    return new;
end;
$$;

-- Trigger for new users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- RLS Policies
-- Profiles: Anyone can read, users can update their own
create policy "profiles_select_all" on public.profiles
for select using (true);

create policy "profiles_update_own" on public.profiles
for update using (auth.uid() = id);

-- Vendors: Anyone can read
create policy "vendors_select_all" on public.vendors
for select using (true);

-- Products: Anyone can read
create policy "products_select_all" on public.products
for select using (true);

-- Orders: Users can read their own orders
create policy "orders_select_own" on public.orders
for select using (auth.uid() = buyer_user_id);

create policy "orders_insert_own" on public.orders
for insert with check (auth.uid() = buyer_user_id);

-- Order items: Users can read items from their orders
create policy "order_items_select_own" on public.order_items
for select using (
    exists (
        select 1 from public.orders o 
        where o.id = order_id and o.buyer_user_id = auth.uid()
    )
);

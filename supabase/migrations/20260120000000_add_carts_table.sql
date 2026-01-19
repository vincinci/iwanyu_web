-- Add carts table for persisted shopping carts

create table if not exists public.carts (
  buyer_user_id uuid primary key references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.carts enable row level security;

create policy "carts_select_own" on public.carts
for select using (auth.uid() = buyer_user_id);

create policy "carts_insert_own" on public.carts
for insert with check (auth.uid() = buyer_user_id);

create policy "carts_update_own" on public.carts
for update using (auth.uid() = buyer_user_id);

create policy "carts_delete_own" on public.carts
for delete using (auth.uid() = buyer_user_id);

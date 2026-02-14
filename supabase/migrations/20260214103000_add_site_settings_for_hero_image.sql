-- Site-level key/value settings for storefront UI controls

create table if not exists public.site_settings (
  key text primary key,
  value_text text,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;

-- Public storefront can read settings
create policy "site_settings_select_public" on public.site_settings
for select
using (true);

-- Admin-only writes
create policy "site_settings_insert_admin" on public.site_settings
for insert
with check (public.is_admin());

create policy "site_settings_update_admin" on public.site_settings
for update
using (public.is_admin());

create policy "site_settings_delete_admin" on public.site_settings
for delete
using (public.is_admin());

insert into public.site_settings (key, value_text)
values (
  'hero_image_url',
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1600&auto=format&fit=crop'
)
on conflict (key) do nothing;

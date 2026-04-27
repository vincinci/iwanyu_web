-- Add shop_name column to vendors (mirrors the `name` field, required by live DB)
alter table public.vendors
  add column if not exists shop_name text;

-- Back-fill existing rows
update public.vendors set shop_name = name where shop_name is null;

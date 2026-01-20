-- Add lightweight product variants support (colors/sizes as JSON)

alter table if exists public.products
add column if not exists variants jsonb;

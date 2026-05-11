-- Add value_json column to site_settings table for storing complex data structures like arrays

alter table public.site_settings
add column if not exists value_json jsonb;

comment on column public.site_settings.value_json is 'JSON data for complex settings like arrays of media items';

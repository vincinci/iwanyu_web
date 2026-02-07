-- Soft-delete + discount codes

-- Add soft-delete columns
alter table public.vendors
	add column if not exists deleted_at timestamptz;

alter table public.products
	add column if not exists deleted_at timestamptz;

-- Replace "select all" policies so deleted rows are hidden for non-admin users.
-- Note: RLS select policies are OR'ed together, so we must drop the existing permissive policy.
drop policy if exists "vendors_select_all" on public.vendors;
create policy "vendors_select_public" on public.vendors
for select
using (
	deleted_at is null
	or public.is_admin()
);

drop policy if exists "products_select_all" on public.products;
create policy "products_select_public" on public.products
for select
using (
	deleted_at is null
	or public.is_admin()
);

-- Discount codes
create table if not exists public.discount_codes (
	id uuid primary key default gen_random_uuid(),
	code text not null,
	description text,
	discount_type text not null check (discount_type in ('percentage', 'fixed')),
	amount_rwf integer check (amount_rwf >= 0),
	percentage integer check (percentage between 1 and 100),
	active boolean not null default true,
	starts_at timestamptz,
	ends_at timestamptz,
	min_subtotal_rwf integer not null default 0 check (min_subtotal_rwf >= 0),
	max_redemptions integer check (max_redemptions is null or max_redemptions >= 0),
	redeemed_count integer not null default 0 check (redeemed_count >= 0),
	created_by uuid,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	constraint discount_codes_type_amount_check check (
		(discount_type = 'fixed' and amount_rwf is not null and percentage is null)
		or
		(discount_type = 'percentage' and percentage is not null and amount_rwf is null)
	)
);

create unique index if not exists discount_codes_code_upper_uq
	on public.discount_codes (upper(code));

alter table public.discount_codes enable row level security;

-- RLS: public can read only active, in-window, under-max codes; admins can read all.
drop policy if exists "discount_codes_select_public" on public.discount_codes;
create policy "discount_codes_select_public" on public.discount_codes
for select
using (
	public.is_admin()
	or (
		active = true
		and (starts_at is null or starts_at <= now())
		and (ends_at is null or ends_at > now())
		and (max_redemptions is null or redeemed_count < max_redemptions)
	)
);

drop policy if exists "discount_codes_insert_admin" on public.discount_codes;
create policy "discount_codes_insert_admin" on public.discount_codes
for insert
with check (public.is_admin());

drop policy if exists "discount_codes_update_admin" on public.discount_codes;
create policy "discount_codes_update_admin" on public.discount_codes
for update
using (public.is_admin());

drop policy if exists "discount_codes_delete_admin" on public.discount_codes;
create policy "discount_codes_delete_admin" on public.discount_codes
for delete
using (public.is_admin());

-- Store applied discount on orders
alter table public.orders
	add column if not exists discount_code text;

alter table public.orders
	add column if not exists discount_rwf integer not null default 0 check (discount_rwf >= 0);

-- Atomic increment helper (used by payment verification)
create or replace function public.increment_discount_redemption(p_code text)
returns void
language sql
security definer
set search_path = public
as $$
	update public.discount_codes
	set redeemed_count = redeemed_count + 1,
			updated_at = now()
	where upper(code) = upper(p_code)
		and (max_redemptions is null or redeemed_count < max_redemptions);
$$;

revoke all on function public.increment_discount_redemption(text) from public;
grant execute on function public.increment_discount_redemption(text) to service_role;

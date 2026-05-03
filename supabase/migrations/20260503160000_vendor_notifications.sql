create extension if not exists pgcrypto;

create table if not exists public.vendor_notifications (
	id uuid primary key default gen_random_uuid(),
	vendor_id text not null references public.vendors(id) on delete cascade,
	product_id uuid references public.products(id) on delete set null,
	type text not null default 'system',
	title text not null,
	message text not null default '',
	created_by uuid references auth.users(id) on delete set null,
	read_at timestamptz,
	created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists vendor_notifications_vendor_created_idx
	on public.vendor_notifications (vendor_id, created_at desc);

create index if not exists vendor_notifications_vendor_read_idx
	on public.vendor_notifications (vendor_id, read_at desc nulls last);

alter table public.vendor_notifications enable row level security;

drop policy if exists "Vendors can read their notifications" on public.vendor_notifications;
create policy "Vendors can read their notifications"
on public.vendor_notifications for select
to authenticated
using (
	exists (
		select 1
		from public.vendors v
		where v.id = vendor_id
		and v.owner_user_id = auth.uid()
	)
	or public.is_admin_user(auth.uid())
);

drop policy if exists "Vendors can mark their notifications read" on public.vendor_notifications;
create policy "Vendors can mark their notifications read"
on public.vendor_notifications for update
to authenticated
using (
	exists (
		select 1
		from public.vendors v
		where v.id = vendor_id
		and v.owner_user_id = auth.uid()
	)
	or public.is_admin_user(auth.uid())
)
with check (
	exists (
		select 1
		from public.vendors v
		where v.id = vendor_id
		and v.owner_user_id = auth.uid()
	)
	or public.is_admin_user(auth.uid())
);

drop policy if exists "Admins can create vendor notifications" on public.vendor_notifications;
create policy "Admins can create vendor notifications"
on public.vendor_notifications for insert
to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "Admins can delete vendor notifications" on public.vendor_notifications;
create policy "Admins can delete vendor notifications"
on public.vendor_notifications for delete
to authenticated
using (public.is_admin_user(auth.uid()));

grant select, insert, update, delete on public.vendor_notifications to authenticated;
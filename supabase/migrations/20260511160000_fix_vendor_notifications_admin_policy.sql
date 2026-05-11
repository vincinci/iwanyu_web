-- Fix vendor_notifications policies to use correct is_admin() function
-- The function is is_admin() not is_admin_user(auth.uid())

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
	or public.is_admin()
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
	or public.is_admin()
)
with check (
	exists (
		select 1
		from public.vendors v
		where v.id = vendor_id
		and v.owner_user_id = auth.uid()
	)
	or public.is_admin()
);

drop policy if exists "Admins can create vendor notifications" on public.vendor_notifications;
create policy "Admins can create vendor notifications"
on public.vendor_notifications for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can delete vendor notifications" on public.vendor_notifications;
create policy "Admins can delete vendor notifications"
on public.vendor_notifications for delete
to authenticated
using (public.is_admin());

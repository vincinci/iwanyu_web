-- Allow admins to update any user profile (needed to promote users to seller/admin via admin dashboard)

create policy "profiles_update_admin" on public.profiles
for update using (public.is_admin());

-- Fix RLS recursion on public.profiles introduced by 2FA policies.
-- This resolves PostgREST 500 errors like:
-- "infinite recursion detected in policy for relation \"profiles\"".

begin;

-- Helper for admin checks without triggering recursive profile-policy evaluation.
create or replace function public.current_user_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

revoke all on function public.current_user_is_admin() from public;
grant execute on function public.current_user_is_admin() to authenticated, service_role;

-- Drop recursive policies from 2FA migration.
drop policy if exists "users_view_own_2fa_status" on public.profiles;
drop policy if exists "users_update_own_2fa_settings" on public.profiles;

-- Recreate as non-recursive policies.
create policy "users_view_own_2fa_status" on public.profiles
  for select
  using (
    auth.uid() = id
    or public.current_user_is_admin()
  );

create policy "users_update_own_2fa_settings" on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

commit;

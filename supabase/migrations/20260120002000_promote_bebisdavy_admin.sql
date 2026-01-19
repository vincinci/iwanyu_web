-- Promote a specific user to admin
-- NOTE: This runs once during migration and is safe to re-run.

do $$
declare
  target_email text := 'bebisdavy@gmail.com';
begin
  -- If profile already has the email populated
  update public.profiles p
  set role = 'admin', updated_at = now()
  where p.email is not null
    and lower(p.email) = lower(target_email);

  -- If profile email is missing/outdated, match via auth.users
  update public.profiles p
  set role = 'admin', updated_at = now()
  from auth.users u
  where p.id = u.id
    and u.email is not null
    and lower(u.email) = lower(target_email);

  if not exists (
    select 1
    from public.profiles p
    where p.role = 'admin'
      and p.email is not null
      and lower(p.email) = lower(target_email)
  ) then
    raise notice 'Admin promotion migration ran, but no matching profile email found for % (user may not exist yet).', target_email;
  end if;
end
$$;

-- Allow admins to update any vendor (required for seller settings save from admin accounts)
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'vendors_update_admin' and tablename = 'vendors'
  ) then
    create policy "vendors_update_admin" on public.vendors
    for update using (public.is_admin());
  end if;
end $$;

-- Allow admins to insert/upsert vendors too
do $$
begin
  if not exists (
    select 1 from pg_policies where policyname = 'vendors_insert_admin' and tablename = 'vendors'
  ) then
    create policy "vendors_insert_admin" on public.vendors
    for insert with check (public.is_admin());
  end if;
end $$;

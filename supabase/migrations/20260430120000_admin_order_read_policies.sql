-- Allow admins to read all order_items (needed for admin dashboard revenue/sales metrics)
create policy "order_items_select_admin"
  on public.order_items
  for select
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

-- Allow admins to read all orders (needed to cross-reference)
create policy "orders_select_admin"
  on public.orders
  for select
  using (
    exists (
      select 1
      from public.profiles
      where id = auth.uid()
        and role = 'admin'
    )
  );

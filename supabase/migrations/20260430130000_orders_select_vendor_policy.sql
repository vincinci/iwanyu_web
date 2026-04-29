-- Allow vendors to read orders that contain their items.
-- Without this, sellers cannot load order details (buyer email, total, order status)
-- because the existing policy only allows the buyer (buyer_user_id) to see their own orders.

create policy "orders_select_vendor"
  on public.orders
  for select
  using (
    exists (
      select 1
      from public.order_items oi
      join public.vendors v on v.id = oi.vendor_id
      where oi.order_id = orders.id
        and v.owner_user_id = auth.uid()
    )
  );

-- Also allow vendors to update the status of orders they have items in
-- (so sellers can mark an order as Shipped / Delivered at the order level too)
create policy "orders_update_vendor"
  on public.orders
  for update
  using (
    exists (
      select 1
      from public.order_items oi
      join public.vendors v on v.id = oi.vendor_id
      where oi.order_id = orders.id
        and v.owner_user_id = auth.uid()
    )
  );

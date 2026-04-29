-- Allow vendors to read order_items where they are the vendor.
-- Without this, SellerDashboard / SellerOrders queries return 0 rows
-- because the existing policy only allows the buyer to read their items.

create policy "order_items_select_vendor"
  on public.order_items
  for select
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.owner_user_id = auth.uid()
    )
  );

-- Also allow vendors to update their own order items (e.g. mark as shipped/fulfilled)
create policy "order_items_update_vendor"
  on public.order_items
  for update
  using (
    exists (
      select 1
      from public.vendors v
      where v.id = vendor_id
        and v.owner_user_id = auth.uid()
    )
  );

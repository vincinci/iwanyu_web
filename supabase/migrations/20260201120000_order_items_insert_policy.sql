-- Add INSERT policy for order_items
-- Users can insert items for orders they own

create policy "order_items_insert_own" on public.order_items
for insert with check (
    exists (
        select 1 from public.orders o 
        where o.id = order_id and o.buyer_user_id = auth.uid()
    )
);

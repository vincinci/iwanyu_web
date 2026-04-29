-- Fix RLS recursion between order_items and orders.
--
-- order_items_select_own reads from orders,
-- and orders_select_vendor reads from order_items.
-- That creates a circular policy evaluation path:
-- order_items -> orders -> order_items.
--
-- Remove vendor order policies to break recursion.

drop policy if exists "orders_select_vendor" on public.orders;
drop policy if exists "orders_update_vendor" on public.orders;

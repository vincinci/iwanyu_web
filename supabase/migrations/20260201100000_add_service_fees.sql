-- Add service fee columns to orders table
-- Guest service fee: 3% added to subtotal (customer pays)
-- Host fee: 7% deducted from subtotal (vendor receives 93%)

alter table public.orders 
  add column if not exists service_fee_rwf integer not null default 0 check (service_fee_rwf >= 0);

alter table public.orders 
  add column if not exists vendor_payout_rwf integer not null default 0 check (vendor_payout_rwf >= 0);

-- Add vendor_payout_rwf to order_items for per-item tracking
alter table public.order_items 
  add column if not exists vendor_payout_rwf integer not null default 0 check (vendor_payout_rwf >= 0);

comment on column public.orders.service_fee_rwf is 'Guest service fee (3% of subtotal)';
comment on column public.orders.vendor_payout_rwf is 'Total vendor payout (93% of subtotal after 7% host fee)';
comment on column public.order_items.vendor_payout_rwf is 'Vendor payout for this item (93% of line total after 7% host fee)';
